/**
 * Unit tests for quote scorer
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { QuoteScorer } from '../../services/quoteScorer.js';
import { ChainId, PolicyEvaluationContext } from '../../types/policy.js';
import { NormalizedQuote, RouterType } from '../../types/quote.js';

describe('QuoteScorer', () => {
  let quoteScorer: QuoteScorer;

  beforeEach(() => {
    quoteScorer = new QuoteScorer();
  });

  describe('Score and Rank Quotes', () => {
    it('should rank quotes by net USD value', async () => {
      const quotes = [
        createMockQuote({ 
          router: 'router1',
          notionalUSD: '100.0',
          gasUSD: '10.0'
        }),
        createMockQuote({ 
          router: 'router2',
          notionalUSD: '200.0',
          gasUSD: '20.0'
        }),
        createMockQuote({ 
          router: 'router3',
          notionalUSD: '150.0',
          gasUSD: '5.0'
        }),
      ];

      const context = createMockContext();

      const result = await quoteScorer.scoreAndRankQuotes(quotes, context);

      expect(result.rankedQuotes).toHaveLength(3);
      expect(result.bestQuote).toBeTruthy();
      expect(result.bestQuote?.quote.router).toBe('router3'); // Highest net USD (145)
      expect(result.rankedQuotes[0].netUSD).toBe('145.000000');
      expect(result.rankedQuotes[1].netUSD).toBe('180.000000');
      expect(result.rankedQuotes[2].netUSD).toBe('90.000000');
    });

    it('should reject quotes that fail policy evaluation', async () => {
      const quotes = [
        createMockQuote({ 
          router: 'router1',
          amountIn: '0.0001', // Will fail min amount rule
          notionalUSD: '100.0',
          gasUSD: '10.0'
        }),
        createMockQuote({ 
          router: 'router2',
          amountIn: '1.0',
          notionalUSD: '200.0',
          gasUSD: '20.0'
        }),
      ];

      const context = createMockContext();

      const result = await quoteScorer.scoreAndRankQuotes(quotes, context);

      expect(result.rankedQuotes).toHaveLength(1);
      expect(result.rejectedQuotes).toHaveLength(1);
      expect(result.rejectedQuotes[0].quote.router).toBe('router1');
      expect(result.rejectedQuotes[0].reason).toContain('Amount too small');
    });

    it('should handle empty quotes array', async () => {
      const quotes: NormalizedQuote[] = [];
      const context = createMockContext();

      const result = await quoteScorer.scoreAndRankQuotes(quotes, context);

      expect(result.rankedQuotes).toHaveLength(0);
      expect(result.bestQuote).toBeNull();
      expect(result.rejectedQuotes).toHaveLength(0);
    });

    it('should handle all quotes being rejected', async () => {
      const quotes = [
        createMockQuote({ 
          router: 'router1',
          amountIn: '0.0001', // Will fail min amount rule
        }),
        createMockQuote({ 
          router: 'router2',
          amountIn: '0.0001', // Will fail min amount rule
        }),
      ];

      const context = createMockContext();

      const result = await quoteScorer.scoreAndRankQuotes(quotes, context);

      expect(result.rankedQuotes).toHaveLength(0);
      expect(result.bestQuote).toBeNull();
      expect(result.rejectedQuotes).toHaveLength(2);
    });
  });

  describe('Net USD Calculation', () => {
    it('should calculate net USD correctly', () => {
      const quote = createMockQuote({
        notionalUSD: '100.0',
        gasUSD: '10.0'
      });

      const netUSD = quoteScorer.calculateNetUSD(quote);

      expect(netUSD).toBe('90.000000');
    });

    it('should handle negative net USD', () => {
      const quote = createMockQuote({
        notionalUSD: '5.0',
        gasUSD: '10.0'
      });

      const netUSD = quoteScorer.calculateNetUSD(quote);

      expect(netUSD).toBe('-5.000000');
    });

    it('should handle zero net USD', () => {
      const quote = createMockQuote({
        notionalUSD: '10.0',
        gasUSD: '10.0'
      });

      const netUSD = quoteScorer.calculateNetUSD(quote);

      expect(netUSD).toBe('0.000000');
    });
  });

  describe('Scoring Breakdown', () => {
    it('should provide detailed scoring breakdown', () => {
      const quote = createMockQuote({
        notionalUSD: '100.0',
        gasUSD: '10.0',
        priceImpactBps: 50,
        confidence: 0.8
      });

      const breakdown = quoteScorer.getScoringBreakdown(quote);

      expect(breakdown.expectedOutUSD).toBe('100.000000');
      expect(breakdown.gasUSD).toBe('10.000000');
      expect(breakdown.netUSD).toBe('90.000000');
      expect(breakdown.priceImpactBps).toBe(50);
      expect(breakdown.confidence).toBe(0.8);
      expect(breakdown.factors).toHaveLength(4);
    });

    it('should categorize factors correctly', () => {
      const quote = createMockQuote({
        notionalUSD: '100.0',
        gasUSD: '10.0',
        priceImpactBps: 200, // High price impact
        confidence: 0.5 // Low confidence
      });

      const breakdown = quoteScorer.getScoringBreakdown(quote);

      const expectedOutFactor = breakdown.factors.find(f => f.name === 'Expected Output USD');
      expect(expectedOutFactor?.impact).toBe('positive');

      const gasFactor = breakdown.factors.find(f => f.name === 'Gas Cost USD');
      expect(gasFactor?.impact).toBe('negative');

      const priceImpactFactor = breakdown.factors.find(f => f.name === 'Price Impact (bps)');
      expect(priceImpactFactor?.impact).toBe('negative');

      const confidenceFactor = breakdown.factors.find(f => f.name === 'Confidence Score');
      expect(confidenceFactor?.impact).toBe('negative');
    });
  });

  describe('Efficiency Score', () => {
    it('should calculate efficiency score correctly', () => {
      const quote = createMockQuote({
        notionalUSD: '100.0',
        gasUSD: '10.0',
        priceImpactBps: 50,
        confidence: 0.9
      });

      const efficiency = quoteScorer.calculateEfficiencyScore(quote);

      expect(efficiency).toBeGreaterThan(0);
      expect(efficiency).toBeLessThanOrEqual(100);
    });

    it('should penalize high price impact', () => {
      const quote1 = createMockQuote({
        notionalUSD: '100.0',
        gasUSD: '10.0',
        priceImpactBps: 50,
        confidence: 0.9
      });

      const quote2 = createMockQuote({
        notionalUSD: '100.0',
        gasUSD: '10.0',
        priceImpactBps: 500, // High price impact
        confidence: 0.9
      });

      const efficiency1 = quoteScorer.calculateEfficiencyScore(quote1);
      const efficiency2 = quoteScorer.calculateEfficiencyScore(quote2);

      expect(efficiency1).toBeGreaterThan(efficiency2);
    });

    it('should penalize low confidence', () => {
      const quote1 = createMockQuote({
        notionalUSD: '100.0',
        gasUSD: '10.0',
        priceImpactBps: 50,
        confidence: 0.9
      });

      const quote2 = createMockQuote({
        notionalUSD: '100.0',
        gasUSD: '10.0',
        priceImpactBps: 50,
        confidence: 0.5 // Low confidence
      });

      const efficiency1 = quoteScorer.calculateEfficiencyScore(quote1);
      const efficiency2 = quoteScorer.calculateEfficiencyScore(quote2);

      expect(efficiency1).toBeGreaterThan(efficiency2);
    });
  });

  describe('Market Conditions Impact', () => {
    it('should calculate market conditions impact', () => {
      const quote = createMockQuote({
        gasPrice: '20000000000'
      });

      const context = createMockContext({
        marketConditions: {
          volatility: 0.2,
          liquidity: 500000,
          gasPrice: '30000000000'
        }
      });

      const impact = quoteScorer.getMarketConditionsImpact(quote, context);

      expect(impact.volatilityImpact).toBeGreaterThan(0);
      expect(impact.liquidityImpact).toBeGreaterThan(0);
      expect(impact.gasPriceImpact).toBeGreaterThan(0);
      expect(impact.overallImpact).toBeGreaterThan(0);
    });

    it('should handle missing market conditions', () => {
      const quote = createMockQuote({});
      const context = createMockContext({ marketConditions: undefined });

      const impact = quoteScorer.getMarketConditionsImpact(quote, context);

      expect(impact.volatilityImpact).toBe(0);
      expect(impact.liquidityImpact).toBe(0);
      expect(impact.gasPriceImpact).toBe(0);
      expect(impact.overallImpact).toBe(0);
    });
  });

  describe('Rejection Reason Generation', () => {
    it('should generate single violation reason', async () => {
      const quotes = [
        createMockQuote({ 
          router: 'router1',
          amountIn: '0.0001', // Will fail min amount rule
        }),
      ];

      const context = createMockContext();

      const result = await quoteScorer.scoreAndRankQuotes(quotes, context);

      expect(result.rejectedQuotes[0].reason).toContain('Amount too small');
    });

    it('should generate multiple violation reason', async () => {
      const quotes = [
        createMockQuote({ 
          router: 'router1',
          amountIn: '0.0001', // Will fail min amount rule
          priceImpactBps: 1000, // Will fail max price impact rule
        }),
      ];

      const context = createMockContext();

      const result = await quoteScorer.scoreAndRankQuotes(quotes, context);

      expect(result.rejectedQuotes[0].reason).toContain(';');
      expect(result.rejectedQuotes[0].violations).toHaveLength(2);
    });
  });

  describe('Policy Engine Integration', () => {
    it('should provide access to policy engine', () => {
      const policyEngine = quoteScorer.getPolicyEngine();

      expect(policyEngine).toBeTruthy();
      expect(typeof policyEngine.evaluateQuote).toBe('function');
    });

    it('should evaluate single quote', async () => {
      const quote = createMockQuote({});
      const context = createMockContext();

      const result = await quoteScorer.evaluateQuote(quote, context);

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
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

function createMockContext(overrides: Partial<PolicyEvaluationContext> = {}): PolicyEvaluationContext {
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
