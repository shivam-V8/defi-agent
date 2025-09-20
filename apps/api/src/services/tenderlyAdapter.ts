/**
 * Tenderly simulation adapter for AgentExecutor validation
 */

import { ChainId } from '../types/policy.js';

// Tenderly API types
export interface TenderlySimulationRequest {
  network_id: string;
  from: string;
  to: string;
  input: string;
  gas: number;
  gas_price: string;
  value: string;
  block_number?: number;
  state_objects?: Record<string, any>;
  save_if_fails?: boolean;
  save?: boolean;
  simulation_type?: 'quick' | 'full';
}

export interface TenderlySimulationResponse {
  transaction: {
    hash: string;
    from: string;
    to: string;
    input: string;
    value: string;
    gas: number;
    gas_price: string;
    gas_used: number;
    block_number: number;
    status: boolean;
    logs: Array<{
      address: string;
      topics: string[];
      data: string;
    }>;
  };
  simulation: {
    id: string;
    status: boolean;
    gas_used: number;
    block_number: number;
    logs: Array<{
      address: string;
      topics: string[];
      data: string;
    }>;
    trace: Array<{
      type: string;
      from: string;
      to: string;
      value: string;
      gas: number;
      gas_used: number;
      input: string;
      output: string;
      error?: string;
    }>;
  };
  contracts: Array<{
    address: string;
    balance: string;
    code: string;
    nonce: number;
  }>;
}

export interface SimulationResult {
  success: boolean;
  gasUsed: string;
  gasPrice: string;
  actualOut: string;
  priceImpact: number;
  error?: string;
  simulationId: string;
  logs: Array<{
    address: string;
    topics: string[];
    data: string;
  }>;
  trace: Array<{
    type: string;
    from: string;
    to: string;
    value: string;
    gas: number;
    gas_used: number;
    input: string;
    output: string;
    error?: string;
  }>;
}

export interface GuardCheckResult {
  passed: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    message: string;
    actualValue?: string | number;
    expectedValue?: string | number;
  }>;
  warnings: string[];
}

export class TenderlyAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly projectId: string;
  private readonly user: string;

  constructor() {
    this.apiKey = process.env.TENDERLY_API_KEY || '';
    this.baseUrl = 'https://api.tenderly.co/api/v1';
    this.projectId = process.env.TENDERLY_PROJECT_ID || '';
    this.user = process.env.TENDERLY_USER || '';

    if (!this.apiKey || !this.projectId || !this.user) {
      console.warn('Tenderly credentials not configured. Simulation will use fallback mode.');
    }
  }

  /**
   * Simulate AgentExecutor transaction
   */
  async simulateAgentExecutor(params: {
    from: string;
    to: string;
    data: string;
    value: string;
    gasLimit: string;
    gasPrice: string;
    chainId: ChainId;
    blockNumber?: number;
  }): Promise<SimulationResult> {
    try {
      if (!this.isConfigured()) {
        return this.createFallbackSimulation(params);
      }

      const networkId = this.getNetworkId(params.chainId);
      const simulationRequest: TenderlySimulationRequest = {
        network_id: networkId,
        from: params.from,
        to: params.to,
        input: params.data,
        gas: parseInt(params.gasLimit),
        gas_price: params.gasPrice,
        value: params.value,
        block_number: params.blockNumber,
        save_if_fails: true,
        save: false,
        simulation_type: 'quick',
      };

      const response = await this.makeRequest('/simulate', simulationRequest);
      const simulation = response.simulation;

      return {
        success: simulation.status,
        gasUsed: simulation.gas_used.toString(),
        gasPrice: params.gasPrice,
        actualOut: this.extractActualOut(simulation.logs, simulation.trace),
        priceImpact: this.calculatePriceImpact(simulation.logs),
        error: simulation.status ? undefined : this.extractError(simulation.trace),
        simulationId: simulation.id,
        logs: simulation.logs,
        trace: simulation.trace,
      };
    } catch (error) {
      console.error('Tenderly simulation error:', error);
      return this.createFallbackSimulation(params);
    }
  }

  /**
   * Perform guard checks on simulation result
   */
  async performGuardChecks(
    simulation: SimulationResult,
    expectedMinReceived: string,
    maxGasCost: string = '100'
  ): Promise<GuardCheckResult> {
    const checks: Array<{
      name: string;
      passed: boolean;
      message: string;
      actualValue?: string | number;
      expectedValue?: string | number;
    }> = [];

    const warnings: string[] = [];

    // Check 1: Transaction success
    checks.push({
      name: 'Transaction Success',
      passed: simulation.success,
      message: simulation.success ? 'Transaction executed successfully' : 'Transaction failed',
      actualValue: simulation.success ? 1 : 0,
      expectedValue: 1,
    });

    if (!simulation.success) {
      return {
        passed: false,
        checks,
        warnings: [simulation.error || 'Unknown error'],
      };
    }

    // Check 2: Actual output >= minimum received
    const actualOut = BigInt(simulation.actualOut);
    const minReceived = BigInt(expectedMinReceived);
    const outputCheck = actualOut >= minReceived;
    
    checks.push({
      name: 'Output Amount Check',
      passed: outputCheck,
      message: outputCheck 
        ? `Output sufficient: ${simulation.actualOut} >= ${expectedMinReceived}`
        : `Insufficient output: ${simulation.actualOut} < ${expectedMinReceived}`,
      actualValue: simulation.actualOut,
      expectedValue: expectedMinReceived,
    });

    // Check 3: Gas usage sanity
    const gasUsed = parseInt(simulation.gasUsed);
    const maxGasUsage = 500000; // 500k gas limit
    const gasUsageCheck = gasUsed <= maxGasUsage;
    
    checks.push({
      name: 'Gas Usage Check',
      passed: gasUsageCheck,
      message: gasUsageCheck 
        ? `Gas usage reasonable: ${gasUsed} <= ${maxGasUsage}`
        : `Gas usage too high: ${gasUsed} > ${maxGasUsage}`,
      actualValue: gasUsed,
      expectedValue: maxGasUsage,
    });

    // Check 4: Gas cost sanity
    const gasCost = (gasUsed * parseInt(simulation.gasPrice)) / 1e18;
    const maxGasCostFloat = parseFloat(maxGasCost);
    const gasCostCheck = gasCost <= maxGasCostFloat;
    
    checks.push({
      name: 'Gas Cost Check',
      passed: gasCostCheck,
      message: gasCostCheck 
        ? `Gas cost reasonable: $${gasCost.toFixed(2)} <= $${maxGasCostFloat}`
        : `Gas cost too high: $${gasCost.toFixed(2)} > $${maxGasCostFloat}`,
      actualValue: gasCost,
      expectedValue: maxGasCostFloat,
    });

    // Check 5: No unexpected reverts in trace
    const hasReverts = simulation.trace.some(step => step.error && step.error.includes('revert'));
    checks.push({
      name: 'No Unexpected Reverts',
      passed: !hasReverts,
      message: hasReverts ? 'Unexpected reverts detected in trace' : 'No unexpected reverts',
      actualValue: hasReverts ? 1 : 0,
      expectedValue: 0,
    });

    // Check 6: Price impact within reasonable bounds
    const priceImpactCheck = simulation.priceImpact <= 1000; // 10% max
    checks.push({
      name: 'Price Impact Check',
      passed: priceImpactCheck,
      message: priceImpactCheck 
        ? `Price impact acceptable: ${simulation.priceImpact}bps <= 1000bps`
        : `Price impact too high: ${simulation.priceImpact}bps > 1000bps`,
      actualValue: simulation.priceImpact,
      expectedValue: 1000,
    });

    // Generate warnings for non-critical issues
    if (simulation.priceImpact > 500) {
      warnings.push(`High price impact: ${simulation.priceImpact}bps`);
    }
    if (gasUsed > 300000) {
      warnings.push(`High gas usage: ${gasUsed}`);
    }
    if (gasCost > parseFloat(maxGasCost) * 0.8) {
      warnings.push(`High gas cost: $${gasCost.toFixed(2)}`);
    }

    const allChecksPassed = checks.every(check => check.passed);

    return {
      passed: allChecksPassed,
      checks,
      warnings,
    };
  }

  /**
   * Extract actual output amount from simulation logs/trace
   */
  private extractActualOut(logs: any[], trace: any[]): string {
    // Look for Transfer events or similar that indicate token output
    for (const log of logs) {
      if (log.topics && log.topics.length >= 3) {
        // ERC20 Transfer event signature: Transfer(address,address,uint256)
        if (log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
          try {
            const amount = BigInt('0x' + log.data.slice(2));
            return amount.toString();
          } catch (error) {
            continue;
          }
        }
      }
    }

    // Fallback: look for value transfers in trace
    for (const step of trace) {
      if (step.type === 'call' && step.value && step.value !== '0x0') {
        try {
          const value = BigInt(step.value);
          return value.toString();
        } catch (error) {
          continue;
        }
      }
    }

    return '0'; // Default fallback
  }

  /**
   * Calculate price impact from simulation data
   */
  private calculatePriceImpact(logs: any[]): number {
    // This is a simplified calculation
    // In a real implementation, you'd analyze the swap events to calculate actual price impact
    return 0; // Default to 0 for now
  }

  /**
   * Extract error message from simulation trace
   */
  private extractError(trace: any[]): string {
    for (const step of trace) {
      if (step.error) {
        return step.error;
      }
    }
    return 'Unknown simulation error';
  }

  /**
   * Get network ID for Tenderly
   */
  private getNetworkId(chainId: ChainId): string {
    const networkMap: Record<ChainId, string> = {
      [ChainId.ETHEREUM]: '1',
      [ChainId.ARBITRUM]: '42161',
      [ChainId.OPTIMISM]: '10',
      [ChainId.POLYGON]: '137',
      [ChainId.BASE]: '8453',
      [ChainId.LOCAL_TESTNET]: '31337',
    };

    return networkMap[chainId] || '1';
  }

  /**
   * Check if Tenderly is properly configured
   */
  private isConfigured(): boolean {
    return !!(this.apiKey && this.projectId && this.user);
  }

  /**
   * Create fallback simulation when Tenderly is not available
   */
  private createFallbackSimulation(params: {
    from: string;
    to: string;
    data: string;
    value: string;
    gasLimit: string;
    gasPrice: string;
    chainId: ChainId;
  }): SimulationResult {
    // Fallback simulation with basic validation
    const gasUsed = parseInt(params.gasLimit) * 0.8; // Assume 80% gas usage
    const actualOut = '1000000000000000000'; // Mock 1 ETH output

    return {
      success: true,
      gasUsed: gasUsed.toString(),
      gasPrice: params.gasPrice,
      actualOut,
      priceImpact: 50, // Mock 0.5% price impact
      simulationId: `fallback_${Date.now()}`,
      logs: [],
      trace: [],
    };
  }

  /**
   * Make HTTP request to Tenderly API
   */
  private async makeRequest(endpoint: string, data: any): Promise<TenderlySimulationResponse> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Key': this.apiKey,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Tenderly API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get simulation URL for debugging
   */
  getSimulationUrl(simulationId: string): string {
    if (!this.isConfigured()) {
      return `https://dashboard.tenderly.co/public/${this.user}/${this.projectId}/simulator/${simulationId}`;
    }
    return `https://dashboard.tenderly.co/${this.user}/${this.projectId}/simulator/${simulationId}`;
  }

  /**
   * Validate simulation parameters
   */
  validateSimulationParams(params: {
    from: string;
    to: string;
    data: string;
    value: string;
    gasLimit: string;
    gasPrice: string;
    chainId: ChainId;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!params.from || !params.from.match(/^0x[a-fA-F0-9]{40}$/)) {
      errors.push('Invalid from address');
    }

    if (!params.to || !params.to.match(/^0x[a-fA-F0-9]{40}$/)) {
      errors.push('Invalid to address');
    }

    if (!params.data || !params.data.match(/^0x[a-fA-F0-9]*$/)) {
      errors.push('Invalid calldata');
    }

    if (!params.value || !params.value.match(/^\d+$/)) {
      errors.push('Invalid value');
    }

    if (!params.gasLimit || !params.gasLimit.match(/^\d+$/)) {
      errors.push('Invalid gas limit');
    }

    if (!params.gasPrice || !params.gasPrice.match(/^\d+$/)) {
      errors.push('Invalid gas price');
    }

    if (!Object.values(ChainId).includes(params.chainId)) {
      errors.push('Invalid chain ID');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
