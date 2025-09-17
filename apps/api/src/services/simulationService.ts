import { SimulationRequest, SimulationResponse } from '../schemas/quote.js';

export class SimulationService {
  private static instance: SimulationService;
  
  public static getInstance(): SimulationService {
    if (!SimulationService.instance) {
      SimulationService.instance = new SimulationService();
    }
    return SimulationService.instance;
  }

  /**
   * Simulate a swap transaction using Tenderly (mock implementation)
   */
  async simulateSwap(request: SimulationRequest): Promise<SimulationResponse> {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));

      // Mock simulation logic
      const amountInFloat = parseFloat(request.amountIn);
      const expectedOutFloat = parseFloat(request.expectedOut);
      
      // Simulate different outcomes based on router type
      let success = true;
      let actualOut = expectedOutFloat;
      let gasUsed = '21000';
      let gasPrice = '20';
      let priceImpact = 0;
      let error: string | undefined;

      // Simulate occasional simulation failures (5% chance)
      if (Math.random() < 0.05) {
        success = false;
        error = 'Simulation failed: Insufficient liquidity';
        return {
          success: false,
          error,
          simulationId: this.generateSimulationId(),
        };
      }

      // Simulate slippage based on amount size
      const slippagePercent = Math.min(amountInFloat * 0.001, 5); // Max 5% slippage
      const slippageMultiplier = 1 - (slippagePercent / 100);
      actualOut = expectedOutFloat * slippageMultiplier;
      
      // Calculate price impact
      priceImpact = (expectedOutFloat - actualOut) / expectedOutFloat * 100;

      // Simulate gas usage based on router type
      switch (request.routerType) {
        case 'UNISWAP_V3':
          gasUsed = (50000 + Math.floor(Math.random() * 20000)).toString(); // 50k-70k gas
          gasPrice = (20 + Math.floor(Math.random() * 10)).toString(); // 20-30 gwei
          break;
        case 'UNISWAP_V2':
          gasUsed = (80000 + Math.floor(Math.random() * 30000)).toString(); // 80k-110k gas
          gasPrice = (25 + Math.floor(Math.random() * 15)).toString(); // 25-40 gwei
          break;
        case 'SUSHISWAP':
          gasUsed = (70000 + Math.floor(Math.random() * 25000)).toString(); // 70k-95k gas
          gasPrice = (22 + Math.floor(Math.random() * 12)).toString(); // 22-34 gwei
          break;
        default:
          gasUsed = (60000 + Math.floor(Math.random() * 20000)).toString(); // 60k-80k gas
          gasPrice = (20 + Math.floor(Math.random() * 10)).toString(); // 20-30 gwei
      }

      // Simulate high price impact rejection (10% chance if impact > 2%)
      if (priceImpact > 2 && Math.random() < 0.1) {
        success = false;
        error = `Simulation failed: Price impact too high (${priceImpact.toFixed(2)}%)`;
        return {
          success: false,
          error,
          simulationId: this.generateSimulationId(),
        };
      }

      return {
        success,
        gasUsed,
        gasPrice,
        actualOut: actualOut.toString(),
        priceImpact,
        simulationId: this.generateSimulationId(),
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Simulation failed',
        simulationId: this.generateSimulationId(),
      };
    }
  }

  /**
   * Generate a unique simulation ID
   */
  private generateSimulationId(): string {
    return `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get simulation status (mock implementation)
   */
  async getSimulationStatus(simulationId: string): Promise<{
    status: 'pending' | 'completed' | 'failed';
    result?: SimulationResponse;
  }> {
    // Simulate async simulation status
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      status: 'completed',
      result: {
        success: true,
        gasUsed: '55000',
        gasPrice: '25',
        actualOut: '2000.0',
        priceImpact: 0.5,
        simulationId,
      },
    };
  }
}
