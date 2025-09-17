import { QuoteRequest, QuoteResponse, ROUTER_TYPES, CHAIN_IDS } from '../schemas/quote.js';

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
  
  public static getInstance(): QuoteService {
    if (!QuoteService.instance) {
      QuoteService.instance = new QuoteService();
    }
    return QuoteService.instance;
  }

  /**
   * Get the best quote by aggregating from multiple routers
   */
  async getBestQuote(request: QuoteRequest): Promise<QuoteResponse> {
    const startTime = Date.now();
    
    try {
      // Get available routers for the chain
      const availableRouters = ROUTER_ADDRESSES[request.chainId as keyof typeof ROUTER_ADDRESSES] || {};
      
      if (Object.keys(availableRouters).length === 0) {
        throw new Error(`No routers available for chain ${request.chainId}`);
      }

      // Fetch quotes from all available routers
      const quotePromises = Object.entries(availableRouters).map(([routerType, routerAddress]) =>
        this.fetchQuoteFromRouter(request, routerType as keyof typeof ROUTER_TYPES, routerAddress)
      );

      const results = await Promise.allSettled(quotePromises);
      
      const successfulQuotes: any[] = [];
      const rejectedRoutes: any[] = [];

      results.forEach((result, index) => {
        const routerType = Object.keys(availableRouters)[index] as keyof typeof ROUTER_TYPES;
        const routerAddress = Object.values(availableRouters)[index];

        if (result.status === 'fulfilled') {
          successfulQuotes.push(result.value);
        } else {
          rejectedRoutes.push({
            router: routerAddress,
            routerType,
            reason: result.reason?.message || 'Unknown error',
            errorCode: 'QUOTE_FAILED',
          });
        }
      });

      if (successfulQuotes.length === 0) {
        throw new Error('No successful quotes found');
      }

      // Find the best quote (highest expected output)
      const bestQuote = successfulQuotes.reduce((best, current) => 
        parseFloat(current.expectedOut) > parseFloat(best.expectedOut) ? current : best
      );

      // Calculate min received based on slippage tolerance
      const slippageMultiplier = (100 - request.slippageTolerance) / 100;
      const minReceived = (parseFloat(bestQuote.expectedOut) * slippageMultiplier).toString();

      const processingTime = Date.now() - startTime;

      return {
        bestRoute: {
          ...bestQuote,
          minReceived,
          deadline: request.deadline || Math.floor(Date.now() / 1000) + 1200, // 20 minutes default
          ttl: 120, // 2 minutes TTL
        },
        rejectedRoutes,
        totalRoutes: successfulQuotes.length + rejectedRoutes.length,
        processingTimeMs: processingTime,
      };

    } catch (error) {
      throw new Error(`Failed to get best quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch quote from a specific router (mock implementation)
   */
  private async fetchQuoteFromRouter(
    request: QuoteRequest,
    routerType: keyof typeof ROUTER_TYPES,
    routerAddress: string
  ): Promise<{
    router: string;
    routerType: keyof typeof ROUTER_TYPES;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    expectedOut: string;
    priceImpactBps: number;
    gasEstimate: string;
    gasPrice: string;
    deadline: number;
  }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));

    // Mock quote calculation based on router type
    const amountInFloat = parseFloat(request.amountIn);
    let expectedOut: number;
    let priceImpactBps: number;

    switch (routerType) {
      case ROUTER_TYPES.UNISWAP_V3:
        // Simulate Uniswap V3 with better rates
        expectedOut = amountInFloat * 2000 * (0.98 + Math.random() * 0.04); // 2000x multiplier with 2-6% variation
        priceImpactBps = Math.floor(Math.random() * 50); // 0-50 bps price impact
        break;
      case ROUTER_TYPES.UNISWAP_V2:
        // Simulate Uniswap V2 with slightly worse rates
        expectedOut = amountInFloat * 2000 * (0.96 + Math.random() * 0.03); // 2000x multiplier with 1-4% variation
        priceImpactBps = Math.floor(Math.random() * 100); // 0-100 bps price impact
        break;
      case ROUTER_TYPES.SUSHISWAP:
        // Simulate SushiSwap with competitive rates
        expectedOut = amountInFloat * 2000 * (0.97 + Math.random() * 0.04); // 2000x multiplier with 1-5% variation
        priceImpactBps = Math.floor(Math.random() * 80); // 0-80 bps price impact
        break;
      default:
        // Default simulation
        expectedOut = amountInFloat * 2000 * (0.95 + Math.random() * 0.05);
        priceImpactBps = Math.floor(Math.random() * 150);
    }

    // Simulate occasional failures (10% chance)
    if (Math.random() < 0.1) {
      throw new Error(`Router ${routerType} temporarily unavailable`);
    }

    // Simulate liquidity issues (5% chance)
    if (Math.random() < 0.05) {
      throw new Error(`Insufficient liquidity on ${routerType}`);
    }

    return {
      router: routerAddress,
      routerType,
      tokenIn: request.tokenIn,
      tokenOut: request.tokenOut,
      amountIn: request.amountIn,
      expectedOut: expectedOut.toString(),
      priceImpactBps,
      gasEstimate: (21000 + Math.floor(Math.random() * 50000)).toString(), // 21k-71k gas
      gasPrice: (20 + Math.floor(Math.random() * 30)).toString(), // 20-50 gwei
      deadline: request.deadline || Math.floor(Date.now() / 1000) + 1200,
    };
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
