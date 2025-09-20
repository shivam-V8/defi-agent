/**
 * Price service for fetching token prices and gas prices
 */

import { PriceData, GasPriceData, ChainId } from '../types/quote.js';

export class PriceService {
  private readonly coingeckoApiKey: string;
  private readonly cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly cacheTtl = 60000; // 1 minute cache

  constructor() {
    this.coingeckoApiKey = process.env.COINGECKO_API_KEY || '';
  }

  /**
   * Get token prices for multiple tokens
   */
  async getTokenPrices(tokens: string[], chainId: ChainId): Promise<PriceData[]> {
    const cacheKey = `prices_${chainId}_${tokens.join(',')}`;
    const cached = this.getCached(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const prices = await this.fetchTokenPrices(tokens, chainId);
      this.setCache(cacheKey, prices);
      return prices;
    } catch (error) {
      console.error('Error fetching token prices:', error);
      return this.getFallbackPrices(tokens);
    }
  }

  /**
   * Get gas prices for multiple chains
   */
  async getGasPrices(chainIds: ChainId[]): Promise<GasPriceData[]> {
    const cacheKey = `gas_${chainIds.join(',')}`;
    const cached = this.getCached(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const gasPrices = await this.fetchGasPrices(chainIds);
      this.setCache(cacheKey, gasPrices);
      return gasPrices;
    } catch (error) {
      console.error('Error fetching gas prices:', error);
      return this.getFallbackGasPrices(chainIds);
    }
  }

  /**
   * Get ETH price in USD
   */
  async getETHPrice(): Promise<string> {
    const prices = await this.getTokenPrices(['0x0000000000000000000000000000000000000000'], ChainId.ETHEREUM);
    return prices[0]?.priceUSD || '2000';
  }

  private async fetchTokenPrices(tokens: string[], chainId: ChainId): Promise<PriceData[]> {
    // Map chain IDs to CoinGecko platform IDs
    const platformMap: Record<ChainId, string> = {
      [ChainId.ETHEREUM]: 'ethereum',
      [ChainId.ARBITRUM]: 'arbitrum-one',
      [ChainId.OPTIMISM]: 'optimistic-ethereum',
      [ChainId.POLYGON]: 'polygon-pos',
      [ChainId.BASE]: 'base',
      [ChainId.LOCAL_TESTNET]: 'ethereum', // Use Ethereum prices for local testnet
    };

    const platform = platformMap[chainId];
    if (!platform) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // Filter out zero address (ETH) and get contract addresses
    const contractAddresses = tokens.filter(token => token !== '0x0000000000000000000000000000000000000000');
    const hasETH = tokens.includes('0x0000000000000000000000000000000000000000');

    const prices: PriceData[] = [];

    // Fetch ETH price if needed
    if (hasETH) {
      const ethPrice = await this.fetchETHPrice();
      prices.push({
        token: '0x0000000000000000000000000000000000000000',
        priceUSD: ethPrice,
        timestamp: Date.now(),
        source: 'coingecko',
      });
    }

    // Fetch token prices if there are contract addresses
    if (contractAddresses.length > 0) {
      const tokenPrices = await this.fetchContractTokenPrices(contractAddresses, platform);
      prices.push(...tokenPrices);
    }

    return prices;
  }

  private async fetchETHPrice(): Promise<string> {
    const url = new URL('https://api.coingecko.com/api/v3/simple/price');
    url.searchParams.set('ids', 'ethereum');
    url.searchParams.set('vs_currencies', 'usd');
    
    if (this.coingeckoApiKey) {
      url.searchParams.set('x_cg_demo_api_key', this.coingeckoApiKey);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    return data.ethereum?.usd?.toString() || '2000';
  }

  private async fetchContractTokenPrices(contractAddresses: string[], platform: string): Promise<PriceData[]> {
    const url = new URL('https://api.coingecko.com/api/v3/simple/token_price/' + platform);
    url.searchParams.set('contract_addresses', contractAddresses.join(','));
    url.searchParams.set('vs_currencies', 'usd');
    
    if (this.coingeckoApiKey) {
      url.searchParams.set('x_cg_demo_api_key', this.coingeckoApiKey);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    
    return Object.entries(data).map(([address, priceData]: [string, any]) => ({
      token: address,
      priceUSD: priceData.usd?.toString() || '0',
      timestamp: Date.now(),
      source: 'coingecko',
    }));
  }

  private async fetchGasPrices(chainIds: ChainId[]): Promise<GasPriceData[]> {
    const gasPrices: GasPriceData[] = [];

    for (const chainId of chainIds) {
      try {
        const gasPrice = await this.fetchChainGasPrice(chainId);
        gasPrices.push({
          chainId,
          gasPrice,
          timestamp: Date.now(),
          source: this.getGasPriceSource(chainId),
        });
      } catch (error) {
        console.error(`Error fetching gas price for chain ${chainId}:`, error);
        // Use fallback gas price
        gasPrices.push({
          chainId,
          gasPrice: this.getFallbackGasPrice(chainId),
          timestamp: Date.now(),
          source: 'fallback',
        });
      }
    }

    return gasPrices;
  }

  private async fetchChainGasPrice(chainId: ChainId): Promise<string> {
    // Use different gas price sources for different chains
    switch (chainId) {
      case ChainId.ETHEREUM:
        return this.fetchEthereumGasPrice();
      case ChainId.ARBITRUM:
        return this.fetchArbitrumGasPrice();
      case ChainId.OPTIMISM:
        return this.fetchOptimismGasPrice();
      case ChainId.POLYGON:
        return this.fetchPolygonGasPrice();
      case ChainId.BASE:
        return this.fetchBaseGasPrice();
      case ChainId.LOCAL_TESTNET:
        return '20000000000'; // 20 gwei for local testnet
      default:
        return '20000000000'; // 20 gwei default
    }
  }

  private async fetchEthereumGasPrice(): Promise<string> {
    // Use Etherscan API for Ethereum gas prices
    const apiKey = process.env.ETHERSCAN_API_KEY || '';
    const url = `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Etherscan API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.status !== '1') {
      throw new Error(`Etherscan API error: ${data.message}`);
    }

    // Use standard gas price (gwei to wei)
    const gasPriceGwei = data.result.Standard || '20';
    return (parseFloat(gasPriceGwei) * 1e9).toString();
  }

  private async fetchArbitrumGasPrice(): Promise<string> {
    // Arbitrum has very low gas prices
    return '100000000'; // 0.1 gwei
  }

  private async fetchOptimismGasPrice(): Promise<string> {
    // Optimism has very low gas prices
    return '1000000'; // 0.001 gwei
  }

  private async fetchPolygonGasPrice(): Promise<string> {
    // Polygon has low gas prices
    return '30000000000'; // 30 gwei
  }

  private async fetchBaseGasPrice(): Promise<string> {
    // Base has low gas prices
    return '1000000'; // 0.001 gwei
  }

  private getGasPriceSource(chainId: ChainId): string {
    switch (chainId) {
      case ChainId.ETHEREUM:
        return 'etherscan';
      case ChainId.ARBITRUM:
      case ChainId.OPTIMISM:
      case ChainId.POLYGON:
      case ChainId.BASE:
        return 'chain-specific';
      case ChainId.LOCAL_TESTNET:
        return 'local';
      default:
        return 'fallback';
    }
  }

  private getFallbackGasPrice(chainId: ChainId): string {
    switch (chainId) {
      case ChainId.ETHEREUM:
        return '20000000000'; // 20 gwei
      case ChainId.ARBITRUM:
        return '100000000'; // 0.1 gwei
      case ChainId.OPTIMISM:
        return '1000000'; // 0.001 gwei
      case ChainId.POLYGON:
        return '30000000000'; // 30 gwei
      case ChainId.BASE:
        return '1000000'; // 0.001 gwei
      case ChainId.LOCAL_TESTNET:
        return '20000000000'; // 20 gwei
      default:
        return '20000000000'; // 20 gwei
    }
  }

  private getFallbackPrices(tokens: string[]): PriceData[] {
    return tokens.map(token => ({
      token,
      priceUSD: token === '0x0000000000000000000000000000000000000000' ? '2000' : '1',
      timestamp: Date.now(),
      source: 'fallback',
    }));
  }

  private getFallbackGasPrices(chainIds: ChainId[]): GasPriceData[] {
    return chainIds.map(chainId => ({
      chainId,
      gasPrice: this.getFallbackGasPrice(chainId),
      timestamp: Date.now(),
      source: 'fallback',
    }));
  }

  private getCached(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }
}


