/**
 * Quote scoring and ranking service
 */

import { NormalizedQuote, ChainId } from '../types/quote.js';
import { PolicyEvaluationResult, QuoteScore, PolicyEvaluationContext } from '../types/policy.js';
import { PolicyEngine } from './policyEngine.js';

export class QuoteScorer {
  private policyEngine: PolicyEngine;

  constructor() {
    this.policyEngine = new PolicyEngine();
  }

  /**
   * Score and rank quotes by net USD value
   */
  async scoreAndRankQuotes(
    quotes: NormalizedQuote[], 
    context: PolicyEvaluationContext
  ): Promise<{
    rankedQuotes: QuoteScore[];
    bestQuote: QuoteScore | null;
    rejectedQuotes: Array<{
      quote: NormalizedQuote;
      violations: string[];
      reason: string;
    }>;
  }> {
    const quoteScores: QuoteScore[] = [];
    const rejectedQuotes: Array<{
      quote: NormalizedQuote;
      violations: string[];
      reason: string;
    }> = [];

    // Evaluate each quote
    for (const quote of quotes) {
      try {
        const evaluation = await this.policyEngine.evaluateQuote(quote, context);
        const netUSD = this.calculateNetUSD(quote);
        
        const quoteScore: QuoteScore = {
          quote,
          netUSD,
          score: evaluation.score,
          violations: evaluation.violations,
          warnings: evaluation.warnings,
          passed: evaluation.passed,
        };

        if (evaluation.passed) {
          quoteScores.push(quoteScore);
        } else {
          rejectedQuotes.push({
            quote,
            violations: evaluation.violations.map(v => v.message),
            reason: this.generateRejectionReason(evaluation.violations),
          });
        }
      } catch (error) {
        // Quote evaluation failed
        rejectedQuotes.push({
          quote,
          violations: ['Evaluation failed'],
          reason: `Quote evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    // Sort by net USD value (descending)
    quoteScores.sort((a, b) => {
      const netUSDA = parseFloat(a.netUSD);
      const netUSDB = parseFloat(b.netUSD);
      
      if (netUSDA !== netUSDB) {
        return netUSDB - netUSDA; // Higher net USD first
      }
      
      // If net USD is equal, sort by score (higher is better)
      return b.score - a.score;
    });

    return {
      rankedQuotes: quoteScores,
      bestQuote: quoteScores.length > 0 ? quoteScores[0] : null,
      rejectedQuotes,
    };
  }

  /**
   * Calculate net USD value for a quote
   */
  calculateNetUSD(quote: NormalizedQuote): string {
    const expectedOutUSD = parseFloat(quote.notionalUSD);
    const gasUSD = parseFloat(quote.gasUSD);
    const netUSD = expectedOutUSD - gasUSD;
    return netUSD.toFixed(6);
  }

  /**
   * Generate human-readable rejection reason
   */
  private generateRejectionReason(violations: Array<{ message: string; ruleType: string }>): string {
    if (violations.length === 0) {
      return 'No specific reason provided';
    }

    if (violations.length === 1) {
      return violations[0].message;
    }

    // Group violations by type
    const violationGroups = violations.reduce((groups, violation) => {
      const type = violation.ruleType;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(violation.message);
      return groups;
    }, {} as Record<string, string[]>);

    const groupMessages = Object.entries(violationGroups).map(([type, messages]) => {
      if (messages.length === 1) {
        return messages[0];
      }
      return `${type}: ${messages.join(', ')}`;
    });

    return groupMessages.join('; ');
  }

  /**
   * Get policy engine instance
   */
  getPolicyEngine(): PolicyEngine {
    return this.policyEngine;
  }

  /**
   * Evaluate a single quote
   */
  async evaluateQuote(quote: NormalizedQuote, context: PolicyEvaluationContext): Promise<PolicyEvaluationResult> {
    return await this.policyEngine.evaluateQuote(quote, context);
  }

  /**
   * Get detailed scoring breakdown for a quote
   */
  getScoringBreakdown(quote: NormalizedQuote): {
    expectedOutUSD: string;
    gasUSD: string;
    netUSD: string;
    priceImpactBps: number;
    confidence: number;
    factors: Array<{
      name: string;
      value: string | number;
      impact: 'positive' | 'negative' | 'neutral';
      weight: number;
    }>;
  } {
    const expectedOutUSD = parseFloat(quote.notionalUSD);
    const gasUSD = parseFloat(quote.gasUSD);
    const netUSD = expectedOutUSD - gasUSD;
    const priceImpactBps = quote.priceImpactBps;
    const confidence = quote.confidence;

    const factors = [
      {
        name: 'Expected Output USD',
        value: expectedOutUSD.toFixed(6),
        impact: 'positive' as 'positive' | 'negative' | 'neutral',
        weight: 0.4,
      },
      {
        name: 'Gas Cost USD',
        value: gasUSD.toFixed(6),
        impact: 'negative' as 'positive' | 'negative' | 'neutral',
        weight: 0.2,
      },
      {
        name: 'Price Impact (bps)',
        value: priceImpactBps,
        impact: (priceImpactBps > 100 ? 'negative' : 'neutral') as 'positive' | 'negative' | 'neutral',
        weight: 0.2,
      },
      {
        name: 'Confidence Score',
        value: (confidence * 100).toFixed(1) + '%',
        impact: (confidence > 0.8 ? 'positive' : confidence < 0.6 ? 'negative' : 'neutral') as 'positive' | 'negative' | 'neutral',
        weight: 0.2,
      },
    ];

    return {
      expectedOutUSD: expectedOutUSD.toFixed(6),
      gasUSD: gasUSD.toFixed(6),
      netUSD: netUSD.toFixed(6),
      priceImpactBps,
      confidence,
      factors,
    };
  }

  /**
   * Calculate quote efficiency score (0-100)
   */
  calculateEfficiencyScore(quote: NormalizedQuote): number {
    const netUSD = parseFloat(this.calculateNetUSD(quote));
    const expectedOutUSD = parseFloat(quote.notionalUSD);
    const gasUSD = parseFloat(quote.gasUSD);
    
    // Efficiency = (net value / expected output) * 100
    const efficiency = (netUSD / expectedOutUSD) * 100;
    
    // Apply penalties for high price impact and low confidence
    const priceImpactPenalty = Math.min(quote.priceImpactBps / 10, 20); // Max 20 point penalty
    const confidencePenalty = (1 - quote.confidence) * 20; // Max 20 point penalty
    
    const finalScore = Math.max(0, efficiency - priceImpactPenalty - confidencePenalty);
    return Math.min(100, finalScore);
  }

  /**
   * Get market conditions impact on scoring
   */
  getMarketConditionsImpact(
    quote: NormalizedQuote, 
    context: PolicyEvaluationContext
  ): {
    volatilityImpact: number;
    liquidityImpact: number;
    gasPriceImpact: number;
    overallImpact: number;
  } {
    const marketConditions = context.marketConditions;
    
    if (!marketConditions) {
      return {
        volatilityImpact: 0,
        liquidityImpact: 0,
        gasPriceImpact: 0,
        overallImpact: 0,
      };
    }

    // Volatility impact (higher volatility = lower score)
    const volatilityImpact = Math.min(marketConditions.volatility * 10, 20);
    
    // Liquidity impact (lower liquidity = lower score)
    const liquidityImpact = Math.max(0, 20 - marketConditions.liquidity / 1000);
    
    // Gas price impact (higher gas price = lower score)
    const currentGasPrice = parseFloat(quote.gasPrice);
    const marketGasPrice = parseFloat(marketConditions.gasPrice);
    const gasPriceRatio = currentGasPrice / marketGasPrice;
    const gasPriceImpact = Math.max(0, (gasPriceRatio - 1) * 20);
    
    const overallImpact = volatilityImpact + liquidityImpact + gasPriceImpact;
    
    return {
      volatilityImpact,
      liquidityImpact,
      gasPriceImpact,
      overallImpact: Math.min(50, overallImpact), // Cap at 50 points
    };
  }
}
