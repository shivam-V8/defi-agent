/**
 * Policy evaluation engine for quote validation and scoring
 */

import { 
  PolicyRule, 
  PolicyRuleType, 
  PolicySeverity, 
  PolicyEvaluationResult, 
  PolicyViolation,
  PolicyEvaluationContext,
  ChainPolicyConfig,
  ChainId,
  DEFAULT_POLICY_PARAMETERS,
  ROUTER_ALLOWLISTS,
  TOKEN_ALLOWLISTS
} from '../types/policy.js';
import { NormalizedQuote } from '../types/quote.js';

export class PolicyEngine {
  private chainPolicies: Map<ChainId, ChainPolicyConfig> = new Map();

  constructor() {
    this.initializeDefaultPolicies();
  }

  /**
   * Evaluate a quote against all applicable policies
   */
  async evaluateQuote(quote: NormalizedQuote, context: PolicyEvaluationContext): Promise<PolicyEvaluationResult> {
    const chainPolicy = this.getChainPolicy(context.chainId);
    const violations: PolicyViolation[] = [];
    const warnings: PolicyViolation[] = [];
    let score = 100; // Start with perfect score

    // Apply each enabled rule
    for (const rule of chainPolicy.rules) {
      if (!rule.enabled) continue;

      try {
        const result = await this.evaluateRule(quote, rule, context);
        
        if (result.violation) {
          if (result.violation.severity === PolicySeverity.ERROR) {
            violations.push(result.violation);
            score -= 20; // Major penalty for errors
          } else if (result.violation.severity === PolicySeverity.WARNING) {
            warnings.push(result.violation);
            score -= 5; // Minor penalty for warnings
          }
        }
      } catch (error) {
        // Rule evaluation failed - treat as warning
        warnings.push({
          ruleId: rule.id,
          ruleType: rule.type,
          severity: PolicySeverity.WARNING,
          message: `Rule evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: { error: error instanceof Error ? error.message : String(error) },
        });
        score -= 10;
      }
    }

    // Calculate net USD value
    const netUSD = this.calculateNetUSD(quote);

    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));

    return {
      passed: violations.length === 0,
      violations,
      warnings,
      score,
      netUSD,
    };
  }

  /**
   * Evaluate a single rule against a quote
   */
  private async evaluateRule(
    quote: NormalizedQuote, 
    rule: PolicyRule, 
    context: PolicyEvaluationContext
  ): Promise<{ violation?: PolicyViolation }> {
    switch (rule.type) {
      case PolicyRuleType.MIN_AMOUNT:
        return this.evaluateMinAmount(quote, rule);
      case PolicyRuleType.MAX_AMOUNT:
        return this.evaluateMaxAmount(quote, rule);
      case PolicyRuleType.MAX_PRICE_IMPACT:
        return this.evaluateMaxPriceImpact(quote, rule);
      case PolicyRuleType.MIN_LIQUIDITY:
        return this.evaluateMinLiquidity(quote, rule, context);
      case PolicyRuleType.ROUTER_ALLOWLIST:
        return this.evaluateRouterAllowlist(quote, rule, context);
      case PolicyRuleType.TOKEN_ALLOWLIST:
        return this.evaluateTokenAllowlist(quote, rule, context);
      case PolicyRuleType.MAX_GAS_COST:
        return this.evaluateMaxGasCost(quote, rule);
      case PolicyRuleType.MIN_NET_VALUE:
        return this.evaluateMinNetValue(quote, rule);
      case PolicyRuleType.MAX_SLIPPAGE:
        return this.evaluateMaxSlippage(quote, rule, context);
      case PolicyRuleType.DEADLINE_VALIDITY:
        return this.evaluateDeadlineValidity(quote, rule, context);
      default:
        return {};
    }
  }

  /**
   * Evaluate minimum amount rule
   */
  private evaluateMinAmount(quote: NormalizedQuote, rule: PolicyRule): { violation?: PolicyViolation } {
    const minAmount = parseFloat(rule.parameters.minAmount || DEFAULT_POLICY_PARAMETERS[PolicyRuleType.MIN_AMOUNT].minAmount);
    const amountIn = parseFloat(quote.amountIn);

    if (amountIn < minAmount) {
      return {
        violation: {
          ruleId: rule.id,
          ruleType: rule.type,
          severity: rule.severity,
          message: `Amount too small: ${amountIn} < ${minAmount}`,
          actualValue: amountIn,
          expectedValue: minAmount,
        },
      };
    }

    return {};
  }

  /**
   * Evaluate maximum amount rule
   */
  private evaluateMaxAmount(quote: NormalizedQuote, rule: PolicyRule): { violation?: PolicyViolation } {
    const maxAmount = parseFloat(rule.parameters.maxAmount || DEFAULT_POLICY_PARAMETERS[PolicyRuleType.MAX_AMOUNT].maxAmount);
    const amountIn = parseFloat(quote.amountIn);

    if (amountIn > maxAmount) {
      return {
        violation: {
          ruleId: rule.id,
          ruleType: rule.type,
          severity: rule.severity,
          message: `Amount too large: ${amountIn} > ${maxAmount}`,
          actualValue: amountIn,
          expectedValue: maxAmount,
        },
      };
    }

    return {};
  }

  /**
   * Evaluate maximum price impact rule
   */
  private evaluateMaxPriceImpact(quote: NormalizedQuote, rule: PolicyRule): { violation?: PolicyViolation } {
    const maxPriceImpactBps = rule.parameters.maxPriceImpactBps || DEFAULT_POLICY_PARAMETERS[PolicyRuleType.MAX_PRICE_IMPACT].maxPriceImpactBps;
    const priceImpactBps = quote.priceImpactBps;

    if (priceImpactBps > maxPriceImpactBps) {
      return {
        violation: {
          ruleId: rule.id,
          ruleType: rule.type,
          severity: rule.severity,
          message: `Price impact too high: ${priceImpactBps}bps > ${maxPriceImpactBps}bps`,
          actualValue: priceImpactBps,
          expectedValue: maxPriceImpactBps,
        },
      };
    }

    return {};
  }

  /**
   * Evaluate minimum liquidity rule
   */
  private evaluateMinLiquidity(quote: NormalizedQuote, rule: PolicyRule, context: PolicyEvaluationContext): { violation?: PolicyViolation } {
    const minLiquidityUSD = parseFloat(rule.parameters.minLiquidityUSD || DEFAULT_POLICY_PARAMETERS[PolicyRuleType.MIN_LIQUIDITY].minLiquidityUSD);
    
    // For now, we'll use a simplified liquidity check based on amount and price impact
    // In a real implementation, this would query liquidity data
    const estimatedLiquidity = parseFloat(quote.notionalUSD) * (1 + quote.priceImpactBps / 10000);
    
    if (estimatedLiquidity < minLiquidityUSD) {
      return {
        violation: {
          ruleId: rule.id,
          ruleType: rule.type,
          severity: rule.severity,
          message: `Insufficient liquidity: ${estimatedLiquidity} < ${minLiquidityUSD} USD`,
          actualValue: estimatedLiquidity,
          expectedValue: minLiquidityUSD,
        },
      };
    }

    return {};
  }

  /**
   * Evaluate router allowlist rule
   */
  private evaluateRouterAllowlist(quote: NormalizedQuote, rule: PolicyRule, context: PolicyEvaluationContext): { violation?: PolicyViolation } {
    const allowedRouters = ROUTER_ALLOWLISTS[context.chainId as keyof typeof ROUTER_ALLOWLISTS] || [];
    
    if (!allowedRouters.includes(quote.router.toLowerCase())) {
      return {
        violation: {
          ruleId: rule.id,
          ruleType: rule.type,
          severity: rule.severity,
          message: `Router not allowed: ${quote.router}`,
          actualValue: quote.router,
          expectedValue: allowedRouters.join(', '),
        },
      };
    }

    return {};
  }

  /**
   * Evaluate token allowlist rule
   */
  private evaluateTokenAllowlist(quote: NormalizedQuote, rule: PolicyRule, context: PolicyEvaluationContext): { violation?: PolicyViolation } {
    const allowedTokens = TOKEN_ALLOWLISTS[context.chainId as keyof typeof TOKEN_ALLOWLISTS] || [];
    const tokenInAllowed = allowedTokens.includes(quote.tokenIn.toLowerCase());
    const tokenOutAllowed = allowedTokens.includes(quote.tokenOut.toLowerCase());

    if (!tokenInAllowed || !tokenOutAllowed) {
      const rejectedTokens = [];
      if (!tokenInAllowed) rejectedTokens.push(quote.tokenIn);
      if (!tokenOutAllowed) rejectedTokens.push(quote.tokenOut);

      return {
        violation: {
          ruleId: rule.id,
          ruleType: rule.type,
          severity: rule.severity,
          message: `Token not allowed: ${rejectedTokens.join(', ')}`,
          actualValue: rejectedTokens.join(', '),
          expectedValue: allowedTokens.join(', '),
        },
      };
    }

    return {};
  }

  /**
   * Evaluate maximum gas cost rule
   */
  private evaluateMaxGasCost(quote: NormalizedQuote, rule: PolicyRule): { violation?: PolicyViolation } {
    const maxGasCostUSD = parseFloat(rule.parameters.maxGasCostUSD || DEFAULT_POLICY_PARAMETERS[PolicyRuleType.MAX_GAS_COST].maxGasCostUSD);
    const gasCostUSD = parseFloat(quote.gasUSD);

    if (gasCostUSD > maxGasCostUSD) {
      return {
        violation: {
          ruleId: rule.id,
          ruleType: rule.type,
          severity: rule.severity,
          message: `Gas cost too high: ${gasCostUSD} > ${maxGasCostUSD} USD`,
          actualValue: gasCostUSD,
          expectedValue: maxGasCostUSD,
        },
      };
    }

    return {};
  }

  /**
   * Evaluate minimum net value rule
   */
  private evaluateMinNetValue(quote: NormalizedQuote, rule: PolicyRule): { violation?: PolicyViolation } {
    const minNetValueUSD = parseFloat(rule.parameters.minNetValueUSD || DEFAULT_POLICY_PARAMETERS[PolicyRuleType.MIN_NET_VALUE].minNetValueUSD);
    const netUSD = parseFloat(this.calculateNetUSD(quote));

    if (netUSD < minNetValueUSD) {
      return {
        violation: {
          ruleId: rule.id,
          ruleType: rule.type,
          severity: rule.severity,
          message: `Net value too low: ${netUSD} < ${minNetValueUSD} USD`,
          actualValue: netUSD,
          expectedValue: minNetValueUSD,
        },
      };
    }

    return {};
  }

  /**
   * Evaluate maximum slippage rule
   */
  private evaluateMaxSlippage(quote: NormalizedQuote, rule: PolicyRule, context: PolicyEvaluationContext): { violation?: PolicyViolation } {
    const maxSlippageBps = rule.parameters.maxSlippageBps || DEFAULT_POLICY_PARAMETERS[PolicyRuleType.MAX_SLIPPAGE].maxSlippageBps;
    
    // Calculate effective slippage from price impact
    const effectiveSlippageBps = quote.priceImpactBps;

    if (effectiveSlippageBps > maxSlippageBps) {
      return {
        violation: {
          ruleId: rule.id,
          ruleType: rule.type,
          severity: rule.severity,
          message: `Slippage too high: ${effectiveSlippageBps}bps > ${maxSlippageBps}bps`,
          actualValue: effectiveSlippageBps,
          expectedValue: maxSlippageBps,
        },
      };
    }

    return {};
  }

  /**
   * Evaluate deadline validity rule
   */
  private evaluateDeadlineValidity(quote: NormalizedQuote, rule: PolicyRule, context: PolicyEvaluationContext): { violation?: PolicyViolation } {
    const maxDeadlineMinutes = rule.parameters.maxDeadlineMinutes || DEFAULT_POLICY_PARAMETERS[PolicyRuleType.DEADLINE_VALIDITY].maxDeadlineMinutes;
    const currentTime = Math.floor(Date.now() / 1000);
    const deadlineMinutes = (quote.deadline - currentTime) / 60;

    if (deadlineMinutes > maxDeadlineMinutes) {
      return {
        violation: {
          ruleId: rule.id,
          ruleType: rule.type,
          severity: rule.severity,
          message: `Deadline too far: ${deadlineMinutes.toFixed(1)}min > ${maxDeadlineMinutes}min`,
          actualValue: deadlineMinutes,
          expectedValue: maxDeadlineMinutes,
        },
      };
    }

    if (deadlineMinutes < 0) {
      return {
        violation: {
          ruleId: rule.id,
          ruleType: rule.type,
          severity: PolicySeverity.ERROR,
          message: `Deadline expired: ${deadlineMinutes.toFixed(1)}min ago`,
          actualValue: deadlineMinutes,
          expectedValue: 0,
        },
      };
    }

    return {};
  }

  /**
   * Calculate net USD value (expectedOutUSD - gasUSD)
   */
  private calculateNetUSD(quote: NormalizedQuote): string {
    const expectedOutUSD = parseFloat(quote.notionalUSD);
    const gasUSD = parseFloat(quote.gasUSD);
    const netUSD = expectedOutUSD - gasUSD;
    return netUSD.toFixed(6);
  }

  /**
   * Get chain policy configuration
   */
  getChainPolicy(chainId: ChainId): ChainPolicyConfig {
    return this.chainPolicies.get(chainId) || this.getDefaultChainPolicy(chainId);
  }

  /**
   * Update chain policy configuration
   */
  updateChainPolicy(chainId: ChainId, config: ChainPolicyConfig): void {
    this.chainPolicies.set(chainId, config);
  }

  /**
   * Check if router is allowed for chain
   */
  isRouterAllowed(router: string, chainId: ChainId): boolean {
    const allowedRouters = ROUTER_ALLOWLISTS[chainId as keyof typeof ROUTER_ALLOWLISTS] || [];
    return allowedRouters.includes(router.toLowerCase());
  }

  /**
   * Check if token is allowed for chain
   */
  isTokenAllowed(token: string, chainId: ChainId): boolean {
    const allowedTokens = TOKEN_ALLOWLISTS[chainId as keyof typeof TOKEN_ALLOWLISTS] || [];
    return allowedTokens.includes(token.toLowerCase());
  }

  /**
   * Initialize default policies for all chains
   */
  private initializeDefaultPolicies(): void {
    const chains = Object.values(ChainId).filter(id => typeof id === 'number') as ChainId[];
    
    for (const chainId of chains) {
      const config = this.getDefaultChainPolicy(chainId);
      this.chainPolicies.set(chainId, config);
    }
  }

  /**
   * Get default policy configuration for a chain
   */
  private getDefaultChainPolicy(chainId: ChainId): ChainPolicyConfig {
    return {
      chainId,
      enabled: true,
      lastUpdated: Date.now(),
      rules: [
        {
          id: 'min_amount',
          type: PolicyRuleType.MIN_AMOUNT,
          severity: PolicySeverity.ERROR,
          enabled: true,
          parameters: DEFAULT_POLICY_PARAMETERS[PolicyRuleType.MIN_AMOUNT],
          description: 'Minimum trade amount',
        },
        {
          id: 'max_amount',
          type: PolicyRuleType.MAX_AMOUNT,
          severity: PolicySeverity.ERROR,
          enabled: true,
          parameters: DEFAULT_POLICY_PARAMETERS[PolicyRuleType.MAX_AMOUNT],
          description: 'Maximum trade amount',
        },
        {
          id: 'max_price_impact',
          type: PolicyRuleType.MAX_PRICE_IMPACT,
          severity: PolicySeverity.ERROR,
          enabled: true,
          parameters: DEFAULT_POLICY_PARAMETERS[PolicyRuleType.MAX_PRICE_IMPACT],
          description: 'Maximum price impact',
        },
        {
          id: 'router_allowlist',
          type: PolicyRuleType.ROUTER_ALLOWLIST,
          severity: PolicySeverity.ERROR,
          enabled: true,
          parameters: {},
          description: 'Router allowlist validation',
        },
        {
          id: 'token_allowlist',
          type: PolicyRuleType.TOKEN_ALLOWLIST,
          severity: PolicySeverity.ERROR,
          enabled: true,
          parameters: {},
          description: 'Token allowlist validation',
        },
        {
          id: 'max_gas_cost',
          type: PolicyRuleType.MAX_GAS_COST,
          severity: PolicySeverity.WARNING,
          enabled: true,
          parameters: DEFAULT_POLICY_PARAMETERS[PolicyRuleType.MAX_GAS_COST],
          description: 'Maximum gas cost',
        },
        {
          id: 'min_net_value',
          type: PolicyRuleType.MIN_NET_VALUE,
          severity: PolicySeverity.ERROR,
          enabled: true,
          parameters: DEFAULT_POLICY_PARAMETERS[PolicyRuleType.MIN_NET_VALUE],
          description: 'Minimum net value',
        },
        {
          id: 'deadline_validity',
          type: PolicyRuleType.DEADLINE_VALIDITY,
          severity: PolicySeverity.ERROR,
          enabled: true,
          parameters: DEFAULT_POLICY_PARAMETERS[PolicyRuleType.DEADLINE_VALIDITY],
          description: 'Deadline validity check',
        },
      ],
    };
  }
}
