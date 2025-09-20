import { QuoteRequest, QuoteResponse, ROUTER_TYPES, CHAIN_IDS } from '../schemas/quote.js';
import { QuoteAggregator } from './quoteAggregator.js';
import { QuoteFetcherConfig } from '../types/quote.js';

// Router addresses matching the deployed PolicyConfig contract
const ROUTER_ADDRESSES = {
  [CHAIN_IDS.ETHEREUM]: {
    [ROUTER_TYPES.UNISWAP_V3]: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    [ROUTER_TYPES.ONEINCH]: '0x1111111254EEB25477B68fb85Ed929f73A960582',
    [ROUTER_TYPES.SUSHISWAP]: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
    [ROUTER_TYPES.CURVE]: '0x8301AE4fc9c624d1D396cbDAa1ed877821D7C511',
  },
  [CHAIN_IDS.ARBITRUM]: {
    [ROUTER_TYPES.UNISWAP_V3]: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    [ROUTER_TYPES.ONEINCH]: '0x1111111254EEB25477B68fb85Ed929f73A960582',
    [ROUTER_TYPES.SUSHISWAP]: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  },
  [CHAIN_IDS.OPTIMISM]: {
    [ROUTER_TYPES.UNISWAP_V3]: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    [ROUTER_TYPES.ONEINCH]: '0x1111111254EEB25477B68fb85Ed929f73A960582',
    [ROUTER_TYPES.SUSHISWAP]: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  },
};

// Mock token metadata
const TOKEN_METADATA = {
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': { symbol: 'WETH', decimals: 18, name: 'Wrapped Ether' },
  '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C': { symbol: 'USDC', decimals: 6, name: 'USD Coin' },
  '0x3845badAde8e6dDD04FcF80A4423B8B1C292c9bA': { symbol: 'SAND', decimals: 18, name: 'Sandbox' },
  '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F': { symbol: 'SNX', decimals: 18, name: 'Synthetix' },
};

export class QuoteService {
  private static instance: QuoteService;
  private aggregator: QuoteAggregator;
  
  public static getInstance(): QuoteService {
    if (!QuoteService.instance) {
      QuoteService.instance = new QuoteService();
    }
    return QuoteService.instance;
  }

  private constructor() {
    // Initialize quote aggregator with conservative settings
    const config: QuoteFetcherConfig = {
      timeout: 5000, // 5 second timeout
      retries: 2,
      fallbackEnabled: true,
      priceBias: 0.02, // 2% conservative price bias
    };
    
    this.aggregator = new QuoteAggregator(config);
  }

  /**
   * Get the best quote by aggregating from multiple routers with policy evaluation
   */
  async getBestQuote(request: QuoteRequest): Promise<QuoteResponse> {
    const startTime = Date.now();
    
    try {
      // Use the quote aggregator to fetch quotes from all available routers
      const { bestQuote, rejectedQuotes, policyEvaluation } = await this.aggregator.getBestQuote({
        tokenIn: request.tokenIn,
        tokenOut: request.tokenOut,
        amountIn: request.amountIn,
        chainId: request.chainId,
        slippageTolerance: request.slippageTolerance,
        userAddress: request.userAddress, // Add user address for policy evaluation
      });

      if (!bestQuote) {
        throw new Error('No successful quotes found');
      }

      // Calculate min received based on slippage tolerance
      const slippageMultiplier = (100 - request.slippageTolerance) / 100;
      const minReceived = (parseFloat(bestQuote.amountOut) * slippageMultiplier).toString();

      const processingTime = Date.now() - startTime;

      return {
        bestRoute: {
          router: bestQuote.router,
          routerType: bestQuote.routerType as any,
          tokenIn: bestQuote.tokenIn,
          tokenOut: bestQuote.tokenOut,
          amountIn: bestQuote.amountIn,
          expectedOut: bestQuote.amountOut,
          minReceived,
          priceImpactBps: bestQuote.priceImpactBps,
          gasEstimate: bestQuote.gasEstimate,
          gasPrice: bestQuote.gasPrice,
          deadline: request.deadline || bestQuote.deadline,
          ttl: bestQuote.ttl,
        },
        rejectedRoutes: rejectedQuotes,
        totalRoutes: rejectedQuotes.length + 1, // +1 for the best quote
        processingTimeMs: processingTime,
        // Add policy evaluation information
        policyEvaluation: policyEvaluation ? {
          passed: policyEvaluation.passed,
          score: policyEvaluation.score,
          netUSD: policyEvaluation.netUSD,
          violations: policyEvaluation.violations,
          warnings: policyEvaluation.warnings,
        } : undefined,
      };

    } catch (error) {
      throw new Error(`Failed to get best quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check health of all quote fetchers
   */
  async checkHealth(): Promise<Record<string, boolean>> {
    return await this.aggregator.checkHealth();
  }

  /**
   * Get token metadata
   */
  getTokenMetadata(tokenAddress: string) {
    return TOKEN_METADATA[tokenAddress as keyof typeof TOKEN_METADATA] || null;
  }

  /**
   * Get available routers for a chain
   */
  getAvailableRouters(chainId: number) {
    return ROUTER_ADDRESSES[chainId as keyof typeof ROUTER_ADDRESSES] || {};
  }
}
