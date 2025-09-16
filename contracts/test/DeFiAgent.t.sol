// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {DeFiAgent} from "../src/DeFiAgent.sol";
import {PolicyConfig} from "../src/PolicyConfig.sol";
import {ChainConfig} from "../src/ChainConfig.sol";

/**
 * @title DeFiAgentTest
 * @dev Test suite for DeFiAgent contract
 */
contract DeFiAgentTest is Test {
    DeFiAgent public defiAgent;
    PolicyConfig public policyConfig;
    address public owner;
    address public user;

    event QuoteEvaluated(
        uint256 indexed chainId,
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 expectedOut,
        bool passed,
        string[] violations
    );

    function setUp() public {
        owner = address(this);
        user = makeAddr("user");
        
        // Set up test environment to use Ethereum mainnet chain ID
        vm.chainId(ChainConfig.ETHEREUM_CHAIN_ID);
        
        // Deploy PolicyConfig first
        policyConfig = new PolicyConfig();
        
        // Deploy DeFiAgent with PolicyConfig address
        defiAgent = new DeFiAgent(address(policyConfig));
        
        // Verify initial state
        assertEq(defiAgent.owner(), owner);
        assertEq(defiAgent.maxNotionalPerTxUSD(), 1000 * 1e18);
        assertEq(address(defiAgent.policyConfig()), address(policyConfig));
    }

    function testInitialization() public {
        // Test PolicyConfig integration
        assertEq(address(defiAgent.policyConfig()), address(policyConfig));
        
        // Test supported chains via PolicyConfig
        assertTrue(policyConfig.isChainSupported(ChainConfig.ETHEREUM_CHAIN_ID));
        assertTrue(policyConfig.isChainSupported(ChainConfig.ARBITRUM_CHAIN_ID));
        assertTrue(policyConfig.isChainSupported(ChainConfig.OPTIMISM_CHAIN_ID));
        
        // Test router allowlists via PolicyConfig
        assertTrue(policyConfig.isRouterAllowed(
            ChainConfig.ETHEREUM_CHAIN_ID,
            0,
            ChainConfig.UNISWAP_V3_ROUTER_ETHEREUM
        ));
        assertTrue(policyConfig.isRouterAllowed(
            ChainConfig.ETHEREUM_CHAIN_ID,
            1,
            ChainConfig.ONEINCH_ROUTER_ETHEREUM
        ));
    }

    function testEvaluateQuotePassing() public {
        address tokenIn = makeAddr("tokenIn");
        address tokenOut = makeAddr("tokenOut");
        uint256 amountIn = 1000 * 1e18;
        uint256 expectedOut = 2000 * 1e18;
        uint256 priceImpactBps = 100; // 1%
        uint256 notionalInUSD = 500 * 1e18; // $500
        uint256 poolLiquidityUSD = 500000 * 1e18; // $500k

        vm.prank(user);
        (bool passed, string[] memory violations) = defiAgent.evaluateQuote(
            tokenIn,
            tokenOut,
            amountIn,
            expectedOut,
            priceImpactBps,
            notionalInUSD,
            poolLiquidityUSD
        );

        assertTrue(passed);
        assertEq(violations.length, 0);
    }

    function testEvaluateQuoteNotionalTooLarge() public {
        address tokenIn = makeAddr("tokenIn");
        address tokenOut = makeAddr("tokenOut");
        uint256 amountIn = 1000 * 1e18;
        uint256 expectedOut = 2000 * 1e18;
        uint256 priceImpactBps = 100; // 1%
        uint256 notionalInUSD = 2000 * 1e18; // $2000 - exceeds limit
        uint256 poolLiquidityUSD = 500000 * 1e18; // $500k

        vm.prank(user);
        (bool passed, string[] memory violations) = defiAgent.evaluateQuote(
            tokenIn,
            tokenOut,
            amountIn,
            expectedOut,
            priceImpactBps,
            notionalInUSD,
            poolLiquidityUSD
        );

        assertFalse(passed);
        assertEq(violations.length, 1);
        assertEq(violations[0], "NotionalTooLarge");
    }

    function testEvaluateQuotePriceImpactHigh() public {
        address tokenIn = makeAddr("tokenIn");
        address tokenOut = makeAddr("tokenOut");
        uint256 amountIn = 1000 * 1e18;
        uint256 expectedOut = 2000 * 1e18;
        uint256 priceImpactBps = 200; // 2% - exceeds limit
        uint256 notionalInUSD = 500 * 1e18; // $500
        uint256 poolLiquidityUSD = 500000 * 1e18; // $500k

        vm.prank(user);
        (bool passed, string[] memory violations) = defiAgent.evaluateQuote(
            tokenIn,
            tokenOut,
            amountIn,
            expectedOut,
            priceImpactBps,
            notionalInUSD,
            poolLiquidityUSD
        );

        assertFalse(passed);
        assertEq(violations.length, 1);
        assertEq(violations[0], "PriceImpactHigh");
    }

    function testEvaluateQuoteLiquidityTooLow() public {
        address tokenIn = makeAddr("tokenIn");
        address tokenOut = makeAddr("tokenOut");
        uint256 amountIn = 1000 * 1e18;
        uint256 expectedOut = 2000 * 1e18;
        uint256 priceImpactBps = 100; // 1%
        uint256 notionalInUSD = 500 * 1e18; // $500
        uint256 poolLiquidityUSD = 100000 * 1e18; // $100k - below limit

        vm.prank(user);
        (bool passed, string[] memory violations) = defiAgent.evaluateQuote(
            tokenIn,
            tokenOut,
            amountIn,
            expectedOut,
            priceImpactBps,
            notionalInUSD,
            poolLiquidityUSD
        );

        assertFalse(passed);
        assertEq(violations.length, 1);
        assertEq(violations[0], "LiquidityTooLow");
    }

    function testEvaluateQuoteZeroAmounts() public {
        address tokenIn = makeAddr("tokenIn");
        address tokenOut = makeAddr("tokenOut");
        uint256 amountIn = 0; // Zero amount
        uint256 expectedOut = 2000 * 1e18;
        uint256 priceImpactBps = 100; // 1%
        uint256 notionalInUSD = 500 * 1e18; // $500
        uint256 poolLiquidityUSD = 500000 * 1e18; // $500k

        vm.prank(user);
        (bool passed, string[] memory violations) = defiAgent.evaluateQuote(
            tokenIn,
            tokenOut,
            amountIn,
            expectedOut,
            priceImpactBps,
            notionalInUSD,
            poolLiquidityUSD
        );

        assertFalse(passed);
        assertEq(violations.length, 1);
        assertEq(violations[0], "ZeroAmountIn");
    }

    function testEvaluateQuoteMultipleViolations() public {
        address tokenIn = makeAddr("tokenIn");
        address tokenOut = makeAddr("tokenOut");
        uint256 amountIn = 0; // Zero amount
        uint256 expectedOut = 0; // Zero amount
        uint256 priceImpactBps = 200; // 2% - exceeds limit
        uint256 notionalInUSD = 2000 * 1e18; // $2000 - exceeds limit
        uint256 poolLiquidityUSD = 100000 * 1e18; // $100k - below limit

        vm.prank(user);
        (bool passed, string[] memory violations) = defiAgent.evaluateQuote(
            tokenIn,
            tokenOut,
            amountIn,
            expectedOut,
            priceImpactBps,
            notionalInUSD,
            poolLiquidityUSD
        );

        assertFalse(passed);
        assertEq(violations.length, 5); // All violations
    }

    function testUpdateMaxNotionalPerTxUSD() public {
        uint256 newMaxNotional = 2000 * 1e18;

        defiAgent.updateMaxNotionalPerTxUSD(newMaxNotional);
        assertEq(defiAgent.maxNotionalPerTxUSD(), newMaxNotional);
    }

    function testUpdateMaxNotionalPerTxUSDOnlyOwner() public {
        uint256 newMaxNotional = 2000 * 1e18;

        vm.prank(user);
        vm.expectRevert("DeFiAgent: not owner");
        defiAgent.updateMaxNotionalPerTxUSD(newMaxNotional);
    }

    function testUpdatePolicyConfig() public {
        // Deploy new PolicyConfig
        PolicyConfig newPolicyConfig = new PolicyConfig();
        
        defiAgent.updatePolicyConfig(address(newPolicyConfig));
        assertEq(address(defiAgent.policyConfig()), address(newPolicyConfig));
    }

    function testUpdatePolicyConfigOnlyOwner() public {
        PolicyConfig newPolicyConfig = new PolicyConfig();
        
        vm.prank(user);
        vm.expectRevert("DeFiAgent: not owner");
        defiAgent.updatePolicyConfig(address(newPolicyConfig));
    }

    function testUpdatePolicyConfigValidation() public {
        vm.expectRevert("DeFiAgent: zero address");
        defiAgent.updatePolicyConfig(address(0));
    }

    function testPolicyConfigIntegration() public {
        // Test that DeFiAgent uses PolicyConfig for policy parameters
        (
            uint256 maxSlippageBps,
            uint256 maxPriceImpactBps,
            uint256 minLiquidityUSD,
            uint256 ttlSeconds,
            uint256 approvalMultiplier
        ) = policyConfig.getPolicyParameters();
        
        assertEq(maxSlippageBps, 50);
        assertEq(maxPriceImpactBps, 150);
        assertEq(minLiquidityUSD, 250000 * 1e18);
        assertEq(ttlSeconds, 120);
        assertEq(approvalMultiplier, 102);
    }

    function testExecuteSwapPlaceholder() public {
        address tokenIn = makeAddr("tokenIn");
        address tokenOut = makeAddr("tokenOut");
        uint256 amountIn = 1000 * 1e18;
        uint256 routerType = 0; // Uniswap
        bytes memory swapCalldata = "";

        vm.prank(user);
        defiAgent.executeSwap(tokenIn, tokenOut, amountIn, routerType, swapCalldata);
        
        // Test passes if no revert occurs (placeholder implementation)
    }

    function testExecuteSwapNoAllowedRouters() public {
        address tokenIn = makeAddr("tokenIn");
        address tokenOut = makeAddr("tokenOut");
        uint256 amountIn = 1000 * 1e18;
        uint256 routerType = 999; // No allowed routers for this type
        bytes memory swapCalldata = "";

        vm.prank(user);
        vm.expectRevert("DeFiAgent: no allowed routers");
        defiAgent.executeSwap(tokenIn, tokenOut, amountIn, routerType, swapCalldata);
    }
}
