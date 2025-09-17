import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import quoteRoutes from '../../routes/quote.js';
import { CHAIN_IDS } from '../../schemas/quote.js';

const app = express();
app.use(express.json());
app.use('/v1/quote', quoteRoutes);

describe('Quote Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /v1/quote/best', () => {
    it('should return best quote for valid request', async () => {
      const requestBody = {
        tokenIn: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        tokenOut: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amountIn: '1.0',
        chainId: CHAIN_IDS.ETHEREUM,
        slippageTolerance: 0.5,
      };

      const response = await request(app)
        .post('/v1/quote/best')
        .send(requestBody)
        .expect(200);

      expect(response.body).toHaveProperty('bestRoute');
      expect(response.body.bestRoute).toHaveProperty('tokenIn', requestBody.tokenIn);
      expect(response.body.bestRoute).toHaveProperty('tokenOut', requestBody.tokenOut);
      expect(response.body.bestRoute).toHaveProperty('amountIn', requestBody.amountIn);
      expect(response.body.bestRoute).toHaveProperty('expectedOut');
      expect(response.body.bestRoute).toHaveProperty('minReceived');
      expect(response.body.bestRoute).toHaveProperty('router');
      expect(response.body.bestRoute).toHaveProperty('routerType');
      expect(response.body.bestRoute).toHaveProperty('priceImpactBps');
      expect(response.body.bestRoute).toHaveProperty('gasEstimate');
      expect(response.body.bestRoute).toHaveProperty('gasPrice');
      expect(response.body.bestRoute).toHaveProperty('deadline');
      expect(response.body.bestRoute).toHaveProperty('ttl');
      expect(response.body).toHaveProperty('rejectedRoutes');
      expect(response.body).toHaveProperty('totalRoutes');
      expect(response.body).toHaveProperty('processingTimeMs');
    });

    it('should return 400 for invalid request body', async () => {
      const invalidRequestBody = {
        tokenIn: 'invalid-address',
        tokenOut: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amountIn: 'not-a-number',
        chainId: 'not-a-number',
      };

      const response = await request(app)
        .post('/v1/quote/best')
        .send(invalidRequestBody)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteRequestBody = {
        tokenIn: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        // Missing other required fields
      };

      const response = await request(app)
        .post('/v1/quote/best')
        .send(incompleteRequestBody)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should handle timeout gracefully', async () => {
      // Mock the quote service to delay response
      const originalGetBestQuote = require('../../services/quoteService.js').QuoteService.prototype.getBestQuote;
      jest.spyOn(require('../../services/quoteService.js').QuoteService.prototype, 'getBestQuote')
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 6000))); // 6 second delay

      const requestBody = {
        tokenIn: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        tokenOut: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amountIn: '1.0',
        chainId: CHAIN_IDS.ETHEREUM,
      };

      const response = await request(app)
        .post('/v1/quote/best')
        .send(requestBody)
        .expect(408);

      expect(response.body).toHaveProperty('error', 'Request timeout');
    });
  });

  describe('GET /v1/quote/tokens/:chainId', () => {
    it('should return tokens for valid chain ID', async () => {
      const response = await request(app)
        .get(`/v1/quote/tokens/${CHAIN_IDS.ETHEREUM}`)
        .expect(200);

      expect(response.body).toHaveProperty('chainId', CHAIN_IDS.ETHEREUM);
      expect(response.body).toHaveProperty('tokens');
      expect(Array.isArray(response.body.tokens)).toBe(true);
      expect(response.body.tokens.length).toBeGreaterThan(0);
      
      // Check token structure
      const token = response.body.tokens[0];
      expect(token).toHaveProperty('address');
      expect(token).toHaveProperty('symbol');
      expect(token).toHaveProperty('name');
      expect(token).toHaveProperty('decimals');
    });

    it('should return 400 for invalid chain ID', async () => {
      const response = await request(app)
        .get('/v1/quote/tokens/invalid')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid chain ID');
    });

    it('should return empty tokens array for unsupported chain', async () => {
      const response = await request(app)
        .get('/v1/quote/tokens/999999')
        .expect(200);

      expect(response.body).toHaveProperty('chainId', 999999);
      expect(response.body).toHaveProperty('tokens');
      expect(Array.isArray(response.body.tokens)).toBe(true);
      expect(response.body.tokens.length).toBe(0);
    });
  });

  describe('GET /v1/quote/routers/:chainId', () => {
    it('should return routers for valid chain ID', async () => {
      const response = await request(app)
        .get(`/v1/quote/routers/${CHAIN_IDS.ETHEREUM}`)
        .expect(200);

      expect(response.body).toHaveProperty('chainId', CHAIN_IDS.ETHEREUM);
      expect(response.body).toHaveProperty('routers');
      expect(Array.isArray(response.body.routers)).toBe(true);
      expect(response.body.routers.length).toBeGreaterThan(0);
      
      // Check router structure
      const router = response.body.routers[0];
      expect(router).toHaveProperty('type');
      expect(router).toHaveProperty('address');
    });

    it('should return 400 for invalid chain ID', async () => {
      const response = await request(app)
        .get('/v1/quote/routers/invalid')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid chain ID');
    });

    it('should return empty routers array for unsupported chain', async () => {
      const response = await request(app)
        .get('/v1/quote/routers/999999')
        .expect(200);

      expect(response.body).toHaveProperty('chainId', 999999);
      expect(response.body).toHaveProperty('routers');
      expect(Array.isArray(response.body.routers)).toBe(true);
      expect(response.body.routers.length).toBe(0);
    });
  });
});
