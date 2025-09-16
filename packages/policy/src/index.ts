// ============ CHAIN CONFIGURATION ============

/**
 * Chain IDs matching the on-chain ChainConfig contract
 */
export const CHAIN_IDS = {
  ETHEREUM: 1,
  ARBITRUM: 42161,
  OPTIMISM: 10,
  SEPOLIA: 11155111,
  ARBITRUM_SEPOLIA: 421614,
  OPTIMISM_SEPOLIA: 11155420,
} as const;

/**
 * Chain names matching the on-chain ChainConfig contract
 */
export const CHAIN_NAMES = {
  ETHEREUM: 'ethereum',
  ARBITRUM: 'arbitrum',
  OPTIMISM: 'optimism',
  SEPOLIA: 'sepolia',
  ARBITRUM_SEPOLIA: 'arbitrum-sepolia',
  OPTIMISM_SEPOLIA: 'optimism-sepolia',
} as const;

/**
 * Router types matching the on-chain PolicyConfig contract
 */
export const ROUTER_TYPES = {
  UNISWAP: 0,
  ONEINCH: 1,
} as const;

/**
 * Router addresses matching the on-chain ChainConfig contract
 */
export const ROUTER_ADDRESSES = {
  // Uniswap V3 Routers
  UNISWAP_V3_ETHEREUM: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  UNISWAP_V3_ARBITRUM: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  UNISWAP_V3_OPTIMISM: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  
  // 1inch Routers
  ONEINCH_ETHEREUM: '0x1111111254EEB25477B68fb85Ed929f73A960582',
  ONEINCH_ARBITRUM: '0x1111111254EEB25477B68fb85Ed929f73A960582',
  ONEINCH_OPTIMISM: '0x1111111254EEB25477B68fb85Ed929f73A960582',
} as const;

// ============ TYPE DEFINITIONS ============

export type ChainId = typeof CHAIN_IDS[keyof typeof CHAIN_IDS];
export type ChainName = typeof CHAIN_NAMES[keyof typeof CHAIN_NAMES];
export type RouterType = typeof ROUTER_TYPES[keyof typeof ROUTER_TYPES];
export type RouterAddress = typeof ROUTER_ADDRESSES[keyof typeof ROUTER_ADDRESSES];

/**
 * Policy parameters matching the on-chain PolicyConfig contract
 */
export interface PolicyParameters {
  /** Maximum slippage in basis points (e.g., 50 for 0.5%) */
  maxSlippageBps: number;
  /** Maximum price impact in basis points (e.g., 150 for 1.5%) */
  maxPriceImpactBps: number;
  /** Minimum pool liquidity in USD (wei) */
  minLiquidityUSD: bigint;
  /** Quote TTL in seconds */
  ttlSeconds: number;
  /** Approval multiplier (e.g., 102 for 1.02x) */
  approvalMultiplier: number;
}

/**
 * Router allowlist configuration per chain
 */
export interface RouterAllowlist {
  [chainId: number]: {
    [routerType: number]: {
      [routerAddress: string]: boolean;
    };
  };
}

/**
 * Complete policy configuration mirroring the on-chain PolicyConfig contract
 */
export interface PolicyConfig {
  /** Policy parameters */
  parameters: PolicyParameters;
  /** Supported chains */
  supportedChains: Set<ChainId>;
  /** Router allowlist per chain */
  routerAllowlist: RouterAllowlist;
  /** Maximum notional per transaction in USD (wei) - from DeFiAgent contract */
  maxNotionalPerTxUSD: bigint;
}

/**
 * Quote data for evaluation
 */
export interface Quote {
  /** Chain ID */
  chainId: ChainId;
  /** Input token address */
  tokenIn: string;
  /** Output token address */
  tokenOut: string;
  /** Input amount in wei */
  amountIn: bigint;
  /** Expected output amount in wei */
  expectedOut: bigint;
  /** Price impact in basis points */
  priceImpactBps: number;
  /** Notional input amount in USD (wei) */
  notionalInUSD: bigint;
  /** Pool liquidity in USD (wei) */
  poolLiquidityUSD: bigint;
  /** Router type */
  routerType: RouterType;
  /** Router address */
  routerAddress: string;
}

/**
 * Evaluation result
 */
export interface EvaluationResult {
  /** Whether the quote passes all policy checks */
  passed: boolean;
  /** Array of violation strings */
  violations: string[];
}

// ============ DEFAULT POLICY ============

/**
 * Default policy parameters matching the on-chain PolicyConfig contract defaults
 */
export const DEFAULT_POLICY_PARAMETERS: PolicyParameters = {
  maxSlippageBps: 50, // 0.5%
  maxPriceImpactBps: 150, // 1.5%
  minLiquidityUSD: BigInt('250000000000000000000000'), // $250k in wei
  ttlSeconds: 120, // 2 minutes
  approvalMultiplier: 102, // 1.02x (102/100)
};

/**
 * Default supported chains
 */
export const DEFAULT_SUPPORTED_CHAINS = new Set<ChainId>([
  CHAIN_IDS.ETHEREUM,
  CHAIN_IDS.ARBITRUM,
  CHAIN_IDS.OPTIMISM,
  CHAIN_IDS.SEPOLIA,
  CHAIN_IDS.ARBITRUM_SEPOLIA,
  CHAIN_IDS.OPTIMISM_SEPOLIA,
]);

/**
 * Default router allowlist matching the on-chain PolicyConfig contract initialization
 */
export const DEFAULT_ROUTER_ALLOWLIST: RouterAllowlist = {
  [CHAIN_IDS.ETHEREUM]: {
    [ROUTER_TYPES.UNISWAP]: {
      [ROUTER_ADDRESSES.UNISWAP_V3_ETHEREUM]: true,
    },
    [ROUTER_TYPES.ONEINCH]: {
      [ROUTER_ADDRESSES.ONEINCH_ETHEREUM]: true,
    },
  },
  [CHAIN_IDS.ARBITRUM]: {
    [ROUTER_TYPES.UNISWAP]: {
      [ROUTER_ADDRESSES.UNISWAP_V3_ARBITRUM]: true,
    },
    [ROUTER_TYPES.ONEINCH]: {
      [ROUTER_ADDRESSES.ONEINCH_ARBITRUM]: true,
    },
  },
  [CHAIN_IDS.OPTIMISM]: {
    [ROUTER_TYPES.UNISWAP]: {
      [ROUTER_ADDRESSES.UNISWAP_V3_OPTIMISM]: true,
    },
    [ROUTER_TYPES.ONEINCH]: {
      [ROUTER_ADDRESSES.ONEINCH_OPTIMISM]: true,
    },
  },
  [CHAIN_IDS.SEPOLIA]: {
    [ROUTER_TYPES.UNISWAP]: {
      [ROUTER_ADDRESSES.UNISWAP_V3_ETHEREUM]: true,
    },
    [ROUTER_TYPES.ONEINCH]: {
      [ROUTER_ADDRESSES.ONEINCH_ETHEREUM]: true,
    },
  },
  [CHAIN_IDS.ARBITRUM_SEPOLIA]: {
    [ROUTER_TYPES.UNISWAP]: {
      [ROUTER_ADDRESSES.UNISWAP_V3_ARBITRUM]: true,
    },
    [ROUTER_TYPES.ONEINCH]: {
      [ROUTER_ADDRESSES.ONEINCH_ARBITRUM]: true,
    },
  },
  [CHAIN_IDS.OPTIMISM_SEPOLIA]: {
    [ROUTER_TYPES.UNISWAP]: {
      [ROUTER_ADDRESSES.UNISWAP_V3_OPTIMISM]: true,
    },
    [ROUTER_TYPES.ONEINCH]: {
      [ROUTER_ADDRESSES.ONEINCH_OPTIMISM]: true,
    },
  },
};

/**
 * Default policy configuration
 */
export const DEFAULT_POLICY_CONFIG: PolicyConfig = {
  parameters: DEFAULT_POLICY_PARAMETERS,
  supportedChains: DEFAULT_SUPPORTED_CHAINS,
  routerAllowlist: DEFAULT_ROUTER_ALLOWLIST,
  maxNotionalPerTxUSD: BigInt('1000000000000000000000'), // $1000 in wei
};

// ============ UTILITY FUNCTIONS ============

/**
 * Check if a chain is supported
 */
export function isChainSupported(chainId: ChainId, policy: PolicyConfig): boolean {
  return policy.supportedChains.has(chainId);
}

/**
 * Check if a router is allowed for a given chain and router type
 */
export function isRouterAllowed(
  chainId: ChainId,
  routerType: RouterType,
  routerAddress: string,
  policy: PolicyConfig
): boolean {
  const chainAllowlist = policy.routerAllowlist[chainId];
  if (!chainAllowlist) return false;
  
  const routerTypeAllowlist = chainAllowlist[routerType];
  if (!routerTypeAllowlist) return false;
  
  return routerTypeAllowlist[routerAddress] === true;
}

/**
 * Get all allowed routers for a specific chain and router type
 */
export function getAllowedRouters(
  chainId: ChainId,
  routerType: RouterType,
  policy: PolicyConfig
): string[] {
  const chainAllowlist = policy.routerAllowlist[chainId];
  if (!chainAllowlist) return [];
  
  const routerTypeAllowlist = chainAllowlist[routerType];
  if (!routerTypeAllowlist) return [];
  
  return Object.keys(routerTypeAllowlist).filter(
    address => routerTypeAllowlist[address] === true
  );
}

// ============ QUOTE EVALUATION ============

/**
 * Evaluate a quote against policy constraints
 * This function mirrors the on-chain DeFiAgent.evaluateQuote logic
 */
export function evaluateQuote(quote: Quote, policy: PolicyConfig): EvaluationResult {
  const violations: string[] = [];
  
  // Check if chain is supported
  if (!isChainSupported(quote.chainId, policy)) {
    violations.push('ChainNotSupported');
  }
  
  // Check if router is allowed
  if (!isRouterAllowed(quote.chainId, quote.routerType, quote.routerAddress, policy)) {
    violations.push('RouterNotAllowed');
  }
  
  // Check notional size (from DeFiAgent contract)
  if (quote.notionalInUSD > policy.maxNotionalPerTxUSD) {
    violations.push('NotionalTooLarge');
  }
  
  // Check price impact
  if (quote.priceImpactBps > policy.parameters.maxPriceImpactBps) {
    violations.push('PriceImpactHigh');
  }
  
  // Check pool liquidity
  if (quote.poolLiquidityUSD < policy.parameters.minLiquidityUSD) {
    violations.push('LiquidityTooLow');
  }
  
  // Check for zero amounts (from DeFiAgent contract)
  if (quote.amountIn === 0n) {
    violations.push('ZeroAmountIn');
  }
  
  if (quote.expectedOut === 0n) {
    violations.push('ZeroExpectedOut');
  }
  
  return {
    passed: violations.length === 0,
    violations,
  };
}

// ============ LEGACY COMPATIBILITY ============

/**
 * @deprecated Use PolicyConfig instead
 */
export type Policy = {
  chains: Array<'ethereum' | 'arbitrum' | 'optimism'>;
  routers: Record<string, Array<'uniswap' | '1inch'>>;
  maxNotionalPerTxUSD: number;
  maxSlippageBps: number;
  maxPriceImpactBps: number;
  minPoolLiquidityUSD: number;
  approvalMultiplier: number;
  ttlSeconds: number;
};

/**
 * @deprecated Use PolicyConfig instead
 */
export const defaultPolicy: Policy = {
  chains: ['ethereum', 'arbitrum', 'optimism'],
  routers: {
    ethereum: ['uniswap', '1inch'],
    arbitrum: ['uniswap', '1inch'],
    optimism: ['uniswap', '1inch'],
  },
  maxNotionalPerTxUSD: 1000,
  maxSlippageBps: 50,
  maxPriceImpactBps: 150,
  minPoolLiquidityUSD: 250000,
  approvalMultiplier: 1.02,
  ttlSeconds: 120,
};

/**
 * @deprecated Use Quote instead
 */
export type NormalizedQuote = {
  chain: 'ethereum' | 'arbitrum' | 'optimism';
  router: 'uniswap' | '1inch';
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
};
