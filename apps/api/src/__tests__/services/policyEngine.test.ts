/**
 * Unit tests for policy engine
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PolicyEngine } from '../../services/policyEngine.js';
import { PolicyRuleType, PolicySeverity, ChainId } from '../../types/policy.js';
import { NormalizedQuote, RouterType } from '../../types/quote.js';

describe('PolicyEngine', () => {
  let policyEngine: PolicyEngine;

  beforeEach(() => {
    policyEngine = new PolicyEngine();
  });

  describe('Min Amount Rule', () => {
    it('should pass when amount is above minimum', async () => {
      const quote = createMockQuote({ amountIn: '1.0' });
      const context = createMockContext();

      const result = await policyEngine.evaluateQuote(quote, context);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail when amount is below minimum', async () => {
      const quote = createMockQuote({ amountIn: '0.0001' });
      const context = createMockContext();

      const result = await policyEngine.evaluateQuote(quote, context);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].ruleType).toBe(PolicyRuleType.MIN_AMOUNT);
      expect(result.violations[0].message).toContain('Amount too small');
    });
  });

  describe('Max Amount Rule', () => {
    it('should pass when amount is below maximum', async () => {
      const quote = createMockQuote({ amountIn: '1000' });
      const context = createMockContext();

      const result = await policyEngine.evaluateQuote(quote, context);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail when amount exceeds maximum', async () => {
      const quote = createMockQuote({ amountIn: '2000000' });
      const context = createMockContext();

      const result = await policyEngine.evaluateQuote(quote, context);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].ruleType).toBe(PolicyRuleType.MAX_AMOUNT);
      expect(result.violations[0].message).toContain('Amount too large');
    });
  });

  describe('Max Price Impact Rule', () => {
    it('should pass when price impact is within limits', async () => {
      const quote = createMockQuote({ priceImpactBps: 100 });
      const context = createMockContext();

      const result = await policyEngine.evaluateQuote(quote, context);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail when price impact exceeds limits', async () => {
      const quote = createMockQuote({ priceImpactBps: 1000 });
      const context = createMockContext();

      const result = await policyEngine.evaluateQuote(quote, context);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].ruleType).toBe(PolicyRuleType.MAX_PRICE_IMPACT);
      expect(result.violations[0].message).toContain('Price impact too high');
    });
  });

  describe('Router Allowlist Rule', () => {
    it('should pass when router is in allowlist', async () => {
      const quote = createMockQuote({ 
        router: '0xE592427A0AEce92De3Edee1F18E0157C05861564' // Uniswap V3
      });
      const context = createMockContext({ chainId: ChainId.ETHEREUM });

      const result = await policyEngine.evaluateQuote(quote, context);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail when router is not in allowlist', async () => {
      const quote = createMockQuote({ 
        router: '0x1234567890123456789012345678901234567890' // Unknown router
      });
      const context = createMockContext({ chainId: ChainId.ETHEREUM });

      const result = await policyEngine.evaluateQuote(quote, context);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].ruleType).toBe(PolicyRuleType.ROUTER_ALLOWLIST);
      expect(result.violations[0].message).toContain('Router not allowed');
    });
  });

  describe('Token Allowlist Rule', () => {
    it('should pass when both tokens are in allowlist', async () => {
      const quote = createMockQuote({
        tokenIn: '0x0000000000000000000000000000000000000000', // ETH
        tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // WETH
      });
      const context = createMockContext({ chainId: ChainId.ETHEREUM });

      const result = await policyEngine.evaluateQuote(quote, context);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail when token is not in allowlist', async () => {
      const quote = createMockQuote({
        tokenIn: '0x0000000000000000000000000000000000000000', // ETH
        tokenOut: '0x1234567890123456789012345678901234567890' // Unknown token
      });
      const context = createMockContext({ chainId: ChainId.ETHEREUM });

      const result = await policyEngine.evaluateQuote(quote, context);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].ruleType).toBe(PolicyRuleType.TOKEN_ALLOWLIST);
      expect(result.violations[0].message).toContain('Token not allowed');
    });
  });

  describe('Max Gas Cost Rule', () => {
    it('should pass when gas cost is within limits', async () => {
      const quote = createMockQuote({ gasUSD: '10.0' });
      const context = createMockContext();

      const result = await policyEngine.evaluateQuote(quote, context);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail when gas cost exceeds limits', async () => {
      const quote = createMockQuote({ gasUSD: '100.0' });
      const context = createMockContext();

      const result = await policyEngine.evaluateQuote(quote, context);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].ruleType).toBe(PolicyRuleType.MAX_GAS_COST);
      expect(result.violations[0].message).toContain('Gas cost too high');
    });
  });

  describe('Min Net Value Rule', () => {
    it('should pass when net value is above minimum', async () => {
      const quote = createMockQuote({ 
        notionalUSD: '100.0',
        gasUSD: '5.0'
      });
      const context = createMockContext();

      const result = await policyEngine.evaluateQuote(quote, context);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail when net value is below minimum', async () => {
      const quote = createMockQuote({ 
        notionalUSD: '0.005',
        gasUSD: '0.01'
      });
      const context = createMockContext();

      const result = await policyEngine.evaluateQuote(quote, context);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].ruleType).toBe(PolicyRuleType.MIN_NET_VALUE);
      expect(result.violations[0].message).toContain('Net value too low');
    });
  });

  describe('Deadline Validity Rule', () => {
    it('should pass when deadline is valid', async () => {
      const futureTime = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now
      const quote = createMockQuote({ deadline: futureTime });
      const context = createMockContext();

      const result = await policyEngine.evaluateQuote(quote, context);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail when deadline is too far in the future', async () => {
      const farFutureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const quote = createMockQuote({ deadline: farFutureTime });
      const context = createMockContext();

      const result = await policyEngine.evaluateQuote(quote, context);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].ruleType).toBe(PolicyRuleType.DEADLINE_VALIDITY);
      expect(result.violations[0].message).toContain('Deadline too far');
    });

    it('should fail when deadline has expired', async () => {
      const pastTime = Math.floor(Date.now() / 1000) - 300; // 5 minutes ago
      const quote = createMockQuote({ deadline: pastTime });
      const context = createMockContext();

      const result = await policyEngine.evaluateQuote(quote, context);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].ruleType).toBe(PolicyRuleType.DEADLINE_VALIDITY);
      expect(result.violations[0].message).toContain('Deadline expired');
    });
  });

  describe('Multiple Rule Violations', () => {
    it('should report multiple violations', async () => {
      const quote = createMockQuote({
        amountIn: '0.0001', // Below minimum
        priceImpactBps: 1000, // Above maximum
        gasUSD: '100.0', // Above maximum
        router: '0x1234567890123456789012345678901234567890' // Not in allowlist
      });
      const context = createMockContext({ chainId: ChainId.ETHEREUM });

      const result = await policyEngine.evaluateQuote(quote, context);

      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(1);
      expect(result.score).toBeLessThan(100);
    });
  });

  describe('Net USD Calculation', () => {
    it('should calculate net USD correctly', async () => {
      const quote = createMockQuote({
        notionalUSD: '100.0',
        gasUSD: '5.0'
      });
      const context = createMockContext();

      const result = await policyEngine.evaluateQuote(quote, context);

      expect(result.netUSD).toBe('95.000000');
    });

    it('should handle negative net USD', async () => {
      const quote = createMockQuote({
        notionalUSD: '5.0',
        gasUSD: '10.0'
      });
      const context = createMockContext();

      const result = await policyEngine.evaluateQuote(quote, context);

      expect(result.netUSD).toBe('-5.000000');
    });
  });

  describe('Score Calculation', () => {
    it('should start with perfect score', async () => {
      const quote = createMockQuote({});
      const context = createMockContext();

      const result = await policyEngine.evaluateQuote(quote, context);

      expect(result.score).toBe(100);
    });

    it('should reduce score for violations', async () => {
      const quote = createMockQuote({ amountIn: '0.0001' });
      const context = createMockContext();

      const result = await policyEngine.evaluateQuote(quote, context);

      expect(result.score).toBeLessThan(100);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Router and Token Allowlist Checks', () => {
    it('should check router allowlist correctly', () => {
      expect(policyEngine.isRouterAllowed('0xE592427A0AEce92De3Edee1F18E0157C05861564', ChainId.ETHEREUM)).toBe(true);
      expect(policyEngine.isRouterAllowed('0x1234567890123456789012345678901234567890', ChainId.ETHEREUM)).toBe(false);
    });

    it('should check token allowlist correctly', () => {
      expect(policyEngine.isTokenAllowed('0x0000000000000000000000000000000000000000', ChainId.ETHEREUM)).toBe(true);
      expect(policyEngine.isTokenAllowed('0x1234567890123456789012345678901234567890', ChainId.ETHEREUM)).toBe(false);
    });
  });
});

// Helper functions
function createMockQuote(overrides: Partial<NormalizedQuote> = {}): NormalizedQuote {
  return {
    router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    routerType: RouterType.ZEROX,
    chainId: ChainId.ETHEREUM,
    tokenIn: '0x0000000000000000000000000000000000000000',
    tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    amountIn: '1.0',
    amountOut: '2000.0',
    priceImpactBps: 50,
    effectivePrice: '2000000',
    gasEstimate: '150000',
    gasPrice: '20000000000',
    gasUSD: '10.0',
    notionalUSD: '1000.0',
    deadline: Math.floor(Date.now() / 1000) + 300,
    ttl: 300,
    timestamp: Date.now(),
    source: 'test',
    confidence: 0.9,
    ...overrides,
  };
}

function createMockContext(overrides: Partial<{ chainId: ChainId; userAddress?: string }> = {}) {
  return {
    chainId: ChainId.ETHEREUM,
    userAddress: '0x1234567890123456789012345678901234567890',
    timestamp: Date.now(),
    marketConditions: {
      volatility: 0.1,
      liquidity: 1000000,
      gasPrice: '20000000000',
    },
    ...overrides,
  };
}
