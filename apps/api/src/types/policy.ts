/**
 * Policy evaluation types and interfaces
 */

import { NormalizedQuote, RouterType } from './quote.js';

// Chain IDs
export enum ChainId {
  ETHEREUM = 1,
  ARBITRUM = 42161,
  OPTIMISM = 10,
  POLYGON = 137,
  BASE = 8453,
  LOCAL_TESTNET = 31337,
}

// Policy rule types
export enum PolicyRuleType {
  MIN_AMOUNT = 'MIN_AMOUNT',
  MAX_AMOUNT = 'MAX_AMOUNT',
  MAX_PRICE_IMPACT = 'MAX_PRICE_IMPACT',
  MIN_LIQUIDITY = 'MIN_LIQUIDITY',
  ROUTER_ALLOWLIST = 'ROUTER_ALLOWLIST',
  TOKEN_ALLOWLIST = 'TOKEN_ALLOWLIST',
  MAX_GAS_COST = 'MAX_GAS_COST',
  MIN_NET_VALUE = 'MIN_NET_VALUE',
  MAX_SLIPPAGE = 'MAX_SLIPPAGE',
  DEADLINE_VALIDITY = 'DEADLINE_VALIDITY',
}

// Policy rule severity levels
export enum PolicySeverity {
  ERROR = 'ERROR',     // Quote is rejected
  WARNING = 'WARNING', // Quote is accepted but flagged
  INFO = 'INFO',       // Informational only
}

// Policy rule configuration
export interface PolicyRule {
  id: string;
  type: PolicyRuleType;
  severity: PolicySeverity;
  enabled: boolean;
  parameters: Record<string, any>;
  description: string;
}

// Policy evaluation result
export interface PolicyEvaluationResult {
  passed: boolean;
  violations: PolicyViolation[];
  warnings: PolicyViolation[];
  score: number; // 0-100, higher is better
  netUSD: string; // expectedOutUSD - gasUSD
}

// Policy violation details
export interface PolicyViolation {
  ruleId: string;
  ruleType: PolicyRuleType;
  severity: PolicySeverity;
  message: string;
  actualValue?: string | number;
  expectedValue?: string | number;
  details?: Record<string, any>;
}

// Policy configuration per chain
export interface ChainPolicyConfig {
  chainId: ChainId;
  rules: PolicyRule[];
  enabled: boolean;
  lastUpdated: number;
}

// Quote scoring result
export interface QuoteScore {
  quote: NormalizedQuote;
  netUSD: string;
  score: number;
  violations: PolicyViolation[];
  warnings: PolicyViolation[];
  passed: boolean;
}

// Policy evaluation context
export interface PolicyEvaluationContext {
  chainId: ChainId;
  userAddress?: string;
  timestamp: number;
  marketConditions?: {
    volatility: number;
    liquidity: number;
    gasPrice: string;
  };
}

// Policy manager interface
export interface PolicyManager {
  evaluateQuote(quote: NormalizedQuote, context: PolicyEvaluationContext): Promise<PolicyEvaluationResult>;
  getChainPolicy(chainId: ChainId): ChainPolicyConfig;
  updateChainPolicy(chainId: ChainId, config: ChainPolicyConfig): void;
  isRouterAllowed(router: string, chainId: ChainId): boolean;
  isTokenAllowed(token: string, chainId: ChainId): boolean;
}

// Default policy parameters
export const DEFAULT_POLICY_PARAMETERS = {
  [PolicyRuleType.MIN_AMOUNT]: { minAmount: '0.001' },
  [PolicyRuleType.MAX_AMOUNT]: { maxAmount: '1000000' },
  [PolicyRuleType.MAX_PRICE_IMPACT]: { maxPriceImpactBps: 500 }, // 5%
  [PolicyRuleType.MIN_LIQUIDITY]: { minLiquidityUSD: '10000' },
  [PolicyRuleType.MAX_GAS_COST]: { maxGasCostUSD: '50' },
  [PolicyRuleType.MIN_NET_VALUE]: { minNetValueUSD: '0.01' },
  [PolicyRuleType.MAX_SLIPPAGE]: { maxSlippageBps: 1000 }, // 10%
  [PolicyRuleType.DEADLINE_VALIDITY]: { maxDeadlineMinutes: 30 },
} as const;

// Router allowlists per chain (mirrors PolicyConfig contract)
export const ROUTER_ALLOWLISTS: Record<ChainId, string[]> = {
  [ChainId.ETHEREUM]: [
    '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Uniswap V3
    '0x1111111254EEB25477B68fb85Ed929f73A960582', // 1inch
    '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F', // SushiSwap
    '0x8301AE4fc9c624d1D396cbDAa1ed877821D7C511', // Curve
  ],
  [ChainId.ARBITRUM]: [
    '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Uniswap V3
    '0x1111111254EEB25477B68fb85Ed929f73A960582', // 1inch
    '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', // SushiSwap
  ],
  [ChainId.OPTIMISM]: [
    '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Uniswap V3
    '0x1111111254EEB25477B68fb85Ed929f73A960582', // 1inch
    '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', // SushiSwap
  ],
  [ChainId.POLYGON]: [
    '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Uniswap V3
    '0x1111111254EEB25477B68fb85Ed929f73A960582', // 1inch
  ],
  [ChainId.BASE]: [
    '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Uniswap V3
    '0x1111111254EEB25477B68fb85Ed929f73A960582', // 1inch
  ],
  [ChainId.LOCAL_TESTNET]: [
    '0x3a23F943181408EAC424116Af7b7790c94Cb97a5', // Mock 0x
    '0x1111111254EEB25477B68fb85Ed929f73A960582', // Mock 1inch
  ],
};

// Token allowlists per chain (common tokens)
export const TOKEN_ALLOWLISTS: Record<ChainId, string[]> = {
  [ChainId.ETHEREUM]: [
    '0x0000000000000000000000000000000000000000', // ETH
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C', // USDC
    '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
    '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
  ],
  [ChainId.ARBITRUM]: [
    '0x0000000000000000000000000000000000000000', // ETH
    '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
    '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
    '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // USDT
  ],
  [ChainId.OPTIMISM]: [
    '0x0000000000000000000000000000000000000000', // ETH
    '0x4200000000000000000000000000000000000006', // WETH
    '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // USDC
    '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', // USDT
  ],
  [ChainId.POLYGON]: [
    '0x0000000000000000000000000000000000000000', // MATIC
    '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
    '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC
    '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT
  ],
  [ChainId.BASE]: [
    '0x0000000000000000000000000000000000000000', // ETH
    '0x4200000000000000000000000000000000000006', // WETH
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
  ],
  [ChainId.LOCAL_TESTNET]: [
    '0x0000000000000000000000000000000000000000', // ETH
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C', // USDC
  ],
};
