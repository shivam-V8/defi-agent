/**
 * 1inch quote fetcher
 */

import { BaseQuoteFetcher } from './base.js';
import { NormalizedQuote, RawQuote, PriceData, GasPriceData, RouterType, ChainId } from '../../types/quote.js';

export class OneInchQuoteFetcher extends BaseQuoteFetcher {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: any, routerConfig: any) {
    super(config, routerConfig);
    
    // 1inch API base URLs by chain
    const baseUrls: Record<number, string> = {
      [ChainId.ETHEREUM]: 'https://api.1inch.io/v5.0/1',
      [ChainId.ARBITRUM]: 'https://api.1inch.io/v5.0/42161',
      [ChainId.OPTIMISM]: 'https://api.1inch.io/v5.0/10',
      [ChainId.POLYGON]: 'https://api.1inch.io/v5.0/137',
      [ChainId.BASE]: 'https://api.1inch.io/v5.0/8453',
    };

    this.baseUrl = baseUrls[routerConfig.chainId] || 'https://api.1inch.io/v5.0/1';
    this.apiKey = process.env.ONEINCH_API_KEY || '';
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
      
      // Build 1inch API URL
      const url = new URL('/quote', this.baseUrl);
      url.searchParams.set('fromTokenAddress', params.tokenIn);
      url.searchParams.set('toTokenAddress', params.tokenOut);
      url.searchParams.set('amount', amountInWei);
      url.searchParams.set('slippage', params.slippageTolerance.toString());
      
      if (this.apiKey) {
        url.searchParams.set('apiKey', this.apiKey);
      }

      const response = await this.makeRequest(url.toString());
      const data = await response.json();

      if (!data.toAmount || !data.fromAmount) {
        return null;
      }

      // Convert amounts back from wei
      const amountOut = (BigInt(data.toAmount) / BigInt(1e18)).toString();
      const amountIn = (BigInt(data.fromAmount) / BigInt(1e18)).toString();

      return {
        router: this.routerConfig.address,
        routerType: RouterType.ONEINCH,
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
      console.error('1inch quote fetch error:', error);
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
      source: '1inch',
      confidence: this.calculateConfidence(rawQuote),
    };

    return this.applyPriceBias(normalizedQuote);
  }

  async isHealthy(): Promise<boolean> {
    try {
      const url = new URL('/quote', this.baseUrl);
      url.searchParams.set('fromTokenAddress', '0x0000000000000000000000000000000000000000');
      url.searchParams.set('toTokenAddress', '0x0000000000000000000000000000000000000000');
      url.searchParams.set('amount', '1000000000000000000'); // 1 ETH
      url.searchParams.set('slippage', '0.1');

      if (this.apiKey) {
        url.searchParams.set('apiKey', this.apiKey);
      }

      const response = await this.makeRequest(url.toString());
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private calculatePriceImpact(data: any): number {
    // 1inch provides price impact in the response
    if (data.protocols && data.protocols.length > 0) {
      // Calculate weighted average price impact across protocols
      let totalImpact = 0;
      let totalWeight = 0;

      for (const protocol of data.protocols) {
        if (protocol.part && protocol.estimatedGas) {
          const weight = parseFloat(protocol.part);
          const impact = this.estimateProtocolImpact(protocol);
          totalImpact += impact * weight;
          totalWeight += weight;
        }
      }

      if (totalWeight > 0) {
        return Math.floor((totalImpact / totalWeight) * 10000); // Convert to basis points
      }
    }

    // Fallback: estimate based on gas cost
    if (data.estimatedGas && data.gasPrice && data.fromAmount) {
      const gasCost = BigInt(data.estimatedGas) * BigInt(data.gasPrice);
      const tradeValue = BigInt(data.fromAmount);
      const gasImpact = (Number(gasCost) / Number(tradeValue)) * 10000;
      return Math.min(Math.floor(gasImpact), 1000); // Cap at 10%
    }

    return 0;
  }

  private estimateProtocolImpact(protocol: any): number {
    // Estimate price impact based on protocol type and liquidity
    const protocolName = protocol.name?.toLowerCase() || '';
    
    // Different protocols have different typical price impacts
    if (protocolName.includes('uniswap')) {
      return 0.1; // 0.1% typical for Uniswap
    } else if (protocolName.includes('curve')) {
      return 0.05; // 0.05% typical for Curve
    } else if (protocolName.includes('balancer')) {
      return 0.15; // 0.15% typical for Balancer
    } else {
      return 0.2; // 0.2% default
    }
  }

  private calculateConfidence(rawQuote: RawQuote): number {
    let confidence = 0.85; // Base confidence for 1inch

    // Increase confidence if multiple protocols are used
    if (rawQuote.rawData?.protocols && rawQuote.rawData.protocols.length > 1) {
      confidence += 0.1;
    }

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
