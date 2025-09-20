/**
 * Integration tests for quote fetchers
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ZeroXQuoteFetcher } from '../../services/quoteFetchers/zeroX.js';
import { OneInchQuoteFetcher } from '../../services/quoteFetchers/oneInch.js';
import { QuoteAggregator } from '../../services/quoteAggregator.js';
import { PriceService } from '../../services/priceService.js';
import { ChainId, RouterType } from '../../types/quote.js';

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('Quote Fetchers Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('ZeroX Quote Fetcher', () => {
    const config = {
      timeout: 5000,
      retries: 2,
      fallbackEnabled: true,
      priceBias: 0.02,
    };

    const routerConfig = {
      address: '0x3a23F943181408EAC424116Af7b7790c94Cb97a5',
      type: RouterType.ZEROX,
      chainId: ChainId.ETHEREUM,
      enabled: true,
      priority: 1,
      timeout: 5000,
      retries: 2,
    };

    it('should fetch quote successfully', async () => {
      const fetcher = new ZeroXQuoteFetcher(config, routerConfig);
      
      const mockResponse = {
        buyAmount: '2000000000000000000', // 2 ETH
        sellAmount: '1000000000000000000', // 1 ETH
        estimatedGas: '150000',
        gasPrice: '20000000000',
        priceImpact: '0.001',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const quote = await fetcher.fetchQuote({
        tokenIn: '0x0000000000000000000000000000000000000000',
        tokenOut: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amountIn: '1',
        chainId: ChainId.ETHEREUM,
        slippageTolerance: 0.5,
      });

      expect(quote).toBeTruthy();
      expect(quote?.amountIn).toBe('1');
      expect(quote?.amountOut).toBe('2');
      expect(quote?.routerType).toBe(RouterType.ZEROX);
    });

    it('should handle API errors gracefully', async () => {
      const fetcher = new ZeroXQuoteFetcher(config, routerConfig);
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      const quote = await fetcher.fetchQuote({
        tokenIn: '0x0000000000000000000000000000000000000000',
        tokenOut: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amountIn: '1',
        chainId: ChainId.ETHEREUM,
        slippageTolerance: 0.5,
      });

      expect(quote).toBeNull();
    });

    it('should normalize quote correctly', async () => {
      const fetcher = new ZeroXQuoteFetcher(config, routerConfig);
      
      const rawQuote = {
        router: '0x3a23F943181408EAC424116Af7b7790c94Cb97a5',
        routerType: RouterType.ZEROX,
        chainId: ChainId.ETHEREUM,
        tokenIn: '0x0000000000000000000000000000000000000000',
        tokenOut: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amountIn: '1',
        amountOut: '2',
        priceImpactBps: 10,
        gasEstimate: '150000',
        gasPrice: '20000000000',
        deadline: Math.floor(Date.now() / 1000) + 300,
        ttl: 300,
        rawData: {},
      };

      const priceData = [
        { token: '0x0000000000000000000000000000000000000000', priceUSD: '2000', timestamp: Date.now(), source: 'coingecko' },
        { token: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C', priceUSD: '1', timestamp: Date.now(), source: 'coingecko' },
      ];

      const gasPriceData = [
        { chainId: ChainId.ETHEREUM, gasPrice: '20000000000', timestamp: Date.now(), source: 'etherscan' },
      ];

      const normalizedQuote = await fetcher.normalizeQuote(rawQuote, priceData, gasPriceData);

      expect(normalizedQuote.amountIn).toBe('1');
      expect(normalizedQuote.amountOut).toBe('2');
      expect(normalizedQuote.gasUSD).toBeTruthy();
      expect(normalizedQuote.notionalUSD).toBeTruthy();
      expect(normalizedQuote.confidence).toBeGreaterThan(0);
    });
  });

  describe('1inch Quote Fetcher', () => {
    const config = {
      timeout: 5000,
      retries: 2,
      fallbackEnabled: true,
      priceBias: 0.02,
    };

    const routerConfig = {
      address: '0x1111111254EEB25477B68fb85Ed929f73A960582',
      type: RouterType.ONEINCH,
      chainId: ChainId.ETHEREUM,
      enabled: true,
      priority: 2,
      timeout: 5000,
      retries: 2,
    };

    it('should fetch quote successfully', async () => {
      const fetcher = new OneInchQuoteFetcher(config, routerConfig);
      
      const mockResponse = {
        toAmount: '2000000000000000000', // 2 ETH
        fromAmount: '1000000000000000000', // 1 ETH
        estimatedGas: '150000',
        gasPrice: '20000000000',
        protocols: [
          { name: 'UNISWAP_V3', part: '0.5', estimatedGas: '75000' },
          { name: 'CURVE', part: '0.5', estimatedGas: '75000' },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const quote = await fetcher.fetchQuote({
        tokenIn: '0x0000000000000000000000000000000000000000',
        tokenOut: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amountIn: '1',
        chainId: ChainId.ETHEREUM,
        slippageTolerance: 0.5,
      });

      expect(quote).toBeTruthy();
      expect(quote?.amountIn).toBe('1');
      expect(quote?.amountOut).toBe('2');
      expect(quote?.routerType).toBe(RouterType.ONEINCH);
    });

    it('should handle API errors gracefully', async () => {
      const fetcher = new OneInchQuoteFetcher(config, routerConfig);
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      const quote = await fetcher.fetchQuote({
        tokenIn: '0x0000000000000000000000000000000000000000',
        tokenOut: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amountIn: '1',
        chainId: ChainId.ETHEREUM,
        slippageTolerance: 0.5,
      });

      expect(quote).toBeNull();
    });
  });

  describe('Quote Aggregator', () => {
    const config = {
      timeout: 5000,
      retries: 2,
      fallbackEnabled: true,
      priceBias: 0.02,
    };

    it('should aggregate quotes from multiple fetchers', async () => {
      const aggregator = new QuoteAggregator(config);
      
      // Mock successful responses for both fetchers
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            buyAmount: '2000000000000000000',
            sellAmount: '1000000000000000000',
            estimatedGas: '150000',
            gasPrice: '20000000000',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            toAmount: '1950000000000000000',
            fromAmount: '1000000000000000000',
            estimatedGas: '140000',
            gasPrice: '20000000000',
            protocols: [{ name: 'UNISWAP_V3', part: '1.0', estimatedGas: '140000' }],
          }),
        });

      const result = await aggregator.fetchQuotes({
        tokenIn: '0x0000000000000000000000000000000000000000',
        tokenOut: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amountIn: '1',
        chainId: ChainId.ETHEREUM,
        slippageTolerance: 0.5,
      });

      expect(result.quotes.length).toBeGreaterThan(0);
      expect(result.processingTimeMs).toBeGreaterThan(0);
    });

    it('should handle fetcher failures gracefully', async () => {
      const aggregator = new QuoteAggregator(config);
      
      // Mock one successful and one failed response
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            buyAmount: '2000000000000000000',
            sellAmount: '1000000000000000000',
            estimatedGas: '150000',
            gasPrice: '20000000000',
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        });

      const result = await aggregator.fetchQuotes({
        tokenIn: '0x0000000000000000000000000000000000000000',
        tokenOut: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amountIn: '1',
        chainId: ChainId.ETHEREUM,
        slippageTolerance: 0.5,
      });

      expect(result.quotes.length).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should select the best quote', async () => {
      const aggregator = new QuoteAggregator(config);
      
      // Mock responses with different amounts
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            buyAmount: '2000000000000000000', // 2 ETH
            sellAmount: '1000000000000000000',
            estimatedGas: '150000',
            gasPrice: '20000000000',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            toAmount: '1950000000000000000', // 1.95 ETH (lower)
            fromAmount: '1000000000000000000',
            estimatedGas: '140000',
            gasPrice: '20000000000',
            protocols: [{ name: 'UNISWAP_V3', part: '1.0', estimatedGas: '140000' }],
          }),
        });

      const { bestQuote, rejectedQuotes } = await aggregator.getBestQuote({
        tokenIn: '0x0000000000000000000000000000000000000000',
        tokenOut: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amountIn: '1',
        chainId: ChainId.ETHEREUM,
        slippageTolerance: 0.5,
      });

      expect(bestQuote).toBeTruthy();
      expect(bestQuote?.amountOut).toBe('2'); // Should select the higher amount
      expect(rejectedQuotes.length).toBeGreaterThan(0);
    });
  });

  describe('Price Service', () => {
    it('should fetch token prices', async () => {
      const priceService = new PriceService();
      
      const mockResponse = {
        ethereum: { usd: 2000 },
        '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C': { usd: 1 },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const prices = await priceService.getTokenPrices(
        ['0x0000000000000000000000000000000000000000', '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C'],
        ChainId.ETHEREUM
      );

      expect(prices.length).toBe(2);
      expect(prices[0].priceUSD).toBe('2000');
      expect(prices[1].priceUSD).toBe('1');
    });

    it('should handle API errors with fallback prices', async () => {
      const priceService = new PriceService();
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      const prices = await priceService.getTokenPrices(
        ['0x0000000000000000000000000000000000000000'],
        ChainId.ETHEREUM
      );

      expect(prices.length).toBe(1);
      expect(prices[0].priceUSD).toBe('2000'); // Fallback price
      expect(prices[0].source).toBe('fallback');
    });
  });

  describe('Timeout and Fallback Paths', () => {
    it('should handle timeouts gracefully', async () => {
      const config = {
        timeout: 100, // Very short timeout
        retries: 1,
        fallbackEnabled: true,
        priceBias: 0.02,
      };

      const routerConfig = {
        address: '0x3a23F943181408EAC424116Af7b7790c94Cb97a5',
        type: RouterType.ZEROX,
        chainId: ChainId.ETHEREUM,
        enabled: true,
        priority: 1,
        timeout: 100,
        retries: 1,
      };

      const fetcher = new ZeroXQuoteFetcher(config, routerConfig);
      
      // Mock a slow response
      (global.fetch as any).mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({}),
        }), 200))
      );

      const quote = await fetcher.fetchQuote({
        tokenIn: '0x0000000000000000000000000000000000000000',
        tokenOut: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amountIn: '1',
        chainId: ChainId.ETHEREUM,
        slippageTolerance: 0.5,
      });

      expect(quote).toBeNull();
    });

    it('should retry on failure', async () => {
      const config = {
        timeout: 5000,
        retries: 2,
        fallbackEnabled: true,
        priceBias: 0.02,
      };

      const routerConfig = {
        address: '0x3a23F943181408EAC424116Af7b7790c94Cb97a5',
        type: RouterType.ZEROX,
        chainId: ChainId.ETHEREUM,
        enabled: true,
        priority: 1,
        timeout: 5000,
        retries: 2,
      };

      const fetcher = new ZeroXQuoteFetcher(config, routerConfig);
      
      // Mock first failure, then success
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            buyAmount: '2000000000000000000',
            sellAmount: '1000000000000000000',
            estimatedGas: '150000',
            gasPrice: '20000000000',
          }),
        });

      const quote = await fetcher.fetchQuote({
        tokenIn: '0x0000000000000000000000000000000000000000',
        tokenOut: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amountIn: '1',
        chainId: ChainId.ETHEREUM,
        slippageTolerance: 0.5,
      });

      expect(quote).toBeTruthy();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
