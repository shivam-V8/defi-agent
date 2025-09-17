import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { QuoteService } from '../../services/quoteService.js';
import { QuoteRequest, CHAIN_IDS, ROUTER_TYPES } from '../../schemas/quote.js';

describe('QuoteService', () => {
  let quoteService: QuoteService;

  beforeEach(() => {
    quoteService = QuoteService.getInstance();
  });

  describe('getBestQuote', () => {
    it('should return the best quote for a valid request', async () => {
      const request: QuoteRequest = {
        tokenIn: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        tokenOut: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amountIn: '1.0',
        chainId: CHAIN_IDS.ETHEREUM,
        slippageTolerance: 0.5,
      };

      const result = await quoteService.getBestQuote(request);

      expect(result).toBeDefined();
      expect(result.bestRoute).toBeDefined();
      expect(result.bestRoute.tokenIn).toBe(request.tokenIn);
      expect(result.bestRoute.tokenOut).toBe(request.tokenOut);
      expect(result.bestRoute.amountIn).toBe(request.amountIn);
      expect(result.bestRoute.expectedOut).toBeDefined();
      expect(result.bestRoute.minReceived).toBeDefined();
      expect(result.bestRoute.router).toBeDefined();
      expect(result.bestRoute.routerType).toBeDefined();
      expect(result.bestRoute.priceImpactBps).toBeGreaterThanOrEqual(0);
      expect(result.bestRoute.gasEstimate).toBeDefined();
      expect(result.bestRoute.gasPrice).toBeDefined();
      expect(result.bestRoute.deadline).toBeGreaterThan(0);
      expect(result.bestRoute.ttl).toBeGreaterThan(0);
      expect(result.rejectedRoutes).toBeDefined();
      expect(Array.isArray(result.rejectedRoutes)).toBe(true);
      expect(result.totalRoutes).toBeGreaterThan(0);
      expect(result.processingTimeMs).toBeGreaterThan(0);
    });

    it('should handle different chain IDs', async () => {
      const chains = [CHAIN_IDS.ETHEREUM, CHAIN_IDS.ARBITRUM, CHAIN_IDS.OPTIMISM];
      
      for (const chainId of chains) {
        const request: QuoteRequest = {
          tokenIn: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          tokenOut: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
          amountIn: '1.0',
          chainId,
          slippageTolerance: 0.5,
        };

        const result = await quoteService.getBestQuote(request);
        expect(result.bestRoute).toBeDefined();
      }
    });

    it('should apply slippage tolerance correctly', async () => {
      const request: QuoteRequest = {
        tokenIn: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        tokenOut: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amountIn: '1.0',
        chainId: CHAIN_IDS.ETHEREUM,
        slippageTolerance: 1.0, // 1% slippage
      };

      const result = await quoteService.getBestQuote(request);
      const expectedOut = parseFloat(result.bestRoute.expectedOut);
      const minReceived = parseFloat(result.bestRoute.minReceived);
      const expectedMinReceived = expectedOut * 0.99; // 99% of expected out

      expect(minReceived).toBeLessThanOrEqual(expectedMinReceived);
    });

    it('should throw error for unsupported chain', async () => {
      const request: QuoteRequest = {
        tokenIn: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        tokenOut: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amountIn: '1.0',
        chainId: 999999, // Unsupported chain
        slippageTolerance: 0.5,
      };

      await expect(quoteService.getBestQuote(request)).rejects.toThrow();
    });

    it('should return different quotes for different amounts', async () => {
      const baseRequest: Omit<QuoteRequest, 'amountIn'> = {
        tokenIn: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        tokenOut: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        chainId: CHAIN_IDS.ETHEREUM,
        slippageTolerance: 0.5,
      };

      const smallAmount = await quoteService.getBestQuote({ ...baseRequest, amountIn: '0.1' });
      const largeAmount = await quoteService.getBestQuote({ ...baseRequest, amountIn: '10.0' });

      expect(smallAmount.bestRoute.expectedOut).not.toBe(largeAmount.bestRoute.expectedOut);
    });
  });

  describe('getTokenMetadata', () => {
    it('should return token metadata for known tokens', () => {
      const wethMetadata = quoteService.getTokenMetadata('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2');
      expect(wethMetadata).toEqual({
        symbol: 'WETH',
        decimals: 18,
        name: 'Wrapped Ether',
      });

      const usdcMetadata = quoteService.getTokenMetadata('0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C');
      expect(usdcMetadata).toEqual({
        symbol: 'USDC',
        decimals: 6,
        name: 'USD Coin',
      });
    });

    it('should return null for unknown tokens', () => {
      const unknownMetadata = quoteService.getTokenMetadata('0x0000000000000000000000000000000000000000');
      expect(unknownMetadata).toBeNull();
    });
  });

  describe('getAvailableRouters', () => {
    it('should return available routers for supported chains', () => {
      const ethereumRouters = quoteService.getAvailableRouters(CHAIN_IDS.ETHEREUM);
      expect(Object.keys(ethereumRouters).length).toBeGreaterThan(0);
      expect(ethereumRouters[ROUTER_TYPES.UNISWAP_V3]).toBeDefined();
      expect(ethereumRouters[ROUTER_TYPES.UNISWAP_V3]).toBeDefined();

      const arbitrumRouters = quoteService.getAvailableRouters(CHAIN_IDS.ARBITRUM);
      expect(Object.keys(arbitrumRouters).length).toBeGreaterThan(0);

      const optimismRouters = quoteService.getAvailableRouters(CHAIN_IDS.OPTIMISM);
      expect(Object.keys(optimismRouters).length).toBeGreaterThan(0);
    });

    it('should return empty object for unsupported chains', () => {
      const unsupportedRouters = quoteService.getAvailableRouters(999999);
      expect(Object.keys(unsupportedRouters).length).toBe(0);
    });
  });
});
