// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {PolicyConfig} from "../src/PolicyConfig.sol";
import {ChainConfig} from "../src/ChainConfig.sol";

/**
 * @title PolicyConfigTest
 * @dev Comprehensive test suite for PolicyConfig contract
 */
contract PolicyConfigTest is Test {
    PolicyConfig public policyConfig;
    address public owner;
    address public user;
    address public newOwner;

    // Events to test
    event PolicyUpdated(
        uint256 maxSlippageBps,
        uint256 maxPriceImpactBps,
        uint256 minLiquidityUSD,
        uint256 ttlSeconds,
        uint256 approvalMultiplier
    );

    event RouterAllowlistUpdated(
        uint256 indexed chainId,
        uint256 indexed routerType,
        address indexed routerAddress,
        bool allowed
    );

    event ChainSupportUpdated(
        uint256 indexed chainId,
        bool supported
    );

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    function setUp() public {
        owner = address(this);
        user = makeAddr("user");
        newOwner = makeAddr("newOwner");
        
        policyConfig = new PolicyConfig();
        
        // Verify initial state
        assertEq(policyConfig.owner(), owner);
        assertEq(policyConfig.maxSlippageBps(), 50);
        assertEq(policyConfig.maxPriceImpactBps(), 150);
        assertEq(policyConfig.minLiquidityUSD(), 250000 * 1e18);
        assertEq(policyConfig.ttlSeconds(), 120);
        assertEq(policyConfig.approvalMultiplier(), 102);
    }

    // ============ INITIALIZATION TESTS ============

    function testInitialization() public {
        // Test supported chains
        assertTrue(policyConfig.isChainSupported(ChainConfig.ETHEREUM_CHAIN_ID));
        assertTrue(policyConfig.isChainSupported(ChainConfig.ARBITRUM_CHAIN_ID));
        assertTrue(policyConfig.isChainSupported(ChainConfig.OPTIMISM_CHAIN_ID));
        assertTrue(policyConfig.isChainSupported(ChainConfig.SEPOLIA_CHAIN_ID));
        assertTrue(policyConfig.isChainSupported(ChainConfig.ARBITRUM_SEPOLIA_CHAIN_ID));
        assertTrue(policyConfig.isChainSupported(ChainConfig.OPTIMISM_SEPOLIA_CHAIN_ID));
        
        // Test default router allowlists
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
        assertTrue(policyConfig.isRouterAllowed(
            ChainConfig.ARBITRUM_CHAIN_ID,
            0,
            ChainConfig.UNISWAP_V3_ROUTER_ARBITRUM
        ));
        assertTrue(policyConfig.isRouterAllowed(
            ChainConfig.ARBITRUM_CHAIN_ID,
            1,
            ChainConfig.ONEINCH_ROUTER_ARBITRUM
        ));
    }

    // ============ GETTER TESTS ============

    function testGetPolicyParameters() public {
        (
            uint256 maxSlippage,
            uint256 maxPriceImpact,
            uint256 minLiquidity,
            uint256 ttl,
            uint256 approvalMultiplier
        ) = policyConfig.getPolicyParameters();

        assertEq(maxSlippage, 50);
        assertEq(maxPriceImpact, 150);
        assertEq(minLiquidity, 250000 * 1e18);
        assertEq(ttl, 120);
        assertEq(approvalMultiplier, 102);
    }

    function testIsRouterAllowed() public {
        // Test allowed routers
        assertTrue(policyConfig.isRouterAllowed(
            ChainConfig.ETHEREUM_CHAIN_ID,
            0,
            ChainConfig.UNISWAP_V3_ROUTER_ETHEREUM
        ));
        
        // Test disallowed router
        assertFalse(policyConfig.isRouterAllowed(
            ChainConfig.ETHEREUM_CHAIN_ID,
            0,
            makeAddr("unknownRouter")
        ));
        
        // Test unsupported chain
        assertFalse(policyConfig.isRouterAllowed(
            999, // Unsupported chain
            0,
            ChainConfig.UNISWAP_V3_ROUTER_ETHEREUM
        ));
    }

    function testIsChainSupported() public {
        assertTrue(policyConfig.isChainSupported(ChainConfig.ETHEREUM_CHAIN_ID));
        assertTrue(policyConfig.isChainSupported(ChainConfig.ARBITRUM_CHAIN_ID));
        assertTrue(policyConfig.isChainSupported(ChainConfig.OPTIMISM_CHAIN_ID));
        assertFalse(policyConfig.isChainSupported(999));
        assertFalse(policyConfig.isChainSupported(0));
    }

    function testGetAllowedRouters() public {
        // Test Ethereum Uniswap routers
        address[] memory uniswapRouters = policyConfig.getAllowedRouters(
            ChainConfig.ETHEREUM_CHAIN_ID,
            0
        );
        assertEq(uniswapRouters.length, 1);
        assertEq(uniswapRouters[0], ChainConfig.UNISWAP_V3_ROUTER_ETHEREUM);
        
        // Test Ethereum 1inch routers
        address[] memory oneinchRouters = policyConfig.getAllowedRouters(
            ChainConfig.ETHEREUM_CHAIN_ID,
            1
        );
        assertEq(oneinchRouters.length, 1);
        assertEq(oneinchRouters[0], ChainConfig.ONEINCH_ROUTER_ETHEREUM);
        
        // Test unsupported chain
        address[] memory unsupportedRouters = policyConfig.getAllowedRouters(999, 0);
        assertEq(unsupportedRouters.length, 0);
    }

    // ============ POLICY UPDATE TESTS ============

    function testUpdatePolicyParameters() public {
        uint256 newMaxSlippage = 100;
        uint256 newMaxPriceImpact = 200;
        uint256 newMinLiquidity = 500000 * 1e18;
        uint256 newTtl = 300;
        uint256 newApprovalMultiplier = 105;

        vm.expectEmit(true, true, true, true);
        emit PolicyUpdated(newMaxSlippage, newMaxPriceImpact, newMinLiquidity, newTtl, newApprovalMultiplier);

        policyConfig.updatePolicyParameters(
            newMaxSlippage,
            newMaxPriceImpact,
            newMinLiquidity,
            newTtl,
            newApprovalMultiplier
        );

        assertEq(policyConfig.maxSlippageBps(), newMaxSlippage);
        assertEq(policyConfig.maxPriceImpactBps(), newMaxPriceImpact);
        assertEq(policyConfig.minLiquidityUSD(), newMinLiquidity);
        assertEq(policyConfig.ttlSeconds(), newTtl);
        assertEq(policyConfig.approvalMultiplier(), newApprovalMultiplier);
    }

    function testUpdatePolicyParametersOnlyOwner() public {
        vm.prank(user);
        vm.expectRevert("PolicyConfig: not owner");
        policyConfig.updatePolicyParameters(100, 200, 500000 * 1e18, 300, 105);
    }

    function testUpdatePolicyParametersValidation() public {
        // Test slippage too high
        vm.expectRevert("PolicyConfig: slippage too high");
        policyConfig.updatePolicyParameters(1001, 200, 500000 * 1e18, 300, 105);

        // Test price impact too high
        vm.expectRevert("PolicyConfig: price impact too high");
        policyConfig.updatePolicyParameters(100, 1001, 500000 * 1e18, 300, 105);

        // Test liquidity too low
        vm.expectRevert("PolicyConfig: liquidity too low");
        policyConfig.updatePolicyParameters(100, 200, 999 * 1e18, 300, 105);

        // Test TTL too low
        vm.expectRevert("PolicyConfig: invalid TTL");
        policyConfig.updatePolicyParameters(100, 200, 500000 * 1e18, 29, 105);

        // Test TTL too high
        vm.expectRevert("PolicyConfig: invalid TTL");
        policyConfig.updatePolicyParameters(100, 200, 500000 * 1e18, 3601, 105);

        // Test approval multiplier too low
        vm.expectRevert("PolicyConfig: invalid multiplier");
        policyConfig.updatePolicyParameters(100, 200, 500000 * 1e18, 300, 99);

        // Test approval multiplier too high
        vm.expectRevert("PolicyConfig: invalid multiplier");
        policyConfig.updatePolicyParameters(100, 200, 500000 * 1e18, 300, 111);
    }

    // ============ ROUTER ALLOWLIST TESTS ============

    function testSetRouterAllowlist() public {
        address newRouter = makeAddr("newRouter");
        
        vm.expectEmit(true, true, true, true);
        emit RouterAllowlistUpdated(ChainConfig.ETHEREUM_CHAIN_ID, 2, newRouter, true);

        policyConfig.setRouterAllowlist(
            ChainConfig.ETHEREUM_CHAIN_ID,
            2,
            newRouter,
            true
        );

        assertTrue(policyConfig.isRouterAllowed(
            ChainConfig.ETHEREUM_CHAIN_ID,
            2,
            newRouter
        ));

        // Test removing router
        vm.expectEmit(true, true, true, true);
        emit RouterAllowlistUpdated(ChainConfig.ETHEREUM_CHAIN_ID, 2, newRouter, false);

        policyConfig.setRouterAllowlist(
            ChainConfig.ETHEREUM_CHAIN_ID,
            2,
            newRouter,
            false
        );

        assertFalse(policyConfig.isRouterAllowed(
            ChainConfig.ETHEREUM_CHAIN_ID,
            2,
            newRouter
        ));
    }

    function testSetRouterAllowlistOnlyOwner() public {
        vm.prank(user);
        vm.expectRevert("PolicyConfig: not owner");
        policyConfig.setRouterAllowlist(
            ChainConfig.ETHEREUM_CHAIN_ID,
            2,
            makeAddr("newRouter"),
            true
        );
    }

    function testSetRouterAllowlistValidation() public {
        // Test zero address
        vm.expectRevert("PolicyConfig: zero address");
        policyConfig.setRouterAllowlist(
            ChainConfig.ETHEREUM_CHAIN_ID,
            2,
            address(0),
            true
        );

        // Test unsupported chain
        vm.expectRevert("PolicyConfig: unsupported chain");
        policyConfig.setRouterAllowlist(
            999,
            2,
            makeAddr("newRouter"),
            true
        );

        // Test invalid router type
        vm.expectRevert("PolicyConfig: invalid router type");
        policyConfig.setRouterAllowlist(
            ChainConfig.ETHEREUM_CHAIN_ID,
            11,
            makeAddr("newRouter"),
            true
        );
    }

    function testBatchSetRouterAllowlist() public {
        address router1 = makeAddr("router1");
        address router2 = makeAddr("router2");
        
        uint256[] memory chainIds = new uint256[](2);
        chainIds[0] = ChainConfig.ETHEREUM_CHAIN_ID;
        chainIds[1] = ChainConfig.ARBITRUM_CHAIN_ID;
        
        uint256[] memory routerTypes = new uint256[](2);
        routerTypes[0] = 2;
        routerTypes[1] = 3;
        
        address[] memory routerAddresses = new address[](2);
        routerAddresses[0] = router1;
        routerAddresses[1] = router2;
        
        bool[] memory allowedValues = new bool[](2);
        allowedValues[0] = true;
        allowedValues[1] = false;

        // Expect events for both updates
        vm.expectEmit(true, true, true, true);
        emit RouterAllowlistUpdated(ChainConfig.ETHEREUM_CHAIN_ID, 2, router1, true);
        vm.expectEmit(true, true, true, true);
        emit RouterAllowlistUpdated(ChainConfig.ARBITRUM_CHAIN_ID, 3, router2, false);

        policyConfig.batchSetRouterAllowlist(
            chainIds,
            routerTypes,
            routerAddresses,
            allowedValues
        );

        assertTrue(policyConfig.isRouterAllowed(ChainConfig.ETHEREUM_CHAIN_ID, 2, router1));
        assertFalse(policyConfig.isRouterAllowed(ChainConfig.ARBITRUM_CHAIN_ID, 3, router2));
    }

    function testBatchSetRouterAllowlistValidation() public {
        // Test array length mismatch
        uint256[] memory chainIds = new uint256[](1);
        uint256[] memory routerTypes = new uint256[](2);
        address[] memory routerAddresses = new address[](1);
        bool[] memory allowedValues = new bool[](1);

        vm.expectRevert("PolicyConfig: array length mismatch");
        policyConfig.batchSetRouterAllowlist(
            chainIds,
            routerTypes,
            routerAddresses,
            allowedValues
        );
    }

    // ============ CHAIN SUPPORT TESTS ============

    function testSetChainSupport() public {
        uint256 newChainId = 999;
        
        vm.expectEmit(true, true, true, true);
        emit ChainSupportUpdated(newChainId, true);

        policyConfig.setChainSupport(newChainId, true);
        assertTrue(policyConfig.isChainSupported(newChainId));

        vm.expectEmit(true, true, true, true);
        emit ChainSupportUpdated(newChainId, false);

        policyConfig.setChainSupport(newChainId, false);
        assertFalse(policyConfig.isChainSupported(newChainId));
    }

    function testSetChainSupportOnlyOwner() public {
        vm.prank(user);
        vm.expectRevert("PolicyConfig: not owner");
        policyConfig.setChainSupport(999, true);
    }

    // ============ OWNERSHIP TESTS ============

    function testTransferOwnership() public {
        vm.expectEmit(true, true, true, true);
        emit OwnershipTransferred(owner, newOwner);

        policyConfig.transferOwnership(newOwner);
        assertEq(policyConfig.owner(), newOwner);
    }

    function testTransferOwnershipOnlyOwner() public {
        vm.prank(user);
        vm.expectRevert("PolicyConfig: not owner");
        policyConfig.transferOwnership(newOwner);
    }

    function testTransferOwnershipValidation() public {
        // Test zero address
        vm.expectRevert("PolicyConfig: zero address");
        policyConfig.transferOwnership(address(0));

        // Test same owner
        vm.expectRevert("PolicyConfig: same owner");
        policyConfig.transferOwnership(owner);
    }

    function testRenounceOwnership() public {
        vm.expectEmit(true, true, true, true);
        emit OwnershipTransferred(owner, address(0));

        policyConfig.renounceOwnership();
        assertEq(policyConfig.owner(), address(0));
    }

    function testRenounceOwnershipOnlyOwner() public {
        vm.prank(user);
        vm.expectRevert("PolicyConfig: not owner");
        policyConfig.renounceOwnership();
    }

    function testNewOwnerCanUpdatePolicy() public {
        // Transfer ownership
        policyConfig.transferOwnership(newOwner);
        
        // New owner should be able to update policy
        vm.prank(newOwner);
        policyConfig.updatePolicyParameters(100, 200, 500000 * 1e18, 300, 105);
        
        assertEq(policyConfig.maxSlippageBps(), 100);
    }

    function testOldOwnerCannotUpdatePolicy() public {
        // Transfer ownership
        policyConfig.transferOwnership(newOwner);
        
        // Old owner should not be able to update policy
        vm.expectRevert("PolicyConfig: not owner");
        policyConfig.updatePolicyParameters(100, 200, 500000 * 1e18, 300, 105);
    }

    // ============ EDGE CASE TESTS ============

    function testBoundaryValues() public {
        // Test minimum valid values
        policyConfig.updatePolicyParameters(0, 0, 1000 * 1e18, 30, 100);
        assertEq(policyConfig.maxSlippageBps(), 0);
        assertEq(policyConfig.maxPriceImpactBps(), 0);
        assertEq(policyConfig.minLiquidityUSD(), 1000 * 1e18);
        assertEq(policyConfig.ttlSeconds(), 30);
        assertEq(policyConfig.approvalMultiplier(), 100);

        // Test maximum valid values
        policyConfig.updatePolicyParameters(1000, 1000, type(uint256).max, 3600, 110);
        assertEq(policyConfig.maxSlippageBps(), 1000);
        assertEq(policyConfig.maxPriceImpactBps(), 1000);
        assertEq(policyConfig.minLiquidityUSD(), type(uint256).max);
        assertEq(policyConfig.ttlSeconds(), 3600);
        assertEq(policyConfig.approvalMultiplier(), 110);
    }

    function testRouterTypeBoundaries() public {
        address router = makeAddr("router");
        
        // Test minimum router type
        policyConfig.setRouterAllowlist(ChainConfig.ETHEREUM_CHAIN_ID, 0, router, true);
        assertTrue(policyConfig.isRouterAllowed(ChainConfig.ETHEREUM_CHAIN_ID, 0, router));

        // Test maximum router type
        policyConfig.setRouterAllowlist(ChainConfig.ETHEREUM_CHAIN_ID, 10, router, true);
        assertTrue(policyConfig.isRouterAllowed(ChainConfig.ETHEREUM_CHAIN_ID, 10, router));
    }
}
