/**
 * Input validation utilities for security hardening
 */

// Import from the built package
import { CHAIN_IDS, ROUTER_ADDRESSES } from '@agent/policy';

// Security constants
export const SECURITY_LIMITS = {
  MIN_AMOUNT: '0.000001', // Minimum token amount (6 decimals)
  MAX_AMOUNT: '1000000000', // Maximum token amount (1B tokens)
  MIN_SLIPPAGE: 0.01, // 0.01% minimum slippage
  MAX_SLIPPAGE: 50, // 50% maximum slippage
  MAX_DECIMALS: 18, // Maximum token decimals
  MIN_DECIMALS: 0, // Minimum token decimals
} as const;

// Supported chain IDs
export const SUPPORTED_CHAIN_IDS = Object.values(CHAIN_IDS);

// Router validation
export const SUPPORTED_ROUTER_TYPES = ['UNISWAP_V3', '1INCH'] as const;

/**
 * Validates token amount input
 */
export function validateTokenAmount(amount: string, decimals: number = 18): {
  isValid: boolean;
  error?: string;
  normalizedAmount?: string;
} {
  if (!amount || amount.trim() === '') {
    return { isValid: false, error: 'Amount is required' };
  }

  // Check for valid number format
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) {
    return { isValid: false, error: 'Invalid number format' };
  }

  // Check for negative amounts
  if (numAmount < 0) {
    return { isValid: false, error: 'Amount cannot be negative' };
  }

  // Check minimum amount
  if (numAmount < parseFloat(SECURITY_LIMITS.MIN_AMOUNT)) {
    return { isValid: false, error: `Minimum amount is ${SECURITY_LIMITS.MIN_AMOUNT}` };
  }

  // Check maximum amount
  if (numAmount > parseFloat(SECURITY_LIMITS.MAX_AMOUNT)) {
    return { isValid: false, error: `Maximum amount is ${SECURITY_LIMITS.MAX_AMOUNT}` };
  }

  // Check decimal places
  const decimalPlaces = amount.includes('.') ? amount.split('.')[1].length : 0;
  if (decimalPlaces > decimals) {
    return { isValid: false, error: `Maximum ${decimals} decimal places allowed` };
  }

  // Normalize amount (remove trailing zeros)
  const normalizedAmount = numAmount.toString();

  return { isValid: true, normalizedAmount };
}

/**
 * Validates and clamps slippage tolerance
 */
export function validateAndClampSlippage(slippage: number): {
  isValid: boolean;
  clampedSlippage: number;
  error?: string;
} {
  if (isNaN(slippage)) {
    return { 
      isValid: false, 
      clampedSlippage: SECURITY_LIMITS.MIN_SLIPPAGE,
      error: 'Invalid slippage value' 
    };
  }

  // Clamp slippage to security limits
  const clampedSlippage = Math.max(
    SECURITY_LIMITS.MIN_SLIPPAGE,
    Math.min(slippage, SECURITY_LIMITS.MAX_SLIPPAGE)
  );

  const isValid = slippage >= SECURITY_LIMITS.MIN_SLIPPAGE && 
                  slippage <= SECURITY_LIMITS.MAX_SLIPPAGE;

  return {
    isValid,
    clampedSlippage,
    error: !isValid ? `Slippage must be between ${SECURITY_LIMITS.MIN_SLIPPAGE}% and ${SECURITY_LIMITS.MAX_SLIPPAGE}%` : undefined
  };
}

/**
 * Validates chain ID
 */
export function validateChainId(chainId: number): {
  isValid: boolean;
  error?: string;
} {
  if (!Number.isInteger(chainId)) {
    return { isValid: false, error: 'Invalid chain ID format' };
  }

  if (!SUPPORTED_CHAIN_IDS.includes(chainId)) {
    return { 
      isValid: false, 
      error: `Unsupported chain ID: ${chainId}. Supported chains: ${SUPPORTED_CHAIN_IDS.join(', ')}` 
    };
  }

  return { isValid: true };
}

/**
 * Validates token address
 */
export function validateTokenAddress(address: string): {
  isValid: boolean;
  error?: string;
  normalizedAddress?: string;
} {
  if (!address || address.trim() === '') {
    return { isValid: false, error: 'Token address is required' };
  }

  // Basic Ethereum address validation
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  if (!ethAddressRegex.test(address)) {
    return { isValid: false, error: 'Invalid Ethereum address format' };
  }

  // Check for zero address
  if (address === '0x0000000000000000000000000000000000000000') {
    return { isValid: false, error: 'Zero address is not allowed' };
  }

  // Normalize to checksum format
  const normalizedAddress = address.toLowerCase();

  return { isValid: true, normalizedAddress };
}

/**
 * Validates router type
 */
export function validateRouterType(routerType: string): {
  isValid: boolean;
  error?: string;
} {
  if (!routerType || routerType.trim() === '') {
    return { isValid: false, error: 'Router type is required' };
  }

  if (!SUPPORTED_ROUTER_TYPES.includes(routerType as any)) {
    return { 
      isValid: false, 
      error: `Unsupported router type: ${routerType}. Supported types: ${SUPPORTED_ROUTER_TYPES.join(', ')}` 
    };
  }

  return { isValid: true };
}

/**
 * Validates router address for a specific chain
 */
export function validateRouterAddress(routerAddress: string, chainId: number, routerType: string): {
  isValid: boolean;
  error?: string;
} {
  // First validate the address format
  const addressValidation = validateTokenAddress(routerAddress);
  if (!addressValidation.isValid) {
    return addressValidation;
  }

  // Check if router is in allowlist for this chain
  const chainRouters = ROUTER_ADDRESSES[chainId];
  if (!chainRouters) {
    return { isValid: false, error: `No routers configured for chain ${chainId}` };
  }

  const routerConfig = chainRouters[routerType];
  if (!routerConfig) {
    return { isValid: false, error: `Router type ${routerType} not configured for chain ${chainId}` };
  }

  if (routerConfig.address.toLowerCase() !== routerAddress.toLowerCase()) {
    return { 
      isValid: false, 
      error: `Router address ${routerAddress} not in allowlist for ${routerType} on chain ${chainId}` 
    };
  }

  return { isValid: true };
}

/**
 * Comprehensive input validation for quote requests
 */
export function validateQuoteRequest(params: {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  chainId: number;
  slippageTolerance?: number;
  routerType?: string;
}): {
  isValid: boolean;
  errors: string[];
  normalizedParams?: {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    chainId: number;
    slippageTolerance: number;
    routerType: string;
  };
} {
  const errors: string[] = [];

  // Validate chain ID
  const chainValidation = validateChainId(params.chainId);
  if (!chainValidation.isValid) {
    errors.push(chainValidation.error!);
  }

  // Validate token addresses
  const tokenInValidation = validateTokenAddress(params.tokenIn);
  if (!tokenInValidation.isValid) {
    errors.push(`Token In: ${tokenInValidation.error!}`);
  }

  const tokenOutValidation = validateTokenAddress(params.tokenOut);
  if (!tokenOutValidation.isValid) {
    errors.push(`Token Out: ${tokenOutValidation.error!}`);
  }

  // Check for same token
  if (tokenInValidation.normalizedAddress === tokenOutValidation.normalizedAddress) {
    errors.push('Token In and Token Out cannot be the same');
  }

  // Validate amount
  const amountValidation = validateTokenAmount(params.amountIn);
  if (!amountValidation.isValid) {
    errors.push(`Amount: ${amountValidation.error!}`);
  }

  // Validate slippage
  const slippage = params.slippageTolerance ?? 0.5;
  const slippageValidation = validateAndClampSlippage(slippage);
  if (!slippageValidation.isValid) {
    errors.push(`Slippage: ${slippageValidation.error!}`);
  }

  // Validate router type if provided
  if (params.routerType) {
    const routerValidation = validateRouterType(params.routerType);
    if (!routerValidation.isValid) {
      errors.push(`Router: ${routerValidation.error!}`);
    }
  }

  const isValid = errors.length === 0;

  if (!isValid) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    normalizedParams: {
      tokenIn: tokenInValidation.normalizedAddress!,
      tokenOut: tokenOutValidation.normalizedAddress!,
      amountIn: amountValidation.normalizedAmount!,
      chainId: params.chainId,
      slippageTolerance: slippageValidation.clampedSlippage,
      routerType: params.routerType ?? 'UNISWAP_V3',
    }
  };
}

/**
 * Sanitizes user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Rate limiting helper for client-side
 */
export class ClientRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }

  getRemainingRequests(key: string): number {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    return Math.max(0, this.maxRequests - validRequests.length);
  }
}
