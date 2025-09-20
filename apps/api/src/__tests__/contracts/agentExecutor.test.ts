/**
 * Contract-level smoke tests for AgentExecutor simulation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TenderlyAdapter } from '../../services/tenderlyAdapter.js';
import { SimulationService } from '../../services/simulationService.js';
import { ChainId } from '../../types/policy.js';
import { SimulationRequest } from '../../schemas/quote.js';

// Mock Tenderly API responses
const mockTenderlyResponse = {
  transaction: {
    hash: '0x1234567890abcdef',
    from: '0x1234567890123456789012345678901234567890',
    to: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    input: '0x12345678',
    value: '0',
    gas: 500000,
    gas_price: '20000000000',
    gas_used: 150000,
    block_number: 12345678,
    status: true,
    logs: [
      {
        address: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'],
        data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
      },
    ],
  },
  simulation: {
    id: 'sim_1234567890',
    status: true,
    gas_used: 150000,
    block_number: 12345678,
    logs: [
      {
        address: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'],
        data: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
      },
    ],
    trace: [
      {
        type: 'call',
        from: '0x1234567890123456789012345678901234567890',
        to: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        value: '0x0',
        gas: 500000,
        gas_used: 150000,
        input: '0x12345678',
        output: '0x',
      },
    ],
  },
  contracts: [],
};

describe('AgentExecutor Contract Simulation', () => {
  let tenderlyAdapter: TenderlyAdapter;
  let simulationService: SimulationService;

  beforeEach(() => {
    tenderlyAdapter = new TenderlyAdapter();
    simulationService = new SimulationService();
    
    // Mock fetch for Tenderly API
    global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
  });

  describe('Tenderly Adapter', () => {
    it('should simulate AgentExecutor transaction successfully', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTenderlyResponse),
      } as Response);

      const result = await tenderlyAdapter.simulateAgentExecutor({
        from: '0x1234567890123456789012345678901234567890',
        to: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        data: '0x12345678',
        value: '0',
        gasLimit: '500000',
        gasPrice: '20000000000',
        chainId: ChainId.LOCAL_TESTNET,
      });

      expect(result.success).toBe(true);
      expect(result.gasUsed).toBe('150000');
      expect(result.actualOut).toBe('1000000000000000000'); // 1 ETH
      expect(result.simulationId).toBe('sim_1234567890');
    });

    it('should handle simulation failure', async () => {
      const failedResponse = {
        ...mockTenderlyResponse,
        simulation: {
          ...mockTenderlyResponse.simulation,
          status: false,
          trace: [
            {
              ...mockTenderlyResponse.simulation.trace[0],
              error: 'execution reverted: Insufficient output amount',
            },
          ],
        },
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(failedResponse),
      } as Response);

      const result = await tenderlyAdapter.simulateAgentExecutor({
        from: '0x1234567890123456789012345678901234567890',
        to: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        data: '0x12345678',
        value: '0',
        gasLimit: '500000',
        gasPrice: '20000000000',
        chainId: ChainId.LOCAL_TESTNET,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('execution reverted: Insufficient output amount');
    });

    it('should perform guard checks correctly', async () => {
      const simulation = {
        success: true,
        gasUsed: '150000',
        gasPrice: '20000000000',
        actualOut: '1000000000000000000', // 1 ETH
        priceImpact: 50,
        simulationId: 'sim_1234567890',
        logs: [],
        trace: [],
      };

      const guardChecks = await tenderlyAdapter.performGuardChecks(
        simulation,
        '950000000000000000', // 0.95 ETH minimum
        '100' // Max gas cost
      );

      expect(guardChecks.passed).toBe(true);
      expect(guardChecks.checks).toHaveLength(6);
      expect(guardChecks.checks.every(check => check.passed)).toBe(true);
    });

    it('should fail guard checks when output is insufficient', async () => {
      const simulation = {
        success: true,
        gasUsed: '150000',
        gasPrice: '20000000000',
        actualOut: '800000000000000000', // 0.8 ETH
        priceImpact: 50,
        simulationId: 'sim_1234567890',
        logs: [],
        trace: [],
      };

      const guardChecks = await tenderlyAdapter.performGuardChecks(
        simulation,
        '950000000000000000', // 0.95 ETH minimum
        '100' // Max gas cost
      );

      expect(guardChecks.passed).toBe(false);
      const outputCheck = guardChecks.checks.find(check => check.name === 'Output Amount Check');
      expect(outputCheck?.passed).toBe(false);
      expect(outputCheck?.message).toContain('Insufficient output');
    });

    it('should fail guard checks when gas usage is too high', async () => {
      const simulation = {
        success: true,
        gasUsed: '600000', // Too high
        gasPrice: '20000000000',
        actualOut: '1000000000000000000',
        priceImpact: 50,
        simulationId: 'sim_1234567890',
        logs: [],
        trace: [],
      };

      const guardChecks = await tenderlyAdapter.performGuardChecks(
        simulation,
        '950000000000000000',
        '100'
      );

      expect(guardChecks.passed).toBe(false);
      const gasCheck = guardChecks.checks.find(check => check.name === 'Gas Usage Check');
      expect(gasCheck?.passed).toBe(false);
      expect(gasCheck?.message).toContain('Gas usage too high');
    });

    it('should validate simulation parameters', () => {
      const validParams = {
        from: '0x1234567890123456789012345678901234567890',
        to: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        data: '0x12345678',
        value: '0',
        gasLimit: '500000',
        gasPrice: '20000000000',
        chainId: ChainId.LOCAL_TESTNET,
      };

      const validation = tenderlyAdapter.validateSimulationParams(validParams);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid simulation parameters', () => {
      const invalidParams = {
        from: 'invalid_address',
        to: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        data: '0x12345678',
        value: '0',
        gasLimit: '500000',
        gasPrice: '20000000000',
        chainId: ChainId.LOCAL_TESTNET,
      };

      const validation = tenderlyAdapter.validateSimulationParams(invalidParams);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid from address');
    });
  });

  describe('Simulation Service', () => {
    it('should simulate transaction with guard checks', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTenderlyResponse),
      } as Response);

      const request: SimulationRequest = {
        tokenIn: '0x0000000000000000000000000000000000000000',
        tokenOut: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amountIn: '1.0',
        expectedOut: '2000.0',
        minReceived: '1900.0',
        chainId: ChainId.LOCAL_TESTNET,
        router: '0x3a23F943181408EAC424116Af7b7790c94Cb97a5',
        routerType: 'ZEROX',
        userAddress: '0x1234567890123456789012345678901234567890',
      };

      const result = await simulationService.simulateTransaction(request);

      expect(result.success).toBe(true);
      expect(result.gasUsed).toBe('150000');
      expect(result.actualOut).toBe('1000000000000000000');
      expect(result.simulationId).toBe('sim_1234567890');
      expect(result.simulationDetails).toBeDefined();
      expect(result.simulationDetails?.guardChecks).toHaveLength(6);
    });

    it('should handle simulation failure', async () => {
      const failedResponse = {
        ...mockTenderlyResponse,
        simulation: {
          ...mockTenderlyResponse.simulation,
          status: false,
          trace: [
            {
              ...mockTenderlyResponse.simulation.trace[0],
              error: 'execution reverted: Insufficient output amount',
            },
          ],
        },
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(failedResponse),
      } as Response);

      const request: SimulationRequest = {
        tokenIn: '0x0000000000000000000000000000000000000000',
        tokenOut: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amountIn: '1.0',
        expectedOut: '2000.0',
        minReceived: '1900.0',
        chainId: ChainId.LOCAL_TESTNET,
        router: '0x3a23F943181408EAC424116Af7b7790c94Cb97a5',
        routerType: 'ZEROX',
        userAddress: '0x1234567890123456789012345678901234567890',
      };

      const result = await simulationService.simulateTransaction(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Simulation failed');
    });

    it('should validate request parameters', async () => {
      const invalidRequest: SimulationRequest = {
        tokenIn: 'invalid_address',
        tokenOut: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amountIn: '1.0',
        expectedOut: '2000.0',
        minReceived: '1900.0',
        chainId: ChainId.LOCAL_TESTNET,
        router: '0x3a23F943181408EAC424116Af7b7790c94Cb97a5',
        routerType: 'ZEROX',
        userAddress: '0x1234567890123456789012345678901234567890',
      };

      const result = await simulationService.simulateTransaction(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid request');
    });

    it('should calculate price impact correctly', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTenderlyResponse),
      } as Response);

      const request: SimulationRequest = {
        tokenIn: '0x0000000000000000000000000000000000000000',
        tokenOut: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amountIn: '1.0',
        expectedOut: '2000.0',
        minReceived: '1900.0',
        chainId: ChainId.LOCAL_TESTNET,
        router: '0x3a23F943181408EAC424116Af7b7790c94Cb97a5',
        routerType: 'ZEROX',
        userAddress: '0x1234567890123456789012345678901234567890',
      };

      const result = await simulationService.simulateTransaction(request);

      expect(result.priceImpact).toBeDefined();
      expect(typeof result.priceImpact).toBe('number');
    });

    it('should provide health check', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTenderlyResponse),
      } as Response);

      const health = await simulationService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.tenderlyAvailable).toBe(true);
      expect(health.errors).toHaveLength(0);
    });

    it('should handle Tenderly API errors gracefully', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Tenderly API error: 500 Internal Server Error')
      );

      const health = await simulationService.healthCheck();

      expect(health.status).toBe('degraded');
      expect(health.tenderlyAvailable).toBe(false);
      expect(health.errors.length).toBeGreaterThan(0);
    });
  });

  describe('AgentExecutor Calldata Encoding', () => {
    it('should encode calldata correctly', async () => {
      const request: SimulationRequest = {
        tokenIn: '0x0000000000000000000000000000000000000000',
        tokenOut: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amountIn: '1.0',
        expectedOut: '2000.0',
        minReceived: '1900.0',
        chainId: ChainId.LOCAL_TESTNET,
        router: '0x3a23F943181408EAC424116Af7b7790c94Cb97a5',
        routerType: 'ZEROX',
        userAddress: '0x1234567890123456789012345678901234567890',
      };

      // Access private method for testing
      const simulationService = new SimulationService();
      const calldata = (simulationService as any).encodeAgentExecutorCalldata(request);

      expect(calldata).toMatch(/^0x[0-9a-f]+$/);
      expect(calldata.length).toBeGreaterThan(10); // Should be a reasonable length
    });
  });

  describe('Guard Check Edge Cases', () => {
    it('should handle zero actual output', async () => {
      const simulation = {
        success: true,
        gasUsed: '150000',
        gasPrice: '20000000000',
        actualOut: '0',
        priceImpact: 0,
        simulationId: 'sim_1234567890',
        logs: [],
        trace: [],
      };

      const guardChecks = await tenderlyAdapter.performGuardChecks(
        simulation,
        '1000000000000000000', // 1 ETH minimum
        '100'
      );

      expect(guardChecks.passed).toBe(false);
      const outputCheck = guardChecks.checks.find(check => check.name === 'Output Amount Check');
      expect(outputCheck?.passed).toBe(false);
    });

    it('should handle very high gas cost', async () => {
      const simulation = {
        success: true,
        gasUsed: '400000',
        gasPrice: '100000000000', // Very high gas price
        actualOut: '1000000000000000000',
        priceImpact: 50,
        simulationId: 'sim_1234567890',
        logs: [],
        trace: [],
      };

      const guardChecks = await tenderlyAdapter.performGuardChecks(
        simulation,
        '950000000000000000',
        '50' // Low max gas cost
      );

      expect(guardChecks.passed).toBe(false);
      const gasCostCheck = guardChecks.checks.find(check => check.name === 'Gas Cost Check');
      expect(gasCostCheck?.passed).toBe(false);
    });

    it('should detect unexpected reverts in trace', async () => {
      const simulation = {
        success: true,
        gasUsed: '150000',
        gasPrice: '20000000000',
        actualOut: '1000000000000000000',
        priceImpact: 50,
        simulationId: 'sim_1234567890',
        logs: [],
        trace: [
          {
            type: 'call',
            from: '0x1234567890123456789012345678901234567890',
            to: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
            value: '0x0',
            gas: 500000,
            gas_used: 150000,
            input: '0x12345678',
            output: '0x',
            error: 'execution reverted: Transfer failed',
          },
        ],
      };

      const guardChecks = await tenderlyAdapter.performGuardChecks(
        simulation,
        '950000000000000000',
        '100'
      );

      expect(guardChecks.passed).toBe(false);
      const revertCheck = guardChecks.checks.find(check => check.name === 'No Unexpected Reverts');
      expect(revertCheck?.passed).toBe(false);
    });
  });
});
