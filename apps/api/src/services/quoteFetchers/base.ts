/**
 * Base quote fetcher interface and utilities
 */

import { NormalizedQuote, RawQuote, QuoteFetcherConfig, RouterConfig, PriceData, GasPriceData } from '../../types/quote.js';

export abstract class BaseQuoteFetcher {
  protected config: QuoteFetcherConfig;
  protected routerConfig: RouterConfig;

  constructor(config: QuoteFetcherConfig, routerConfig: RouterConfig) {
    this.config = config;
    this.routerConfig = routerConfig;
  }

  /**
   * Fetch quote from the router
   */
  abstract fetchQuote(params: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    chainId: number;
    slippageTolerance: number;
  }): Promise<RawQuote | null>;

  /**
   * Normalize raw quote to standard format
   */
  abstract normalizeQuote(rawQuote: RawQuote, priceData: PriceData[], gasPriceData: GasPriceData[]): Promise<NormalizedQuote>;

  /**
   * Check if router is available and responsive
   */
  abstract isHealthy(): Promise<boolean>;

  /**
   * Get router-specific timeout
   */
  protected getTimeout(): number {
    return this.routerConfig.timeout || this.config.timeout;
  }

  /**
   * Get router-specific retry count
   */
  protected getRetries(): number {
    return this.routerConfig.retries || this.config.retries;
  }

  /**
   * Apply conservative price bias to quote
   */
  protected applyPriceBias(quote: NormalizedQuote): NormalizedQuote {
    if (this.config.priceBias <= 0) {
      return quote;
    }

    // Reduce amount out by price bias percentage
    const biasMultiplier = 1 - this.config.priceBias;
    const biasedAmountOut = (BigInt(quote.amountOut) * BigInt(Math.floor(biasMultiplier * 10000))) / BigInt(10000);
    
    // Recalculate effective price
    const biasedEffectivePrice = (BigInt(quote.amountOut) * BigInt(1000000)) / BigInt(quote.amountIn);
    
    return {
      ...quote,
      amountOut: biasedAmountOut.toString(),
      effectivePrice: biasedEffectivePrice.toString(),
      confidence: quote.confidence * biasMultiplier,
    };
  }

  /**
   * Calculate gas cost in USD
   */
  protected calculateGasUSD(gasEstimate: string, gasPrice: string, ethPriceUSD: string): string {
    const gasCostWei = BigInt(gasEstimate) * BigInt(gasPrice);
    const gasCostETH = Number(gasCostWei) / 1e18;
    const gasCostUSD = gasCostETH * parseFloat(ethPriceUSD);
    return gasCostUSD.toFixed(6);
  }

  /**
   * Calculate notional value in USD
   */
  protected calculateNotionalUSD(amount: string, tokenPriceUSD: string, decimals: number = 18): string {
    const amountFloat = parseFloat(amount) / Math.pow(10, decimals);
    const notionalUSD = amountFloat * parseFloat(tokenPriceUSD);
    return notionalUSD.toFixed(6);
  }

  /**
   * Get token price from price data
   */
  protected getTokenPrice(tokenAddress: string, priceData: PriceData[]): string {
    const price = priceData.find(p => p.token.toLowerCase() === tokenAddress.toLowerCase());
    return price?.priceUSD || '0';
  }

  /**
   * Get gas price for chain
   */
  protected getGasPrice(chainId: number, gasPriceData: GasPriceData[]): string {
    const gasPrice = gasPriceData.find(g => g.chainId === chainId);
    return gasPrice?.gasPrice || '20000000000'; // 20 gwei default
  }

  /**
   * Validate quote parameters
   */
  protected validateParams(params: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    chainId: number;
    slippageTolerance: number;
  }): { isValid: boolean; error?: string } {
    if (!params.tokenIn || !params.tokenOut) {
      return { isValid: false, error: 'Token addresses are required' };
    }

    if (params.tokenIn.toLowerCase() === params.tokenOut.toLowerCase()) {
      return { isValid: false, error: 'Token in and token out cannot be the same' };
    }

    if (!params.amountIn || parseFloat(params.amountIn) <= 0) {
      return { isValid: false, error: 'Amount in must be positive' };
    }

    if (params.chainId !== this.routerConfig.chainId) {
      return { isValid: false, error: 'Chain ID mismatch' };
    }

    if (params.slippageTolerance < 0 || params.slippageTolerance > 50) {
      return { isValid: false, error: 'Slippage tolerance must be between 0 and 50%' };
    }

    return { isValid: true };
  }

  /**
   * Make HTTP request with timeout and retries
   */
  protected async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const timeout = this.getTimeout();
    const retries = this.getRetries();

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Max retries exceeded');
  }
}
