/**
 * Simulation service for AgentExecutor validation
 */

import { TenderlyAdapter, SimulationResult, GuardCheckResult } from './tenderlyAdapter.js';
import { SimulationRequest, SimulationResponse } from '../schemas/quote.js';
import { ChainId } from '../types/policy.js';

export class SimulationService {
  private static instance: SimulationService;
  private tenderlyAdapter: TenderlyAdapter;

  constructor() {
    this.tenderlyAdapter = new TenderlyAdapter();
  }

  public static getInstance(): SimulationService {
    if (!SimulationService.instance) {
      SimulationService.instance = new SimulationService();
    }
    return SimulationService.instance;
  }

  /**
   * Simulate AgentExecutor transaction with guard checks
   */
  async simulateTransaction(request: SimulationRequest): Promise<SimulationResponse> {
    try {
      // Validate request parameters
      const validation = this.validateRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          error: `Invalid request: ${validation.errors.join(', ')}`,
        };
      }

      // Prepare simulation parameters
      const simulationParams = this.prepareSimulationParams(request);

      // Validate simulation parameters
      const paramValidation = this.tenderlyAdapter.validateSimulationParams(simulationParams);
      if (!paramValidation.valid) {
        return {
          success: false,
          error: `Invalid simulation parameters: ${paramValidation.errors.join(', ')}`,
        };
      }

      // Run simulation
      const simulation = await this.tenderlyAdapter.simulateAgentExecutor(simulationParams);

      // Perform guard checks
      const guardChecks = await this.tenderlyAdapter.performGuardChecks(
        simulation,
        request.minReceived,
        '100' // Max gas cost in USD
      );

      // Calculate price impact
      const priceImpact = this.calculatePriceImpact(
        request.amountIn,
        simulation.actualOut,
        request.expectedOut
      );

      // Determine overall success
      const success = simulation.success && guardChecks.passed;

      return {
        success,
        gasUsed: simulation.gasUsed,
        gasPrice: simulation.gasPrice,
        actualOut: simulation.actualOut,
        priceImpact,
        error: success ? undefined : this.generateErrorMessage(simulation, guardChecks),
        simulationId: simulation.simulationId,
        // Additional simulation details
        simulationDetails: {
          logs: simulation.logs,
          trace: simulation.trace,
          guardChecks: guardChecks.checks,
          warnings: guardChecks.warnings,
          simulationUrl: this.tenderlyAdapter.getSimulationUrl(simulation.simulationId),
        },
      };
    } catch (error) {
      console.error('Simulation service error:', error);
      return {
        success: false,
        error: `Simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Validate simulation request
   */
  private validateRequest(request: SimulationRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate addresses
    if (!request.tokenIn || !this.isValidAddress(request.tokenIn)) {
      errors.push('Invalid tokenIn address');
    }

    if (!request.tokenOut || !this.isValidAddress(request.tokenOut)) {
      errors.push('Invalid tokenOut address');
    }

    if (!request.userAddress || !this.isValidAddress(request.userAddress)) {
      errors.push('Invalid userAddress');
    }

    // Validate amounts
    if (!request.amountIn || !this.isValidAmount(request.amountIn)) {
      errors.push('Invalid amountIn');
    }

    if (!request.expectedOut || !this.isValidAmount(request.expectedOut)) {
      errors.push('Invalid expectedOut');
    }

    if (!request.minReceived || !this.isValidAmount(request.minReceived)) {
      errors.push('Invalid minReceived');
    }

    // Validate chain ID
    if (!Object.values(ChainId).includes(request.chainId as ChainId)) {
      errors.push('Invalid chainId');
    }

    // Validate router
    if (!request.router || !this.isValidAddress(request.router)) {
      errors.push('Invalid router address');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Prepare simulation parameters for Tenderly
   */
  private prepareSimulationParams(request: SimulationRequest): {
    from: string;
    to: string;
    data: string;
    value: string;
    gasLimit: string;
    gasPrice: string;
    chainId: ChainId;
  } {
    // This would typically involve encoding the AgentExecutor calldata
    // For now, we'll create a mock calldata structure
    const calldata = this.encodeAgentExecutorCalldata(request);

    return {
      from: request.userAddress,
      to: this.getAgentExecutorAddress(request.chainId as ChainId),
      data: calldata,
      value: '0', // AgentExecutor doesn't accept ETH directly
      gasLimit: '500000', // Conservative gas limit
      gasPrice: this.getGasPrice(request.chainId as ChainId),
      chainId: request.chainId as ChainId,
    };
  }

  /**
   * Encode AgentExecutor calldata
   * This is a simplified version - in reality, you'd use proper ABI encoding
   */
  private encodeAgentExecutorCalldata(request: SimulationRequest): string {
    // Mock calldata for AgentExecutor.executeSwapWithPermit2
    // In a real implementation, this would use proper ABI encoding
    const functionSelector = '0x12345678'; // Mock function selector
    const tokenIn = request.tokenIn.padStart(64, '0');
    const tokenOut = request.tokenOut.padStart(64, '0');
    const amountIn = BigInt(request.amountIn).toString(16).padStart(64, '0');
    const minReceived = BigInt(request.minReceived).toString(16).padStart(64, '0');
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now
    const deadlineHex = deadline.toString(16).padStart(64, '0');
    const routerType = '0000000000000000000000000000000000000000000000000000000000000001'; // Mock router type
    const data = '0x'.padEnd(66, '0'); // Mock router data
    const permit2Data = '0x'.padEnd(66, '0'); // Mock permit2 data

    return `${functionSelector}${tokenIn}${tokenOut}${amountIn}${minReceived}${deadlineHex}${routerType}${data}${permit2Data}`;
  }

  /**
   * Get AgentExecutor address for chain
   */
  private getAgentExecutorAddress(chainId: ChainId): string {
    const addresses: Record<ChainId, string> = {
      [ChainId.ETHEREUM]: '0x0000000000000000000000000000000000000000', // Not deployed
      [ChainId.ARBITRUM]: '0x0000000000000000000000000000000000000000', // Not deployed
      [ChainId.OPTIMISM]: '0x0000000000000000000000000000000000000000', // Not deployed
      [ChainId.POLYGON]: '0x0000000000000000000000000000000000000000', // Not deployed
      [ChainId.BASE]: '0x0000000000000000000000000000000000000000', // Not deployed
      [ChainId.LOCAL_TESTNET]: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', // Deployed locally
    };

    return addresses[chainId] || addresses[ChainId.LOCAL_TESTNET];
  }

  /**
   * Get gas price for chain
   */
  private getGasPrice(chainId: ChainId): string {
    const gasPrices: Record<ChainId, string> = {
      [ChainId.ETHEREUM]: '20000000000', // 20 gwei
      [ChainId.ARBITRUM]: '100000000', // 0.1 gwei
      [ChainId.OPTIMISM]: '1000000', // 0.001 gwei
      [ChainId.POLYGON]: '30000000000', // 30 gwei
      [ChainId.BASE]: '1000000', // 0.001 gwei
      [ChainId.LOCAL_TESTNET]: '20000000000', // 20 gwei
    };

    return gasPrices[chainId] || gasPrices[ChainId.LOCAL_TESTNET];
  }

  /**
   * Calculate price impact from simulation results
   */
  private calculatePriceImpact(amountIn: string, actualOut: string, expectedOut: string): number {
    const amountInNum = parseFloat(amountIn);
    const actualOutNum = parseFloat(actualOut);
    const expectedOutNum = parseFloat(expectedOut);

    if (amountInNum === 0 || expectedOutNum === 0) {
      return 0;
    }

    const priceImpact = ((expectedOutNum - actualOutNum) / expectedOutNum) * 10000; // Convert to basis points
    return Math.max(0, priceImpact);
  }

  /**
   * Generate error message from simulation and guard check results
   */
  private generateErrorMessage(simulation: SimulationResult, guardChecks: GuardCheckResult): string {
    if (!simulation.success) {
      return `Simulation failed: ${simulation.error || 'Unknown error'}`;
    }

    if (!guardChecks.passed) {
      const failedChecks = guardChecks.checks.filter(check => !check.passed);
      return `Guard checks failed: ${failedChecks.map(check => check.message).join(', ')}`;
    }

    return 'Unknown error';
  }

  /**
   * Validate Ethereum address
   */
  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Validate amount string
   */
  private isValidAmount(amount: string): boolean {
    return /^\d+(\.\d+)?$/.test(amount) && parseFloat(amount) > 0;
  }

  /**
   * Get simulation statistics
   */
  async getSimulationStats(): Promise<{
    totalSimulations: number;
    successfulSimulations: number;
    failedSimulations: number;
    averageGasUsed: number;
    averagePriceImpact: number;
  }> {
    // In a real implementation, this would query a database
    // For now, return mock statistics
    return {
      totalSimulations: 0,
      successfulSimulations: 0,
      failedSimulations: 0,
      averageGasUsed: 0,
      averagePriceImpact: 0,
    };
  }

  /**
   * Health check for simulation service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    tenderlyAvailable: boolean;
    lastSimulation?: string;
    errors: string[];
  }> {
    const errors: string[] = [];
    let tenderlyAvailable = false;

    try {
      // Test Tenderly connectivity with a simple simulation
      const testSimulation = await this.tenderlyAdapter.simulateAgentExecutor({
        from: '0x0000000000000000000000000000000000000000',
        to: '0x0000000000000000000000000000000000000000',
        data: '0x',
        value: '0',
        gasLimit: '21000',
        gasPrice: '20000000000',
        chainId: ChainId.LOCAL_TESTNET,
      });

      tenderlyAvailable = true;
    } catch (error) {
      errors.push(`Tenderly connectivity test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const status = tenderlyAvailable ? 'healthy' : 'degraded';

    return {
      status,
      tenderlyAvailable,
      errors,
    };
  }
}