/**
 * Quote aggregator service that coordinates multiple quote fetchers
 */

import { ZeroXQuoteFetcher } from './quoteFetchers/zeroX.js';
import { OneInchQuoteFetcher } from './quoteFetchers/oneInch.js';
import { PriceService } from './priceService.js';
import { QuoteScorer } from './quoteScorer.js';
import { 
  NormalizedQuote, 
  QuoteFetcherResult, 
  QuoteFetcherConfig, 
  RouterConfig, 
  ChainId, 
  RouterType 
} from '../types/quote.js';
import { PolicyEvaluationContext, QuoteScore } from '../types/policy.js';

export class QuoteAggregator {
  private fetchers: Map<string, any> = new Map();
  private priceService: PriceService;
  private quoteScorer: QuoteScorer;
  private config: QuoteFetcherConfig;

  constructor(config: QuoteFetcherConfig) {
    this.config = config;
    this.priceService = new PriceService();
    this.quoteScorer = new QuoteScorer();
    this.initializeFetchers();
  }

  /**
   * Fetch quotes from all available routers
   */
  async fetchQuotes(params: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    chainId: number;
    slippageTolerance: number;
  }): Promise<QuoteFetcherResult> {
    const startTime = Date.now();
    const quotes: NormalizedQuote[] = [];
    const errors: Array<{ router: string; routerType: RouterType; error: string; timestamp: number }> = [];

    // Get price data for USD calculations
    const [priceData, gasPriceData] = await Promise.all([
      this.priceService.getTokenPrices([params.tokenIn, params.tokenOut], params.chainId as ChainId),
      this.priceService.getGasPrices([params.chainId as ChainId]),
    ]);

    // Fetch quotes from all fetchers in parallel
    const fetcherPromises = Array.from(this.fetchers.entries()).map(async ([key, fetcher]) => {
      try {
        const rawQuote = await fetcher.fetchQuote(params);
        if (rawQuote) {
          const normalizedQuote = await fetcher.normalizeQuote(rawQuote, priceData, gasPriceData);
          return { success: true, quote: normalizedQuote, router: key };
        } else {
          return { success: false, error: 'No quote returned', router: key };
        }
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error', 
          router: key 
        };
      }
    });

    const results = await Promise.allSettled(fetcherPromises);

    // Process results
    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          quotes.push(result.value.quote);
        } else {
        const fetcher = this.fetchers.get(result.value.router);
        errors.push({
          router: result.value.router,
          routerType: fetcher?.routerConfig?.type || RouterType.UNISWAP_V3,
          error: result.value.error || 'Unknown error',
          timestamp: Date.now(),
        });
        }
      } else {
        errors.push({
          router: 'unknown',
          routerType: RouterType.UNISWAP_V3,
          error: result.reason?.message || 'Promise rejected',
          timestamp: Date.now(),
        });
      }
    }

    // Sort quotes by best value (highest amount out, lowest gas cost)
    quotes.sort((a, b) => {
      const aValue = parseFloat(a.amountOut) - parseFloat(a.gasUSD);
      const bValue = parseFloat(b.amountOut) - parseFloat(b.gasUSD);
      return bValue - aValue;
    });

    return {
      quotes,
      errors,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Get the best quote from all available routers with policy evaluation
   */
  async getBestQuote(params: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    chainId: number;
    slippageTolerance: number;
    userAddress?: string;
  }): Promise<{ 
    bestQuote: NormalizedQuote | null; 
    rejectedQuotes: any[];
    policyEvaluation?: {
      passed: boolean;
      violations: any[];
      warnings: any[];
      score: number;
      netUSD: string;
    };
  }> {
    const result = await this.fetchQuotes(params);
    
    if (result.quotes.length === 0) {
      return { bestQuote: null, rejectedQuotes: result.errors };
    }

    // Create policy evaluation context
    const context: PolicyEvaluationContext = {
      chainId: params.chainId as ChainId,
      userAddress: params.userAddress,
      timestamp: Date.now(),
      marketConditions: {
        volatility: 0.1, // Default volatility
        liquidity: 1000000, // Default liquidity
        gasPrice: '20000000000', // Default gas price
      },
    };

    // Score and rank quotes with policy evaluation
    const { rankedQuotes, bestQuote, rejectedQuotes } = await this.quoteScorer.scoreAndRankQuotes(
      result.quotes, 
      context
    );

    // Add fetch errors to rejected quotes
    const allRejectedQuotes = [
      ...rejectedQuotes.map(rq => ({
        router: rq.quote.router,
        routerType: rq.quote.routerType,
        reason: rq.reason,
        errorCode: 'POLICY_VIOLATION',
        violations: rq.violations,
      })),
      ...result.errors.map(e => ({
        router: e.router,
        routerType: e.routerType,
        reason: e.error,
        errorCode: 'FETCH_ERROR',
      })),
    ];

    // Get policy evaluation for best quote if available
    let policyEvaluation;
    if (bestQuote) {
      policyEvaluation = {
        passed: bestQuote.passed,
        violations: bestQuote.violations,
        warnings: bestQuote.warnings,
        score: bestQuote.score,
        netUSD: bestQuote.netUSD,
      };
    }

    return { 
      bestQuote: bestQuote?.quote || null, 
      rejectedQuotes: allRejectedQuotes,
      policyEvaluation,
    };
  }

  /**
   * Get the best quote from all available routers (legacy method)
   */
  async getBestQuoteLegacy(params: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    chainId: number;
    slippageTolerance: number;
  }): Promise<{ bestQuote: NormalizedQuote | null; rejectedQuotes: any[] }> {
    const result = await this.fetchQuotes(params);
    
    if (result.quotes.length === 0) {
      return { bestQuote: null, rejectedQuotes: result.errors };
    }

    // Select best quote based on multiple criteria
    const bestQuote = this.selectBestQuote(result.quotes);
    
    // Create rejected quotes list
    const rejectedQuotes = [
      ...result.quotes.filter(q => q.router !== bestQuote.router).map(q => ({
        router: q.router,
        routerType: q.routerType,
        reason: 'Not the best quote',
        errorCode: 'NOT_BEST',
      })),
      ...result.errors.map(e => ({
        router: e.router,
        routerType: e.routerType,
        reason: e.error,
        errorCode: 'FETCH_ERROR',
      })),
    ];

    return { bestQuote, rejectedQuotes };
  }

  /**
   * Check health of all fetchers
   */
  async checkHealth(): Promise<Record<string, boolean>> {
    const healthChecks = Array.from(this.fetchers.entries()).map(async ([key, fetcher]) => {
      try {
        const isHealthy = await fetcher.isHealthy();
        return [key, isHealthy];
      } catch (error) {
        return [key, false];
      }
    });

    const results = await Promise.allSettled(healthChecks);
    const health: Record<string, boolean> = {};

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const [key, isHealthy] = result.value;
        health[key] = isHealthy;
      }
    }

    return health;
  }

  private initializeFetchers(): void {
    // Router configurations for different chains
    const routerConfigs: RouterConfig[] = [
      // Ethereum
      {
        address: '0x3a23F943181408EAC424116Af7b7790c94Cb97a5', // 0x Exchange Proxy
        type: RouterType.ZEROX,
        chainId: ChainId.ETHEREUM,
        enabled: true,
        priority: 1,
        timeout: 5000,
        retries: 2,
      },
      {
        address: '0x1111111254EEB25477B68fb85Ed929f73A960582', // 1inch Router
        type: RouterType.ONEINCH,
        chainId: ChainId.ETHEREUM,
        enabled: true,
        priority: 2,
        timeout: 5000,
        retries: 2,
      },
      // Arbitrum
      {
        address: '0x3a23F943181408EAC424116Af7b7790c94Cb97a5', // 0x Exchange Proxy
        type: RouterType.ZEROX,
        chainId: ChainId.ARBITRUM,
        enabled: true,
        priority: 1,
        timeout: 5000,
        retries: 2,
      },
      {
        address: '0x1111111254EEB25477B68fb85Ed929f73A960582', // 1inch Router
        type: RouterType.ONEINCH,
        chainId: ChainId.ARBITRUM,
        enabled: true,
        priority: 2,
        timeout: 5000,
        retries: 2,
      },
      // Optimism
      {
        address: '0x3a23F943181408EAC424116Af7b7790c94Cb97a5', // 0x Exchange Proxy
        type: RouterType.ZEROX,
        chainId: ChainId.OPTIMISM,
        enabled: true,
        priority: 1,
        timeout: 5000,
        retries: 2,
      },
      {
        address: '0x1111111254EEB25477B68fb85Ed929f73A960582', // 1inch Router
        type: RouterType.ONEINCH,
        chainId: ChainId.OPTIMISM,
        enabled: true,
        priority: 2,
        timeout: 5000,
        retries: 2,
      },
      // Local Testnet
      {
        address: '0x3a23F943181408EAC424116Af7b7790c94Cb97a5', // Mock 0x Exchange Proxy
        type: RouterType.ZEROX,
        chainId: ChainId.LOCAL_TESTNET,
        enabled: true,
        priority: 1,
        timeout: 5000,
        retries: 2,
      },
      {
        address: '0x1111111254EEB25477B68fb85Ed929f73A960582', // Mock 1inch Router
        type: RouterType.ONEINCH,
        chainId: ChainId.LOCAL_TESTNET,
        enabled: true,
        priority: 2,
        timeout: 5000,
        retries: 2,
      },
    ];

    // Initialize fetchers for enabled routers
    for (const routerConfig of routerConfigs) {
      if (!routerConfig.enabled) continue;

      const key = `${routerConfig.type}_${routerConfig.chainId}`;
      
      try {
        let fetcher;
        
        switch (routerConfig.type) {
          case RouterType.ZEROX:
            fetcher = new ZeroXQuoteFetcher(this.config, routerConfig);
            break;
          case RouterType.ONEINCH:
            fetcher = new OneInchQuoteFetcher(this.config, routerConfig);
            break;
          default:
            console.warn(`Unsupported router type: ${routerConfig.type}`);
            continue;
        }

        this.fetchers.set(key, fetcher);
        console.log(`Initialized ${routerConfig.type} fetcher for chain ${routerConfig.chainId}`);
      } catch (error) {
        console.error(`Failed to initialize ${routerConfig.type} fetcher for chain ${routerConfig.chainId}:`, error);
      }
    }
  }

  private selectBestQuote(quotes: NormalizedQuote[]): NormalizedQuote {
    if (quotes.length === 1) {
      return quotes[0];
    }

    // Score quotes based on multiple factors
    const scoredQuotes = quotes.map(quote => {
      const amountOut = parseFloat(quote.amountOut);
      const gasUSD = parseFloat(quote.gasUSD);
      const priceImpact = quote.priceImpactBps / 10000; // Convert to decimal
      const confidence = quote.confidence;

      // Calculate net value (amount out minus gas cost)
      const netValue = amountOut - gasUSD;

      // Score based on:
      // 1. Net value (70% weight)
      // 2. Low price impact (20% weight)
      // 3. High confidence (10% weight)
      const score = (netValue * 0.7) + ((1 - priceImpact) * 0.2) + (confidence * 0.1);

      return { quote, score };
    });

    // Sort by score and return the best
    scoredQuotes.sort((a, b) => b.score - a.score);
    return scoredQuotes[0].quote;
  }
}
