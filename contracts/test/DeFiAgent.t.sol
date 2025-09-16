// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {DeFiAgent} from "../src/DeFiAgent.sol";
import {ChainConfig} from "../src/ChainConfig.sol";

/**
 * @title DeFiAgentTest
 * @dev Test suite for DeFiAgent contract
 */
contract DeFiAgentTest is Test {
    DeFiAgent public defiAgent;
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
        
        defiAgent = new DeFiAgent();
        
        // Verify initial state
        assertEq(defiAgent.owner(), owner);
        assertEq(defiAgent.maxNotionalPerTxUSD(), 1000 * 1e18);
        assertEq(defiAgent.maxSlippageBps(), 50);
        assertEq(defiAgent.maxPriceImpactBps(), 150);
        assertEq(defiAgent.minPoolLiquidityUSD(), 250000 * 1e18);
    }

    function testInitialization() public {
        // Test supported chains
        assertTrue(defiAgent.supportedChains(ChainConfig.ETHEREUM_CHAIN_ID));
        assertTrue(defiAgent.supportedChains(ChainConfig.ARBITRUM_CHAIN_ID));
        assertTrue(defiAgent.supportedChains(ChainConfig.OPTIMISM_CHAIN_ID));
        
        // Test router addresses
        assertNotEq(defiAgent.routerAddresses(ChainConfig.ETHEREUM_CHAIN_ID, 0), address(0));
        assertNotEq(defiAgent.routerAddresses(ChainConfig.ETHEREUM_CHAIN_ID, 1), address(0));
        assertNotEq(defiAgent.routerAddresses(ChainConfig.ARBITRUM_CHAIN_ID, 0), address(0));
        assertNotEq(defiAgent.routerAddresses(ChainConfig.ARBITRUM_CHAIN_ID, 1), address(0));
        assertNotEq(defiAgent.routerAddresses(ChainConfig.OPTIMISM_CHAIN_ID, 0), address(0));
        assertNotEq(defiAgent.routerAddresses(ChainConfig.OPTIMISM_CHAIN_ID, 1), address(0));
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

    function testUpdatePolicy() public {
        uint256 newMaxNotional = 2000 * 1e18;
        uint256 newMaxSlippage = 100;
        uint256 newMaxPriceImpact = 200;
        uint256 newMinLiquidity = 500000 * 1e18;

        defiAgent.updatePolicy(
            newMaxNotional,
            newMaxSlippage,
            newMaxPriceImpact,
            newMinLiquidity
        );

        assertEq(defiAgent.maxNotionalPerTxUSD(), newMaxNotional);
        assertEq(defiAgent.maxSlippageBps(), newMaxSlippage);
        assertEq(defiAgent.maxPriceImpactBps(), newMaxPriceImpact);
        assertEq(defiAgent.minPoolLiquidityUSD(), newMinLiquidity);
    }

    function testUpdatePolicyOnlyOwner() public {
        uint256 newMaxNotional = 2000 * 1e18;
        uint256 newMaxSlippage = 100;
        uint256 newMaxPriceImpact = 200;
        uint256 newMinLiquidity = 500000 * 1e18;

        vm.prank(user);
        vm.expectRevert("DeFiAgent: not owner");
        defiAgent.updatePolicy(
            newMaxNotional,
            newMaxSlippage,
            newMaxPriceImpact,
            newMinLiquidity
        );
    }

    function testSetSupportedChain() public {
        uint256 newChainId = 999;
        
        assertFalse(defiAgent.supportedChains(newChainId));
        
        defiAgent.setSupportedChain(newChainId, true);
        assertTrue(defiAgent.supportedChains(newChainId));
        
        defiAgent.setSupportedChain(newChainId, false);
        assertFalse(defiAgent.supportedChains(newChainId));
    }

    function testSetRouterAddress() public {
        uint256 chainId = ChainConfig.ETHEREUM_CHAIN_ID;
        uint256 routerType = 0;
        address newRouter = makeAddr("newRouter");
        
        defiAgent.setRouterAddress(chainId, routerType, newRouter);
        assertEq(defiAgent.routerAddresses(chainId, routerType), newRouter);
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

    function testExecuteSwapUnsupportedRouter() public {
        address tokenIn = makeAddr("tokenIn");
        address tokenOut = makeAddr("tokenOut");
        uint256 amountIn = 1000 * 1e18;
        uint256 routerType = 999; // Unsupported router
        bytes memory swapCalldata = "";

        vm.prank(user);
        vm.expectRevert("DeFiAgent: unsupported router");
        defiAgent.executeSwap(tokenIn, tokenOut, amountIn, routerType, swapCalldata);
    }
}
