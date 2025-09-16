// Chain configuration types
export type ChainId = 1 | 42161 | 10 | 11155111 | 421614 | 11155420;

export type ChainName = 
  | 'ethereum' 
  | 'arbitrum' 
  | 'optimism' 
  | 'sepolia' 
  | 'arbitrum-sepolia' 
  | 'optimism-sepolia';

export type RouterType = 0 | 1; // 0 = Uniswap, 1 = 1inch

// Chain configuration constants
export const CHAIN_IDS = {
  ETHEREUM: 1 as const,
  ARBITRUM: 42161 as const,
  OPTIMISM: 10 as const,
  SEPOLIA: 11155111 as const,
  ARBITRUM_SEPOLIA: 421614 as const,
  OPTIMISM_SEPOLIA: 11155420 as const,
} as const;

export const CHAIN_NAMES = {
  ETHEREUM: 'ethereum' as const,
  ARBITRUM: 'arbitrum' as const,
  OPTIMISM: 'optimism' as const,
  SEPOLIA: 'sepolia' as const,
  ARBITRUM_SEPOLIA: 'arbitrum-sepolia' as const,
  OPTIMISM_SEPOLIA: 'optimism-sepolia' as const,
} as const;

export const ROUTER_TYPES = {
  UNISWAP: 0 as const,
  ONEINCH: 1 as const,
} as const;

// Router addresses (from contracts)
export const ROUTER_ADDRESSES = {
  [CHAIN_IDS.ETHEREUM]: {
    [ROUTER_TYPES.UNISWAP]: '0xE592427A0AEce92De3Edee1F18E0157C05861564' as const,
    [ROUTER_TYPES.ONEINCH]: '0x1111111254EEB25477B68fb85Ed929f73A960582' as const,
  },
  [CHAIN_IDS.ARBITRUM]: {
    [ROUTER_TYPES.UNISWAP]: '0xE592427A0AEce92De3Edee1F18E0157C05861564' as const,
    [ROUTER_TYPES.ONEINCH]: '0x1111111254EEB25477B68fb85Ed929f73A960582' as const,
  },
  [CHAIN_IDS.OPTIMISM]: {
    [ROUTER_TYPES.UNISWAP]: '0xE592427A0AEce92De3Edee1F18E0157C05861564' as const,
    [ROUTER_TYPES.ONEINCH]: '0x1111111254EEB25477B68fb85Ed929f73A960582' as const,
  },
} as const;

// DeFi Agent types
export interface SwapIntent {
  chainCandidates: ChainName[];
  routerCandidates: RouterType[];
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  userAddress: string;
  slippageBps: number;
}

export interface QuoteEvaluation {
  passed: boolean;
  violations: string[];
}

export interface NormalizedQuote {
  chain: ChainName;
  router: RouterType;
  tokenIn: string;
  tokenOut: string;
  amountInWei: bigint;
  expectedOutWei: bigint;
  priceImpactBps: number;
  gasUSD: number;
  notionalInUSD: number;
  poolLiquidityUSD?: number;
  calldata: string;
  to: string;
}

export interface Policy {
  chains: ChainName[];
  routers: Record<ChainName, RouterType[]>;
  maxNotionalPerTxUSD: number;
  maxSlippageBps: number;
  maxPriceImpactBps: number;
  minPoolLiquidityUSD: number;
  approvalMultiplier: number;
  ttlSeconds: number;
}

// Contract ABI types (simplified for now)
export interface DeFiAgentContract {
  evaluateQuote: (
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    expectedOut: bigint,
    priceImpactBps: number,
    notionalInUSD: bigint,
    poolLiquidityUSD: bigint
  ) => Promise<{ passed: boolean; violations: string[] }>;
  
  executeSwap: (
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    routerType: RouterType,
    swapCalldata: string
  ) => Promise<void>;
  
  maxNotionalPerTxUSD: () => Promise<bigint>;
  maxSlippageBps: () => Promise<number>;
  maxPriceImpactBps: () => Promise<number>;
  minPoolLiquidityUSD: () => Promise<bigint>;
  owner: () => Promise<string>;
}

// Utility functions
export function getChainName(chainId: ChainId): ChainName {
  switch (chainId) {
    case CHAIN_IDS.ETHEREUM:
      return CHAIN_NAMES.ETHEREUM;
    case CHAIN_IDS.ARBITRUM:
      return CHAIN_NAMES.ARBITRUM;
    case CHAIN_IDS.OPTIMISM:
      return CHAIN_NAMES.OPTIMISM;
    case CHAIN_IDS.SEPOLIA:
      return CHAIN_NAMES.SEPOLIA;
    case CHAIN_IDS.ARBITRUM_SEPOLIA:
      return CHAIN_NAMES.ARBITRUM_SEPOLIA;
    case CHAIN_IDS.OPTIMISM_SEPOLIA:
      return CHAIN_NAMES.OPTIMISM_SEPOLIA;
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}

export function getChainId(chainName: ChainName): ChainId {
  switch (chainName) {
    case CHAIN_NAMES.ETHEREUM:
      return CHAIN_IDS.ETHEREUM;
    case CHAIN_NAMES.ARBITRUM:
      return CHAIN_IDS.ARBITRUM;
    case CHAIN_NAMES.OPTIMISM:
      return CHAIN_IDS.OPTIMISM;
    case CHAIN_NAMES.SEPOLIA:
      return CHAIN_IDS.SEPOLIA;
    case CHAIN_NAMES.ARBITRUM_SEPOLIA:
      return CHAIN_IDS.ARBITRUM_SEPOLIA;
    case CHAIN_NAMES.OPTIMISM_SEPOLIA:
      return CHAIN_IDS.OPTIMISM_SEPOLIA;
    default:
      throw new Error(`Unsupported chain name: ${chainName}`);
  }
}

export function isSupportedChain(chainId: number): chainId is ChainId {
  return Object.values(CHAIN_IDS).includes(chainId as ChainId);
}

export function getRouterAddress(chainId: ChainId, routerType: RouterType): string {
  const chainRouters = ROUTER_ADDRESSES[chainId as keyof typeof ROUTER_ADDRESSES];
  if (!chainRouters) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  
  const routerAddress = chainRouters[routerType];
  if (!routerAddress) {
    throw new Error(`Unsupported router type: ${routerType} for chain: ${chainId}`);
  }
  
  return routerAddress;
}

// Export contract artifacts
export * from './contracts';
