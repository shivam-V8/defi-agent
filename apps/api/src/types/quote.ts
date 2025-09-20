/**
 * Normalized quote interface for consistent handling across different routers
 */

// Router types
export enum RouterType {
  UNISWAP_V3 = 'UNISWAP_V3',
  ONEINCH = 'ONEINCH',
  ZEROX = 'ZEROX',
  SUSHISWAP = 'SUSHISWAP',
  CURVE = 'CURVE',
}

// Chain IDs
export enum ChainId {
  ETHEREUM = 1,
  ARBITRUM = 42161,
  OPTIMISM = 10,
  POLYGON = 137,
  BASE = 8453,
  LOCAL_TESTNET = 31337,
}

// Normalized quote interface
export interface NormalizedQuote {
  // Basic quote info
  router: string;
  routerType: RouterType;
  chainId: ChainId;
  
  // Token info
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  
  // Pricing info
  priceImpactBps: number; // Price impact in basis points (0-10000)
  effectivePrice: string; // Effective price (amountOut / amountIn)
  
  // Gas info
  gasEstimate: string;
  gasPrice: string;
  gasUSD: string; // Gas cost in USD
  
  // Notional info
  notionalUSD: string; // Notional value in USD
  
  // Timing
  deadline: number;
  ttl: number; // Time to live in seconds
  
  // Metadata
  timestamp: number;
  source: string; // Which fetcher provided this quote
  confidence: number; // Confidence score 0-1
}

// Raw quote from external APIs
export interface RawQuote {
  router: string;
  routerType: RouterType;
  chainId: ChainId;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  priceImpactBps?: number;
  gasEstimate?: string;
  gasPrice?: string;
  deadline?: number;
  ttl?: number;
  rawData: any; // Original response from the API
}

// Quote fetcher configuration
export interface QuoteFetcherConfig {
  timeout: number; // Timeout in milliseconds
  retries: number; // Number of retries
  fallbackEnabled: boolean; // Whether to use fallback routes
  priceBias: number; // Conservative price bias (0-1, where 1 is most conservative)
}

// Price data for USD calculations
export interface PriceData {
  token: string;
  priceUSD: string;
  timestamp: number;
  source: string;
}

// Gas price data
export interface GasPriceData {
  chainId: ChainId;
  gasPrice: string; // In wei
  timestamp: number;
  source: string;
}

// Quote fetcher result
export interface QuoteFetcherResult {
  quotes: NormalizedQuote[];
  errors: Array<{
    router: string;
    routerType: RouterType;
    error: string;
    timestamp: number;
  }>;
  processingTimeMs: number;
}

// Router configuration
export interface RouterConfig {
  address: string;
  type: RouterType;
  chainId: ChainId;
  enabled: boolean;
  priority: number; // Lower number = higher priority
  timeout: number;
  retries: number;
}


