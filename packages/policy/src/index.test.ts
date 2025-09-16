import { describe, it, expect } from 'vitest';
import {
  CHAIN_IDS,
  CHAIN_NAMES,
  ROUTER_TYPES,
  ROUTER_ADDRESSES,
  DEFAULT_POLICY_CONFIG,
  DEFAULT_POLICY_PARAMETERS,
  DEFAULT_SUPPORTED_CHAINS,
  DEFAULT_ROUTER_ALLOWLIST,
  isChainSupported,
  isRouterAllowed,
  getAllowedRouters,
  evaluateQuote,
  type PolicyConfig,
  type Quote,
  type EvaluationResult,
} from './index.js';

describe('Policy Package', () => {
  describe('Constants', () => {
    it('should have correct chain IDs', () => {
      expect(CHAIN_IDS.ETHEREUM).toBe(1);
      expect(CHAIN_IDS.ARBITRUM).toBe(42161);
      expect(CHAIN_IDS.OPTIMISM).toBe(10);
      expect(CHAIN_IDS.SEPOLIA).toBe(11155111);
      expect(CHAIN_IDS.ARBITRUM_SEPOLIA).toBe(421614);
      expect(CHAIN_IDS.OPTIMISM_SEPOLIA).toBe(11155420);
    });

    it('should have correct chain names', () => {
      expect(CHAIN_NAMES.ETHEREUM).toBe('ethereum');
      expect(CHAIN_NAMES.ARBITRUM).toBe('arbitrum');
      expect(CHAIN_NAMES.OPTIMISM).toBe('optimism');
      expect(CHAIN_NAMES.SEPOLIA).toBe('sepolia');
      expect(CHAIN_NAMES.ARBITRUM_SEPOLIA).toBe('arbitrum-sepolia');
      expect(CHAIN_NAMES.OPTIMISM_SEPOLIA).toBe('optimism-sepolia');
    });

    it('should have correct router types', () => {
      expect(ROUTER_TYPES.UNISWAP).toBe(0);
      expect(ROUTER_TYPES.ONEINCH).toBe(1);
    });

    it('should have correct router addresses', () => {
      expect(ROUTER_ADDRESSES.UNISWAP_V3_ETHEREUM).toBe('0xE592427A0AEce92De3Edee1F18E0157C05861564');
      expect(ROUTER_ADDRESSES.ONEINCH_ETHEREUM).toBe('0x1111111254EEB25477B68fb85Ed929f73A960582');
    });
  });

  describe('Default Policy Configuration', () => {
    it('should have correct default policy parameters', () => {
      expect(DEFAULT_POLICY_PARAMETERS.maxSlippageBps).toBe(50);
      expect(DEFAULT_POLICY_PARAMETERS.maxPriceImpactBps).toBe(150);
      expect(DEFAULT_POLICY_PARAMETERS.minLiquidityUSD).toBe(BigInt('250000000000000000000000'));
      expect(DEFAULT_POLICY_PARAMETERS.ttlSeconds).toBe(120);
      expect(DEFAULT_POLICY_PARAMETERS.approvalMultiplier).toBe(102);
    });

    it('should have all supported chains', () => {
      expect(DEFAULT_SUPPORTED_CHAINS.has(CHAIN_IDS.ETHEREUM)).toBe(true);
      expect(DEFAULT_SUPPORTED_CHAINS.has(CHAIN_IDS.ARBITRUM)).toBe(true);
      expect(DEFAULT_SUPPORTED_CHAINS.has(CHAIN_IDS.OPTIMISM)).toBe(true);
      expect(DEFAULT_SUPPORTED_CHAINS.has(CHAIN_IDS.SEPOLIA)).toBe(true);
      expect(DEFAULT_SUPPORTED_CHAINS.has(CHAIN_IDS.ARBITRUM_SEPOLIA)).toBe(true);
      expect(DEFAULT_SUPPORTED_CHAINS.has(CHAIN_IDS.OPTIMISM_SEPOLIA)).toBe(true);
    });

    it('should have correct default router allowlist', () => {
      expect(DEFAULT_ROUTER_ALLOWLIST[CHAIN_IDS.ETHEREUM][ROUTER_TYPES.UNISWAP][ROUTER_ADDRESSES.UNISWAP_V3_ETHEREUM]).toBe(true);
      expect(DEFAULT_ROUTER_ALLOWLIST[CHAIN_IDS.ETHEREUM][ROUTER_TYPES.ONEINCH][ROUTER_ADDRESSES.ONEINCH_ETHEREUM]).toBe(true);
    });

    it('should have correct default policy config', () => {
      expect(DEFAULT_POLICY_CONFIG.parameters).toEqual(DEFAULT_POLICY_PARAMETERS);
      expect(DEFAULT_POLICY_CONFIG.supportedChains).toEqual(DEFAULT_SUPPORTED_CHAINS);
      expect(DEFAULT_POLICY_CONFIG.routerAllowlist).toEqual(DEFAULT_ROUTER_ALLOWLIST);
      expect(DEFAULT_POLICY_CONFIG.maxNotionalPerTxUSD).toBe(BigInt('1000000000000000000000'));
    });
  });

  describe('Utility Functions', () => {
    describe('isChainSupported', () => {
      it('should return true for supported chains', () => {
        expect(isChainSupported(CHAIN_IDS.ETHEREUM, DEFAULT_POLICY_CONFIG)).toBe(true);
        expect(isChainSupported(CHAIN_IDS.ARBITRUM, DEFAULT_POLICY_CONFIG)).toBe(true);
        expect(isChainSupported(CHAIN_IDS.OPTIMISM, DEFAULT_POLICY_CONFIG)).toBe(true);
      });

      it('should return false for unsupported chains', () => {
        const unsupportedChainId = 999999 as any;
        expect(isChainSupported(unsupportedChainId, DEFAULT_POLICY_CONFIG)).toBe(false);
      });
    });

    describe('isRouterAllowed', () => {
      it('should return true for allowed routers', () => {
        expect(isRouterAllowed(
          CHAIN_IDS.ETHEREUM,
          ROUTER_TYPES.UNISWAP,
          ROUTER_ADDRESSES.UNISWAP_V3_ETHEREUM,
          DEFAULT_POLICY_CONFIG
        )).toBe(true);

        expect(isRouterAllowed(
          CHAIN_IDS.ETHEREUM,
          ROUTER_TYPES.ONEINCH,
          ROUTER_ADDRESSES.ONEINCH_ETHEREUM,
          DEFAULT_POLICY_CONFIG
        )).toBe(true);
      });

      it('should return false for disallowed routers', () => {
        expect(isRouterAllowed(
          CHAIN_IDS.ETHEREUM,
          ROUTER_TYPES.UNISWAP,
          '0x0000000000000000000000000000000000000000',
          DEFAULT_POLICY_CONFIG
        )).toBe(false);

        expect(isRouterAllowed(
          999999 as any, // unsupported chain
          ROUTER_TYPES.UNISWAP,
          ROUTER_ADDRESSES.UNISWAP_V3_ETHEREUM,
          DEFAULT_POLICY_CONFIG
        )).toBe(false);
      });
    });

    describe('getAllowedRouters', () => {
      it('should return allowed routers for supported chain and router type', () => {
        const allowedRouters = getAllowedRouters(
          CHAIN_IDS.ETHEREUM,
          ROUTER_TYPES.UNISWAP,
          DEFAULT_POLICY_CONFIG
        );
        
        expect(allowedRouters).toContain(ROUTER_ADDRESSES.UNISWAP_V3_ETHEREUM);
        expect(allowedRouters.length).toBe(1);
      });

      it('should return empty array for unsupported chain', () => {
        const allowedRouters = getAllowedRouters(
          999999 as any, // unsupported chain
          ROUTER_TYPES.UNISWAP,
          DEFAULT_POLICY_CONFIG
        );
        
        expect(allowedRouters).toEqual([]);
      });

      it('should return empty array for unsupported router type', () => {
        const allowedRouters = getAllowedRouters(
          CHAIN_IDS.ETHEREUM,
          999 as any, // unsupported router type
          DEFAULT_POLICY_CONFIG
        );
        
        expect(allowedRouters).toEqual([]);
      });
    });
  });

  // Helper function to create a valid quote
  const createValidQuote = (): Quote => ({
    chainId: CHAIN_IDS.ETHEREUM,
    tokenIn: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
    tokenOut: '0xB0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C4C',
    amountIn: BigInt('1000000000000000000'), // 1 ETH
    expectedOut: BigInt('2000000000000000000'), // 2 USDC
    priceImpactBps: 50, // 0.5%
    notionalInUSD: BigInt('500000000000000000000'), // $500 (under $1000 limit)
    poolLiquidityUSD: BigInt('500000000000000000000000'), // $500k
    routerType: ROUTER_TYPES.UNISWAP,
    routerAddress: ROUTER_ADDRESSES.UNISWAP_V3_ETHEREUM,
  });

  describe('Quote Evaluation', () => {

    describe('Passing Cases', () => {
      it('should pass for valid quote', () => {
        const quote = createValidQuote();
        const result = evaluateQuote(quote, DEFAULT_POLICY_CONFIG);
        
        expect(result.passed).toBe(true);
        expect(result.violations).toEqual([]);
      });

      it('should pass for quote at boundary values', () => {
        const quote = createValidQuote();
        quote.priceImpactBps = 150; // exactly at max
        quote.notionalInUSD = BigInt('1000000000000000000000'); // exactly at max
        quote.poolLiquidityUSD = BigInt('250000000000000000000000'); // exactly at min
        
        const result = evaluateQuote(quote, DEFAULT_POLICY_CONFIG);
        
        expect(result.passed).toBe(true);
        expect(result.violations).toEqual([]);
      });
    });

    describe('Failing Cases', () => {
      it('should fail for unsupported chain', () => {
        const quote = createValidQuote();
        quote.chainId = 999999 as any;
        
        const result = evaluateQuote(quote, DEFAULT_POLICY_CONFIG);
        
        expect(result.passed).toBe(false);
        expect(result.violations).toContain('ChainNotSupported');
      });

      it('should fail for disallowed router', () => {
        const quote = createValidQuote();
        quote.routerAddress = '0x0000000000000000000000000000000000000000';
        
        const result = evaluateQuote(quote, DEFAULT_POLICY_CONFIG);
        
        expect(result.passed).toBe(false);
        expect(result.violations).toContain('RouterNotAllowed');
      });

      it('should fail for notional too large', () => {
        const quote = createValidQuote();
        quote.notionalInUSD = BigInt('2000000000000000000000'); // $2000 > $1000 max
        
        const result = evaluateQuote(quote, DEFAULT_POLICY_CONFIG);
        
        expect(result.passed).toBe(false);
        expect(result.violations).toContain('NotionalTooLarge');
      });

      it('should fail for price impact too high', () => {
        const quote = createValidQuote();
        quote.priceImpactBps = 200; // 2% > 1.5% max
        
        const result = evaluateQuote(quote, DEFAULT_POLICY_CONFIG);
        
        expect(result.passed).toBe(false);
        expect(result.violations).toContain('PriceImpactHigh');
      });

      it('should fail for liquidity too low', () => {
        const quote = createValidQuote();
        quote.poolLiquidityUSD = BigInt('100000000000000000000000'); // $100k < $250k min
        
        const result = evaluateQuote(quote, DEFAULT_POLICY_CONFIG);
        
        expect(result.passed).toBe(false);
        expect(result.violations).toContain('LiquidityTooLow');
      });

      it('should fail for zero amount in', () => {
        const quote = createValidQuote();
        quote.amountIn = BigInt('0');
        
        const result = evaluateQuote(quote, DEFAULT_POLICY_CONFIG);
        
        expect(result.passed).toBe(false);
        expect(result.violations).toContain('ZeroAmountIn');
      });

      it('should fail for zero expected out', () => {
        const quote = createValidQuote();
        quote.expectedOut = BigInt('0');
        
        const result = evaluateQuote(quote, DEFAULT_POLICY_CONFIG);
        
        expect(result.passed).toBe(false);
        expect(result.violations).toContain('ZeroExpectedOut');
      });

      it('should fail for multiple violations', () => {
        const quote = createValidQuote();
        quote.chainId = 999999 as any; // unsupported chain
        quote.notionalInUSD = BigInt('2000000000000000000000'); // too large
        quote.priceImpactBps = 200; // too high
        quote.poolLiquidityUSD = BigInt('100000000000000000000000'); // too low
        
        const result = evaluateQuote(quote, DEFAULT_POLICY_CONFIG);
        
        expect(result.passed).toBe(false);
        expect(result.violations).toContain('ChainNotSupported');
        expect(result.violations).toContain('RouterNotAllowed');
        expect(result.violations).toContain('NotionalTooLarge');
        expect(result.violations).toContain('PriceImpactHigh');
        expect(result.violations).toContain('LiquidityTooLow');
        expect(result.violations.length).toBe(5);
      });
    });

    describe('Edge Cases', () => {
      it('should handle very large numbers', () => {
        const quote = createValidQuote();
        quote.amountIn = BigInt('1000000000000000000000000'); // 1000 ETH
        quote.expectedOut = BigInt('2000000000000000000000000'); // 2000 USDC
        quote.notionalInUSD = BigInt('2000000000000000000000000'); // $2M
        quote.poolLiquidityUSD = BigInt('10000000000000000000000000'); // $10M
        
        const result = evaluateQuote(quote, DEFAULT_POLICY_CONFIG);
        
        expect(result.passed).toBe(false);
        expect(result.violations).toContain('NotionalTooLarge');
      });

      it('should handle very small numbers', () => {
        const quote = createValidQuote();
        quote.amountIn = BigInt('1'); // 1 wei
        quote.expectedOut = BigInt('1'); // 1 wei
        quote.notionalInUSD = BigInt('1'); // $0.000000000000000001
        quote.poolLiquidityUSD = BigInt('1'); // $0.000000000000000001
        
        const result = evaluateQuote(quote, DEFAULT_POLICY_CONFIG);
        
        expect(result.passed).toBe(false);
        expect(result.violations).toContain('LiquidityTooLow');
      });

      it('should handle zero price impact', () => {
        const quote = createValidQuote();
        quote.priceImpactBps = 0;
        
        const result = evaluateQuote(quote, DEFAULT_POLICY_CONFIG);
        
        expect(result.passed).toBe(true);
        expect(result.violations).toEqual([]);
      });

      it('should handle maximum price impact', () => {
        const quote = createValidQuote();
        quote.priceImpactBps = 150; // exactly at max
        
        const result = evaluateQuote(quote, DEFAULT_POLICY_CONFIG);
        
        expect(result.passed).toBe(true);
        expect(result.violations).toEqual([]);
      });
    });

    describe('Custom Policy Configuration', () => {
      it('should work with custom policy parameters', () => {
        const customPolicy: PolicyConfig = {
          parameters: {
            maxSlippageBps: 100, // 1%
            maxPriceImpactBps: 300, // 3%
            minLiquidityUSD: BigInt('100000000000000000000000'), // $100k
            ttlSeconds: 300, // 5 minutes
            approvalMultiplier: 105, // 1.05x
          },
          supportedChains: new Set([CHAIN_IDS.ETHEREUM]),
          routerAllowlist: {
            [CHAIN_IDS.ETHEREUM]: {
              [ROUTER_TYPES.UNISWAP]: {
                [ROUTER_ADDRESSES.UNISWAP_V3_ETHEREUM]: true,
              },
            },
          },
          maxNotionalPerTxUSD: BigInt('5000000000000000000000'), // $5000
        };

        const quote = createValidQuote();
        quote.priceImpactBps = 200; // 2% - would fail with default policy
        quote.notionalInUSD = BigInt('3000000000000000000000'); // $3000 - would fail with default policy
        quote.poolLiquidityUSD = BigInt('150000000000000000000000'); // $150k - would fail with default policy
        
        const result = evaluateQuote(quote, customPolicy);
        
        expect(result.passed).toBe(true);
        expect(result.violations).toEqual([]);
      });

      it('should work with restricted chain support', () => {
        const restrictedPolicy: PolicyConfig = {
          ...DEFAULT_POLICY_CONFIG,
          supportedChains: new Set([CHAIN_IDS.ETHEREUM]), // only Ethereum
        };

        const quote = createValidQuote();
        quote.chainId = CHAIN_IDS.ARBITRUM; // Arbitrum not supported
        
        const result = evaluateQuote(quote, restrictedPolicy);
        
        expect(result.passed).toBe(false);
        expect(result.violations).toContain('ChainNotSupported');
      });

      it('should work with restricted router allowlist', () => {
        const restrictedPolicy: PolicyConfig = {
          ...DEFAULT_POLICY_CONFIG,
          routerAllowlist: {
            [CHAIN_IDS.ETHEREUM]: {
              [ROUTER_TYPES.UNISWAP]: {
                [ROUTER_ADDRESSES.UNISWAP_V3_ETHEREUM]: true,
              },
              // 1inch not allowed
            },
          },
        };

        const quote = createValidQuote();
        quote.routerType = ROUTER_TYPES.ONEINCH;
        quote.routerAddress = ROUTER_ADDRESSES.ONEINCH_ETHEREUM;
        
        const result = evaluateQuote(quote, restrictedPolicy);
        
        expect(result.passed).toBe(false);
        expect(result.violations).toContain('RouterNotAllowed');
      });
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct types for chain IDs', () => {
      // This should compile without errors
      const validChainId: typeof CHAIN_IDS.ETHEREUM = CHAIN_IDS.ETHEREUM;
      expect(validChainId).toBe(1);
    });

    it('should enforce correct types for router types', () => {
      // This should compile without errors
      const validRouterType: typeof ROUTER_TYPES.UNISWAP = ROUTER_TYPES.UNISWAP;
      expect(validRouterType).toBe(0);
    });

    it('should enforce correct types for router addresses', () => {
      // This should compile without errors
      const validRouterAddress: typeof ROUTER_ADDRESSES.UNISWAP_V3_ETHEREUM = ROUTER_ADDRESSES.UNISWAP_V3_ETHEREUM;
      expect(validRouterAddress).toBe('0xE592427A0AEce92De3Edee1F18E0157C05861564');
    });
  });

  describe('Symmetry with On-Chain Logic', () => {
    it('should match on-chain violation strings exactly', () => {
      const quote = createValidQuote();
      quote.notionalInUSD = BigInt('2000000000000000000000'); // too large
      quote.priceImpactBps = 200; // too high
      quote.poolLiquidityUSD = BigInt('100000000000000000000000'); // too low
      quote.amountIn = BigInt('0'); // zero
      quote.expectedOut = BigInt('0'); // zero
      
      const result = evaluateQuote(quote, DEFAULT_POLICY_CONFIG);
      
      // These should match the exact strings from the DeFiAgent contract
      expect(result.violations).toContain('NotionalTooLarge');
      expect(result.violations).toContain('PriceImpactHigh');
      expect(result.violations).toContain('LiquidityTooLow');
      expect(result.violations).toContain('ZeroAmountIn');
      expect(result.violations).toContain('ZeroExpectedOut');
    });

    it('should use same default values as on-chain contract', () => {
      // These should match the default values from PolicyConfig.sol
      expect(DEFAULT_POLICY_PARAMETERS.maxSlippageBps).toBe(50);
      expect(DEFAULT_POLICY_PARAMETERS.maxPriceImpactBps).toBe(150);
      expect(DEFAULT_POLICY_PARAMETERS.minLiquidityUSD).toBe(BigInt('250000000000000000000000'));
      expect(DEFAULT_POLICY_PARAMETERS.ttlSeconds).toBe(120);
      expect(DEFAULT_POLICY_PARAMETERS.approvalMultiplier).toBe(102);
    });

    it('should use same chain IDs as on-chain contract', () => {
      // These should match the constants from ChainConfig.sol
      expect(CHAIN_IDS.ETHEREUM).toBe(1);
      expect(CHAIN_IDS.ARBITRUM).toBe(42161);
      expect(CHAIN_IDS.OPTIMISM).toBe(10);
      expect(CHAIN_IDS.SEPOLIA).toBe(11155111);
      expect(CHAIN_IDS.ARBITRUM_SEPOLIA).toBe(421614);
      expect(CHAIN_IDS.OPTIMISM_SEPOLIA).toBe(11155420);
    });

    it('should use same router types as on-chain contract', () => {
      // These should match the router types from PolicyConfig.sol
      expect(ROUTER_TYPES.UNISWAP).toBe(0);
      expect(ROUTER_TYPES.ONEINCH).toBe(1);
    });
  });
});
