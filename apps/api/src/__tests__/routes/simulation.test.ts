/**
 * API integration tests for simulation endpoint
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import simulationRoutes from '../../routes/simulation.js';
import { ChainId } from '../../types/policy.js';

// Mock the simulation service
jest.mock('../../services/simulationService.js', () => ({
  SimulationService: jest.fn().mockImplementation(() => ({
    simulateTransaction: jest.fn(),
    healthCheck: jest.fn(),
  })),
}));

const app = express();
app.use(express.json());
app.use('/v1/simulate', simulationRoutes);

describe('Simulation API Integration Tests', () => {
  let mockSimulationService: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Get the mocked service instance
    const { SimulationService } = require('../../services/simulationService.js');
    mockSimulationService = new SimulationService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /v1/simulate', () => {
    it('should simulate transaction successfully', async () => {
      const mockResponse = {
        success: true,
        gasUsed: '150000',
        gasPrice: '20000000000',
        actualOut: '1000000000000000000',
        priceImpact: 50,
        simulationId: 'sim_1234567890',
        simulationDetails: {
          logs: [],
          trace: [],
          guardChecks: [
            {
              name: 'Transaction Success',
              passed: true,
              message: 'Transaction executed successfully',
            },
            {
              name: 'Output Amount Check',
              passed: true,
              message: 'Output sufficient: 1000000000000000000 >= 950000000000000000',
            },
          ],
          warnings: [],
          simulationUrl: 'https://dashboard.tenderly.co/simulator/sim_1234567890',
        },
      };

      mockSimulationService.simulateTransaction.mockResolvedValue(mockResponse);

      const requestBody = {
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

      const response = await request(app)
        .post('/v1/simulate')
        .send(requestBody)
        .expect(200);

      expect(response.body).toEqual(mockResponse);
      expect(mockSimulationService.simulateTransaction).toHaveBeenCalledWith(requestBody);
    });

    it('should handle simulation failure', async () => {
      const mockResponse = {
        success: false,
        error: 'Simulation failed: execution reverted: Insufficient output amount',
      };

      mockSimulationService.simulateTransaction.mockResolvedValue(mockResponse);

      const requestBody = {
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

      const response = await request(app)
        .post('/v1/simulate')
        .send(requestBody)
        .expect(200);

      expect(response.body).toEqual(mockResponse);
    });

    it('should validate request parameters', async () => {
      const invalidRequestBody = {
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

      const response = await request(app)
        .post('/v1/simulate')
        .send(invalidRequestBody)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid request');
    });

    it('should handle missing required fields', async () => {
      const incompleteRequestBody = {
        tokenIn: '0x0000000000000000000000000000000000000000',
        // Missing other required fields
      };

      const response = await request(app)
        .post('/v1/simulate')
        .send(incompleteRequestBody)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle service errors gracefully', async () => {
      mockSimulationService.simulateTransaction.mockRejectedValue(
        new Error('Service unavailable')
      );

      const requestBody = {
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

      const response = await request(app)
        .post('/v1/simulate')
        .send(requestBody)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Internal server error');
    });

    it('should handle different chain IDs', async () => {
      const mockResponse = {
        success: true,
        gasUsed: '150000',
        gasPrice: '20000000000',
        actualOut: '1000000000000000000',
        priceImpact: 50,
        simulationId: 'sim_1234567890',
      };

      mockSimulationService.simulateTransaction.mockResolvedValue(mockResponse);

      const chains = [ChainId.ETHEREUM, ChainId.ARBITRUM, ChainId.OPTIMISM, ChainId.LOCAL_TESTNET];

      for (const chainId of chains) {
        const requestBody = {
          tokenIn: '0x0000000000000000000000000000000000000000',
          tokenOut: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
          amountIn: '1.0',
          expectedOut: '2000.0',
          minReceived: '1900.0',
          chainId,
          router: '0x3a23F943181408EAC424116Af7b7790c94Cb97a5',
          routerType: 'ZEROX',
          userAddress: '0x1234567890123456789012345678901234567890',
        };

        const response = await request(app)
          .post('/v1/simulate')
          .send(requestBody)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(mockSimulationService.simulateTransaction).toHaveBeenCalledWith(requestBody);
      }
    });

    it('should handle different router types', async () => {
      const mockResponse = {
        success: true,
        gasUsed: '150000',
        gasPrice: '20000000000',
        actualOut: '1000000000000000000',
        priceImpact: 50,
        simulationId: 'sim_1234567890',
      };

      mockSimulationService.simulateTransaction.mockResolvedValue(mockResponse);

      const routerTypes = ['ZEROX', 'ONEINCH', 'UNISWAP_V3', 'SUSHISWAP'];

      for (const routerType of routerTypes) {
        const requestBody = {
          tokenIn: '0x0000000000000000000000000000000000000000',
          tokenOut: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
          amountIn: '1.0',
          expectedOut: '2000.0',
          minReceived: '1900.0',
          chainId: ChainId.LOCAL_TESTNET,
          router: '0x3a23F943181408EAC424116Af7b7790c94Cb97a5',
          routerType,
          userAddress: '0x1234567890123456789012345678901234567890',
        };

        const response = await request(app)
          .post('/v1/simulate')
          .send(requestBody)
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    it('should include simulation details in response', async () => {
      const mockResponse = {
        success: true,
        gasUsed: '150000',
        gasPrice: '20000000000',
        actualOut: '1000000000000000000',
        priceImpact: 50,
        simulationId: 'sim_1234567890',
        simulationDetails: {
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
          guardChecks: [
            {
              name: 'Transaction Success',
              passed: true,
              message: 'Transaction executed successfully',
            },
            {
              name: 'Output Amount Check',
              passed: true,
              message: 'Output sufficient: 1000000000000000000 >= 950000000000000000',
            },
          ],
          warnings: [],
          simulationUrl: 'https://dashboard.tenderly.co/simulator/sim_1234567890',
        },
      };

      mockSimulationService.simulateTransaction.mockResolvedValue(mockResponse);

      const requestBody = {
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

      const response = await request(app)
        .post('/v1/simulate')
        .send(requestBody)
        .expect(200);

      expect(response.body.simulationDetails).toBeDefined();
      expect(response.body.simulationDetails.logs).toHaveLength(1);
      expect(response.body.simulationDetails.trace).toHaveLength(1);
      expect(response.body.simulationDetails.guardChecks).toHaveLength(2);
      expect(response.body.simulationDetails.simulationUrl).toContain('tenderly.co');
    });

    it('should handle large amounts correctly', async () => {
      const mockResponse = {
        success: true,
        gasUsed: '200000',
        gasPrice: '20000000000',
        actualOut: '2000000000000000000000', // 2000 ETH
        priceImpact: 100,
        simulationId: 'sim_1234567890',
      };

      mockSimulationService.simulateTransaction.mockResolvedValue(mockResponse);

      const requestBody = {
        tokenIn: '0x0000000000000000000000000000000000000000',
        tokenOut: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amountIn: '1000.0', // Large amount
        expectedOut: '2000000.0',
        minReceived: '1900000.0',
        chainId: ChainId.LOCAL_TESTNET,
        router: '0x3a23F943181408EAC424116Af7b7790c94Cb97a5',
        routerType: 'ZEROX',
        userAddress: '0x1234567890123456789012345678901234567890',
      };

      const response = await request(app)
        .post('/v1/simulate')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.actualOut).toBe('2000000000000000000000');
    });

    it('should handle zero amounts gracefully', async () => {
      const mockResponse = {
        success: false,
        error: 'Invalid amount: must be greater than zero',
      };

      mockSimulationService.simulateTransaction.mockResolvedValue(mockResponse);

      const requestBody = {
        tokenIn: '0x0000000000000000000000000000000000000000',
        tokenOut: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amountIn: '0.0', // Zero amount
        expectedOut: '0.0',
        minReceived: '0.0',
        chainId: ChainId.LOCAL_TESTNET,
        router: '0x3a23F943181408EAC424116Af7b7790c94Cb97a5',
        routerType: 'ZEROX',
        userAddress: '0x1234567890123456789012345678901234567890',
      };

      const response = await request(app)
        .post('/v1/simulate')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid amount');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/v1/simulate')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle empty request body', async () => {
      const response = await request(app)
        .post('/v1/simulate')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle timeout scenarios', async () => {
      mockSimulationService.simulateTransaction.mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const requestBody = {
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

      const response = await request(app)
        .post('/v1/simulate')
        .send(requestBody)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });
});
