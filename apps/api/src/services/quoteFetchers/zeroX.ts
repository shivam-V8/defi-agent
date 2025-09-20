/**
 * 0x Protocol quote fetcher
 */

import { BaseQuoteFetcher } from './base.js';
import { NormalizedQuote, RawQuote, PriceData, GasPriceData, RouterType, ChainId } from '../../types/quote.js';

export class ZeroXQuoteFetcher extends BaseQuoteFetcher {
  private readonly baseUrl: string;

  constructor(config: any, routerConfig: any) {
    super(config, routerConfig);
    
    // 0x API base URLs by chain
    const baseUrls: Record<number, string> = {
      [ChainId.ETHEREUM]: 'https://api.0x.org',
      [ChainId.ARBITRUM]: 'https://arbitrum.api.0x.org',
      [ChainId.OPTIMISM]: 'https://optimism.api.0x.org',
      [ChainId.POLYGON]: 'https://polygon.api.0x.org',
      [ChainId.BASE]: 'https://base.api.0x.org',
    };

    this.baseUrl = baseUrls[routerConfig.chainId] || 'https://api.0x.org';
  }

  async fetchQuote(params: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    chainId: number;
    slippageTolerance: number;
  }): Promise<RawQuote | null> {
    const validation = this.validateParams(params);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    try {
      // Convert amount to wei (assuming 18 decimals)
      const amountInWei = (BigInt(Math.floor(parseFloat(params.amountIn) * 1e18))).toString();
      
      // Build 0x API URL
      const url = new URL('/swap/v1/quote', this.baseUrl);
      url.searchParams.set('sellToken', params.tokenIn);
      url.searchParams.set('buyToken', params.tokenOut);
      url.searchParams.set('sellAmount', amountInWei);
      url.searchParams.set('slippagePercentage', (params.slippageTolerance / 100).toString());
      url.searchParams.set('skipValidation', 'true'); // Skip validation for faster response

      const response = await this.makeRequest(url.toString());
      const data = await response.json();

      if (!data.buyAmount || !data.sellAmount) {
        return null;
      }

      // Convert amounts back from wei
      const amountOut = (BigInt(data.buyAmount) / BigInt(1e18)).toString();
      const amountIn = (BigInt(data.sellAmount) / BigInt(1e18)).toString();

      return {
        router: this.routerConfig.address,
        routerType: RouterType.ZEROX,
        chainId: params.chainId as ChainId,
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn,
        amountOut,
        priceImpactBps: this.calculatePriceImpact(data),
        gasEstimate: data.estimatedGas || '200000',
        gasPrice: data.gasPrice || '20000000000',
        deadline: Math.floor(Date.now() / 1000) + 300, // 5 minutes
        ttl: 300,
        rawData: data,
      };
    } catch (error) {
      console.error('0x quote fetch error:', error);
      return null;
    }
  }

  async normalizeQuote(rawQuote: RawQuote, priceData: PriceData[], gasPriceData: GasPriceData[]): Promise<NormalizedQuote> {
    const tokenInPrice = this.getTokenPrice(rawQuote.tokenIn, priceData);
    const tokenOutPrice = this.getTokenPrice(rawQuote.tokenOut, priceData);
    const gasPrice = this.getGasPrice(rawQuote.chainId, gasPriceData);
    
    // Calculate effective price (amountOut / amountIn)
    const effectivePrice = (BigInt(rawQuote.amountOut) * BigInt(1000000)) / BigInt(rawQuote.amountIn);
    
    // Calculate gas USD (using ETH price for gas)
    const ethPrice = this.getTokenPrice('0x0000000000000000000000000000000000000000', priceData) || '2000';
    const gasUSD = this.calculateGasUSD(rawQuote.gasEstimate || '200000', gasPrice, ethPrice);
    
    // Calculate notional USD (using token in price)
    const notionalUSD = this.calculateNotionalUSD(rawQuote.amountIn, tokenInPrice);
    
    const normalizedQuote: NormalizedQuote = {
      router: rawQuote.router,
      routerType: rawQuote.routerType,
      chainId: rawQuote.chainId,
      tokenIn: rawQuote.tokenIn,
      tokenOut: rawQuote.tokenOut,
      amountIn: rawQuote.amountIn,
      amountOut: rawQuote.amountOut,
      priceImpactBps: rawQuote.priceImpactBps || 0,
      effectivePrice: effectivePrice.toString(),
      gasEstimate: rawQuote.gasEstimate || '200000',
      gasPrice,
      gasUSD,
      notionalUSD,
      deadline: rawQuote.deadline || Math.floor(Date.now() / 1000) + 300,
      ttl: rawQuote.ttl || 300,
      timestamp: Date.now(),
      source: '0x',
      confidence: this.calculateConfidence(rawQuote),
    };

    return this.applyPriceBias(normalizedQuote);
  }

  async isHealthy(): Promise<boolean> {
    try {
      const url = new URL('/swap/v1/quote', this.baseUrl);
      url.searchParams.set('sellToken', '0x0000000000000000000000000000000000000000');
      url.searchParams.set('buyToken', '0x0000000000000000000000000000000000000000');
      url.searchParams.set('sellAmount', '1000000000000000000'); // 1 ETH
      url.searchParams.set('slippagePercentage', '0.01');

      const response = await this.makeRequest(url.toString());
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private calculatePriceImpact(data: any): number {
    // 0x doesn't always provide price impact, so we calculate it
    if (data.priceImpact) {
      return Math.floor(parseFloat(data.priceImpact) * 10000); // Convert to basis points
    }

    // Estimate based on gas cost relative to trade size
    if (data.estimatedGas && data.gasPrice && data.sellAmount) {
      const gasCost = BigInt(data.estimatedGas) * BigInt(data.gasPrice);
      const tradeValue = BigInt(data.sellAmount);
      const gasImpact = (Number(gasCost) / Number(tradeValue)) * 10000;
      return Math.min(Math.floor(gasImpact), 1000); // Cap at 10%
    }

    return 0;
  }

  private calculateConfidence(rawQuote: RawQuote): number {
    let confidence = 0.8; // Base confidence for 0x

    // Reduce confidence if no gas estimate
    if (!rawQuote.gasEstimate) {
      confidence -= 0.1;
    }

    // Reduce confidence if high price impact
    if (rawQuote.priceImpactBps && rawQuote.priceImpactBps > 500) {
      confidence -= 0.2;
    }

    // Reduce confidence if very small trade
    if (parseFloat(rawQuote.amountIn) < 0.001) {
      confidence -= 0.1;
    }

    return Math.max(confidence, 0.1);
  }
}
