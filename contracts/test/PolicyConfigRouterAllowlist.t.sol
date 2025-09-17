// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {PolicyConfig} from "../src/PolicyConfig.sol";
import {ChainConfig} from "../src/ChainConfig.sol";

/**
 * @title PolicyConfigRouterAllowlistTest
 * @dev Comprehensive tests for router allowlist functionality
 */
contract PolicyConfigRouterAllowlistTest is Test {
    PolicyConfig public policyConfig;
    address public owner;
    address public user1;
    address public user2;

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

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        policyConfig = new PolicyConfig();
    }

    // ============ INITIALIZATION TESTS ============

    function testInitialRouterAllowlist() public {
        // Test Ethereum routers
        assertTrue(policyConfig.isRouterAllowed(
            ChainConfig.ETHEREUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_UNISWAP_V3,
            ChainConfig.UNISWAP_V3_ROUTER_ETHEREUM
        ));
        assertTrue(policyConfig.isRouterAllowed(
            ChainConfig.ETHEREUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_ONEINCH,
            ChainConfig.ONEINCH_ROUTER_ETHEREUM
        ));
        assertTrue(policyConfig.isRouterAllowed(
            ChainConfig.ETHEREUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_SUSHISWAP,
            ChainConfig.SUSHISWAP_ROUTER_ETHEREUM
        ));
        assertTrue(policyConfig.isRouterAllowed(
            ChainConfig.ETHEREUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_CURVE,
            ChainConfig.CURVE_ROUTER_ETHEREUM
        ));

        // Test Arbitrum routers
        assertTrue(policyConfig.isRouterAllowed(
            ChainConfig.ARBITRUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_UNISWAP_V3,
            ChainConfig.UNISWAP_V3_ROUTER_ARBITRUM
        ));
        assertTrue(policyConfig.isRouterAllowed(
            ChainConfig.ARBITRUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_ONEINCH,
            ChainConfig.ONEINCH_ROUTER_ARBITRUM
        ));
        assertTrue(policyConfig.isRouterAllowed(
            ChainConfig.ARBITRUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_SUSHISWAP,
            ChainConfig.SUSHISWAP_ROUTER_ARBITRUM
        ));

        // Test Optimism routers
        assertTrue(policyConfig.isRouterAllowed(
            ChainConfig.OPTIMISM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_UNISWAP_V3,
            ChainConfig.UNISWAP_V3_ROUTER_OPTIMISM
        ));
        assertTrue(policyConfig.isRouterAllowed(
            ChainConfig.OPTIMISM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_ONEINCH,
            ChainConfig.ONEINCH_ROUTER_OPTIMISM
        ));
        assertTrue(policyConfig.isRouterAllowed(
            ChainConfig.OPTIMISM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_SUSHISWAP,
            ChainConfig.SUSHISWAP_ROUTER_OPTIMISM
        ));
    }

    function testInitialChainSupport() public {
        assertTrue(policyConfig.isChainSupported(ChainConfig.ETHEREUM_CHAIN_ID));
        assertTrue(policyConfig.isChainSupported(ChainConfig.ARBITRUM_CHAIN_ID));
        assertTrue(policyConfig.isChainSupported(ChainConfig.OPTIMISM_CHAIN_ID));
        assertTrue(policyConfig.isChainSupported(ChainConfig.SEPOLIA_CHAIN_ID));
        assertTrue(policyConfig.isChainSupported(ChainConfig.ARBITRUM_SEPOLIA_CHAIN_ID));
        assertTrue(policyConfig.isChainSupported(ChainConfig.OPTIMISM_SEPOLIA_CHAIN_ID));
    }

    // ============ ROUTER ALLOWLIST TESTS ============

    function testSetRouterAllowlist() public {
        address newRouter = makeAddr("newRouter");
        
        vm.expectEmit(true, true, true, true);
        emit RouterAllowlistUpdated(
            ChainConfig.ETHEREUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_UNISWAP_V3,
            newRouter,
            true
        );
        
        policyConfig.setRouterAllowlist(
            ChainConfig.ETHEREUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_UNISWAP_V3,
            newRouter,
            true
        );

        assertTrue(policyConfig.isRouterAllowed(
            ChainConfig.ETHEREUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_UNISWAP_V3,
            newRouter
        ));
    }

    function testSetRouterAllowlistRemove() public {
        // First add a router
        address newRouter = makeAddr("newRouter");
        policyConfig.setRouterAllowlist(
            ChainConfig.ETHEREUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_UNISWAP_V3,
            newRouter,
            true
        );
        assertTrue(policyConfig.isRouterAllowed(
            ChainConfig.ETHEREUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_UNISWAP_V3,
            newRouter
        ));

        // Then remove it
        vm.expectEmit(true, true, true, true);
        emit RouterAllowlistUpdated(
            ChainConfig.ETHEREUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_UNISWAP_V3,
            newRouter,
            false
        );
        
        policyConfig.setRouterAllowlist(
            ChainConfig.ETHEREUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_UNISWAP_V3,
            newRouter,
            false
        );

        assertFalse(policyConfig.isRouterAllowed(
            ChainConfig.ETHEREUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_UNISWAP_V3,
            newRouter
        ));
    }

    function testSetRouterAllowlistOnlyOwner() public {
        address newRouter = makeAddr("newRouter");
        
        vm.prank(user1);
        vm.expectRevert("PolicyConfig: not owner");
        policyConfig.setRouterAllowlist(
            ChainConfig.ETHEREUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_UNISWAP_V3,
            newRouter,
            true
        );
    }

    function testSetRouterAllowlistUnsupportedChain() public {
        address newRouter = makeAddr("newRouter");
        uint256 unsupportedChain = 999999;
        
        vm.expectRevert("PolicyConfig: unsupported chain");
        policyConfig.setRouterAllowlist(
            unsupportedChain,
            ChainConfig.ROUTER_TYPE_UNISWAP_V3,
            newRouter,
            true
        );
    }

    function testSetRouterAllowlistZeroAddress() public {
        vm.expectRevert("PolicyConfig: zero address");
        policyConfig.setRouterAllowlist(
            ChainConfig.ETHEREUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_UNISWAP_V3,
            address(0),
            true
        );
    }

    function testSetRouterAllowlistInvalidRouterType() public {
        address newRouter = makeAddr("newRouter");
        
        vm.expectRevert("PolicyConfig: invalid router type");
        policyConfig.setRouterAllowlist(
            ChainConfig.ETHEREUM_CHAIN_ID,
            11, // Invalid router type (> 10)
            newRouter,
            true
        );
    }

    // ============ BATCH OPERATIONS TESTS ============

    function testBatchSetRouterAllowlist() public {
        uint256[] memory chainIds = new uint256[](3);
        uint256[] memory routerTypes = new uint256[](3);
        address[] memory routerAddresses = new address[](3);
        bool[] memory allowedValues = new bool[](3);

        chainIds[0] = ChainConfig.ETHEREUM_CHAIN_ID;
        chainIds[1] = ChainConfig.ARBITRUM_CHAIN_ID;
        chainIds[2] = ChainConfig.OPTIMISM_CHAIN_ID;

        routerTypes[0] = ChainConfig.ROUTER_TYPE_UNISWAP_V3;
        routerTypes[1] = ChainConfig.ROUTER_TYPE_ONEINCH;
        routerTypes[2] = ChainConfig.ROUTER_TYPE_SUSHISWAP;

        routerAddresses[0] = makeAddr("router1");
        routerAddresses[1] = makeAddr("router2");
        routerAddresses[2] = makeAddr("router3");

        allowedValues[0] = true;
        allowedValues[1] = true;
        allowedValues[2] = false;

        policyConfig.batchSetRouterAllowlist(
            chainIds,
            routerTypes,
            routerAddresses,
            allowedValues
        );

        assertTrue(policyConfig.isRouterAllowed(
            ChainConfig.ETHEREUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_UNISWAP_V3,
            routerAddresses[0]
        ));
        assertTrue(policyConfig.isRouterAllowed(
            ChainConfig.ARBITRUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_ONEINCH,
            routerAddresses[1]
        ));
        assertFalse(policyConfig.isRouterAllowed(
            ChainConfig.OPTIMISM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_SUSHISWAP,
            routerAddresses[2]
        ));
    }

    function testBatchSetRouterAllowlistArrayLengthMismatch() public {
        uint256[] memory chainIds = new uint256[](2);
        uint256[] memory routerTypes = new uint256[](3);
        address[] memory routerAddresses = new address[](3);
        bool[] memory allowedValues = new bool[](3);

        vm.expectRevert("PolicyConfig: array length mismatch");
        policyConfig.batchSetRouterAllowlist(
            chainIds,
            routerTypes,
            routerAddresses,
            allowedValues
        );
    }

    function testBatchSetRouterAllowlistOnlyOwner() public {
        uint256[] memory chainIds = new uint256[](1);
        uint256[] memory routerTypes = new uint256[](1);
        address[] memory routerAddresses = new address[](1);
        bool[] memory allowedValues = new bool[](1);

        chainIds[0] = ChainConfig.ETHEREUM_CHAIN_ID;
        routerTypes[0] = ChainConfig.ROUTER_TYPE_UNISWAP_V3;
        routerAddresses[0] = makeAddr("router");
        allowedValues[0] = true;

        vm.prank(user1);
        vm.expectRevert("PolicyConfig: not owner");
        policyConfig.batchSetRouterAllowlist(
            chainIds,
            routerTypes,
            routerAddresses,
            allowedValues
        );
    }

    // ============ CHAIN SUPPORT TESTS ============

    function testSetChainSupport() public {
        uint256 newChain = 12345;
        
        vm.expectEmit(true, true, false, false);
        emit ChainSupportUpdated(newChain, true);
        
        policyConfig.setChainSupport(newChain, true);
        assertTrue(policyConfig.isChainSupported(newChain));

        vm.expectEmit(true, true, false, false);
        emit ChainSupportUpdated(newChain, false);
        
        policyConfig.setChainSupport(newChain, false);
        assertFalse(policyConfig.isChainSupported(newChain));
    }

    function testSetChainSupportOnlyOwner() public {
        vm.prank(user1);
        vm.expectRevert("PolicyConfig: not owner");
        policyConfig.setChainSupport(12345, true);
    }

    // ============ GETTER TESTS ============

    function testGetAllowedRouters() public {
        // Test Ethereum UniswapV3
        address[] memory ethereumUniswap = policyConfig.getAllowedRouters(
            ChainConfig.ETHEREUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_UNISWAP_V3
        );
        assertEq(ethereumUniswap.length, 1);
        assertEq(ethereumUniswap[0], ChainConfig.UNISWAP_V3_ROUTER_ETHEREUM);

        // Test Ethereum 1inch
        address[] memory ethereum1inch = policyConfig.getAllowedRouters(
            ChainConfig.ETHEREUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_ONEINCH
        );
        assertEq(ethereum1inch.length, 1);
        assertEq(ethereum1inch[0], ChainConfig.ONEINCH_ROUTER_ETHEREUM);

        // Test Arbitrum SushiSwap
        address[] memory arbitrumSushi = policyConfig.getAllowedRouters(
            ChainConfig.ARBITRUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_SUSHISWAP
        );
        assertEq(arbitrumSushi.length, 1);
        assertEq(arbitrumSushi[0], ChainConfig.SUSHISWAP_ROUTER_ARBITRUM);

        // Test unsupported chain
        address[] memory unsupported = policyConfig.getAllowedRouters(999999, 0);
        assertEq(unsupported.length, 0);
    }

    function testGetPolicyParameters() public {
        (uint256 maxSlippage, uint256 maxPriceImpact, uint256 minLiquidity, uint256 ttl, uint256 approvalMult) = 
            policyConfig.getPolicyParameters();
        
        assertEq(maxSlippage, 50); // 0.5%
        assertEq(maxPriceImpact, 150); // 1.5%
        assertEq(minLiquidity, 250000 * 1e18); // $250k
        assertEq(ttl, 120); // 2 minutes
        assertEq(approvalMult, 102); // 1.02x
    }

    // ============ EDGE CASES ============

    function testRouterNotInAllowlist() public {
        address randomRouter = makeAddr("randomRouter");
        
        assertFalse(policyConfig.isRouterAllowed(
            ChainConfig.ETHEREUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_UNISWAP_V3,
            randomRouter
        ));
    }

    function testUnsupportedChainRouterCheck() public {
        assertFalse(policyConfig.isRouterAllowed(
            999999, // Unsupported chain
            ChainConfig.ROUTER_TYPE_UNISWAP_V3,
            ChainConfig.UNISWAP_V3_ROUTER_ETHEREUM
        ));
    }

    function testInvalidRouterType() public {
        assertFalse(policyConfig.isRouterAllowed(
            ChainConfig.ETHEREUM_CHAIN_ID,
            999, // Invalid router type
            ChainConfig.UNISWAP_V3_ROUTER_ETHEREUM
        ));
    }

    // ============ INTEGRATION TESTS ============

    function testRouterAllowlistEnforcement() public {
        // This test simulates how AgentExecutor would check router allowlist
        address allowedRouter = ChainConfig.UNISWAP_V3_ROUTER_ETHEREUM;
        address disallowedRouter = makeAddr("disallowedRouter");

        // Allowed router should pass
        assertTrue(policyConfig.isRouterAllowed(
            ChainConfig.ETHEREUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_UNISWAP_V3,
            allowedRouter
        ));

        // Disallowed router should fail
        assertFalse(policyConfig.isRouterAllowed(
            ChainConfig.ETHEREUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_UNISWAP_V3,
            disallowedRouter
        ));
    }

    function testMultiChainRouterManagement() public {
        // Test managing routers across multiple chains
        address newRouter = makeAddr("multiChainRouter");

        // Add to Ethereum
        policyConfig.setRouterAllowlist(
            ChainConfig.ETHEREUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_UNISWAP_V3,
            newRouter,
            true
        );

        // Add to Arbitrum
        policyConfig.setRouterAllowlist(
            ChainConfig.ARBITRUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_UNISWAP_V3,
            newRouter,
            true
        );

        // Verify both chains
        assertTrue(policyConfig.isRouterAllowed(
            ChainConfig.ETHEREUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_UNISWAP_V3,
            newRouter
        ));
        assertTrue(policyConfig.isRouterAllowed(
            ChainConfig.ARBITRUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_UNISWAP_V3,
            newRouter
        ));

        // Optimism should still be false
        assertFalse(policyConfig.isRouterAllowed(
            ChainConfig.OPTIMISM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_UNISWAP_V3,
            newRouter
        ));
    }
}
