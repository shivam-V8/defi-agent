import { z } from 'zod';

// Chain IDs
export const CHAIN_IDS = {
  ETHEREUM: 1,
  ARBITRUM: 42161,
  OPTIMISM: 10,
} as const;

// Router types (matching PolicyConfig contract)
export const ROUTER_TYPES = {
  UNISWAP_V3: 'UNISWAP_V3',
  ONEINCH: 'ONEINCH',
  SUSHISWAP: 'SUSHISWAP',
  CURVE: 'CURVE',
} as const;

// Quote request schema
export const QuoteRequestSchema = z.object({
  tokenIn: z.string().min(1, 'Token in address is required'),
  tokenOut: z.string().min(1, 'Token out address is required'),
  amountIn: z.string().regex(/^\d+(\.\d+)?$/, 'Amount must be a valid number'),
  chainId: z.number().int().positive('Chain ID must be positive'),
  slippageTolerance: z.number().min(0).max(50).default(0.5), // 0.5% default
  deadline: z.number().int().positive().optional(), // Unix timestamp
  userAddress: z.string().optional(), // User address for policy evaluation
});

// Quote response schema
export const QuoteResponseSchema = z.object({
  bestRoute: z.object({
    router: z.string(),
    routerType: z.enum(Object.values(ROUTER_TYPES) as [string, ...string[]]),
    tokenIn: z.string(),
    tokenOut: z.string(),
    amountIn: z.string(),
    expectedOut: z.string(),
    minReceived: z.string(),
    priceImpactBps: z.number().int().min(0).max(10000), // 0-10000 basis points
    gasEstimate: z.string(),
    gasPrice: z.string(),
    deadline: z.number().int(),
    ttl: z.number().int().positive(), // Time to live in seconds
  }),
  rejectedRoutes: z.array(z.object({
    router: z.string(),
    routerType: z.enum(Object.values(ROUTER_TYPES) as [string, ...string[]]),
    reason: z.string(),
    errorCode: z.string().optional(),
    violations: z.array(z.string()).optional(),
  })),
  totalRoutes: z.number().int().min(0),
  processingTimeMs: z.number().int().min(0),
  policyEvaluation: z.object({
    passed: z.boolean(),
    score: z.number().min(0).max(100),
    netUSD: z.string(),
    violations: z.array(z.object({
      ruleId: z.string(),
      ruleType: z.string(),
      severity: z.string(),
      message: z.string(),
      actualValue: z.union([z.string(), z.number()]).optional(),
      expectedValue: z.union([z.string(), z.number()]).optional(),
    })),
    warnings: z.array(z.object({
      ruleId: z.string(),
      ruleType: z.string(),
      severity: z.string(),
      message: z.string(),
      actualValue: z.union([z.string(), z.number()]).optional(),
      expectedValue: z.union([z.string(), z.number()]).optional(),
    })),
  }).optional(),
});

// Simulation request schema
export const SimulationRequestSchema = z.object({
  tokenIn: z.string().min(1, 'Token in address is required'),
  tokenOut: z.string().min(1, 'Token out address is required'),
  amountIn: z.string().regex(/^\d+(\.\d+)?$/, 'Amount must be a valid number'),
  expectedOut: z.string().regex(/^\d+(\.\d+)?$/, 'Expected out must be a valid number'),
  chainId: z.number().int().positive('Chain ID must be positive'),
  router: z.string().min(1, 'Router address is required'),
  routerType: z.enum(Object.values(ROUTER_TYPES) as [string, ...string[]]),
  userAddress: z.string().min(1, 'User address is required'),
});

// Simulation response schema
export const SimulationResponseSchema = z.object({
  success: z.boolean(),
  gasUsed: z.string().optional(),
  gasPrice: z.string().optional(),
  actualOut: z.string().optional(),
  priceImpact: z.number().optional(),
  error: z.string().optional(),
  simulationId: z.string().optional(),
});

// Transaction params request schema
export const TxParamsRequestSchema = z.object({
  tokenIn: z.string().min(1, 'Token in address is required'),
  tokenOut: z.string().min(1, 'Token out address is required'),
  amountIn: z.string().regex(/^\d+(\.\d+)?$/, 'Amount must be a valid number'),
  expectedOut: z.string().regex(/^\d+(\.\d+)?$/, 'Expected out must be a valid number'),
  minReceived: z.string().regex(/^\d+(\.\d+)?$/, 'Min received must be a valid number'),
  chainId: z.number().int().positive('Chain ID must be positive'),
  router: z.string().min(1, 'Router address is required'),
  routerType: z.enum(Object.values(ROUTER_TYPES) as [string, ...string[]]),
  userAddress: z.string().min(1, 'User address is required'),
  deadline: z.number().int().positive(),
  permitType: z.enum(['PERMIT2', 'EIP2612']).optional().default('PERMIT2'),
});

// Transaction params response schema
export const TxParamsResponseSchema = z.object({
  to: z.string(), // AgentExecutor contract address
  data: z.string(), // Calldata for executeSwapWithPermit2 or executeSwapWithPermit2612
  value: z.string().default('0'),
  gasLimit: z.string(),
  gasPrice: z.string(),
  nonce: z.number().int().min(0).optional(),
  chainId: z.number().int().positive(),
  permitData: z.object({
    token: z.string(),
    amount: z.string(),
    deadline: z.number().int(),
    nonce: z.string().optional(),
    signature: z.string(),
  }),
});

export type QuoteRequest = z.infer<typeof QuoteRequestSchema>;
export type QuoteResponse = z.infer<typeof QuoteResponseSchema>;
export type SimulationRequest = z.infer<typeof SimulationRequestSchema>;
export type SimulationResponse = z.infer<typeof SimulationResponseSchema>;
export type TxParamsRequest = z.infer<typeof TxParamsRequestSchema>;
export type TxParamsResponse = z.infer<typeof TxParamsResponseSchema>;
