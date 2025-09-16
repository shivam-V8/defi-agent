// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {ChainConfig} from "../src/ChainConfig.sol";

/**
 * @title ChainConfigTest
 * @dev Test suite for ChainConfig library
 */
contract ChainConfigTest is Test {
    function testChainIds() public {
        assertEq(ChainConfig.ETHEREUM_CHAIN_ID, 1);
        assertEq(ChainConfig.ARBITRUM_CHAIN_ID, 42161);
        assertEq(ChainConfig.OPTIMISM_CHAIN_ID, 10);
        assertEq(ChainConfig.SEPOLIA_CHAIN_ID, 11155111);
        assertEq(ChainConfig.ARBITRUM_SEPOLIA_CHAIN_ID, 421614);
        assertEq(ChainConfig.OPTIMISM_SEPOLIA_CHAIN_ID, 11155420);
    }

    function testChainNames() public {
        assertEq(ChainConfig.ETHEREUM_NAME, "ethereum");
        assertEq(ChainConfig.ARBITRUM_NAME, "arbitrum");
        assertEq(ChainConfig.OPTIMISM_NAME, "optimism");
        assertEq(ChainConfig.SEPOLIA_NAME, "sepolia");
        assertEq(ChainConfig.ARBITRUM_SEPOLIA_NAME, "arbitrum-sepolia");
        assertEq(ChainConfig.OPTIMISM_SEPOLIA_NAME, "optimism-sepolia");
    }

    function testGetChainName() public {
        assertEq(ChainConfig.getChainName(1), "ethereum");
        assertEq(ChainConfig.getChainName(42161), "arbitrum");
        assertEq(ChainConfig.getChainName(10), "optimism");
        assertEq(ChainConfig.getChainName(11155111), "sepolia");
        assertEq(ChainConfig.getChainName(421614), "arbitrum-sepolia");
        assertEq(ChainConfig.getChainName(11155420), "optimism-sepolia");
        assertEq(ChainConfig.getChainName(999), "unknown");
    }

    function testIsSupportedChain() public {
        assertTrue(ChainConfig.isSupportedChain(1));
        assertTrue(ChainConfig.isSupportedChain(42161));
        assertTrue(ChainConfig.isSupportedChain(10));
        assertTrue(ChainConfig.isSupportedChain(11155111));
        assertTrue(ChainConfig.isSupportedChain(421614));
        assertTrue(ChainConfig.isSupportedChain(11155420));
        assertFalse(ChainConfig.isSupportedChain(999));
        assertFalse(ChainConfig.isSupportedChain(0));
    }

    function testGetRouterAddress() public {
        // Test Uniswap routers (routerType = 0)
        assertNotEq(ChainConfig.getRouterAddress(1, 0), address(0));
        assertNotEq(ChainConfig.getRouterAddress(42161, 0), address(0));
        assertNotEq(ChainConfig.getRouterAddress(10, 0), address(0));
        
        // Test 1inch routers (routerType = 1)
        assertNotEq(ChainConfig.getRouterAddress(1, 1), address(0));
        assertNotEq(ChainConfig.getRouterAddress(42161, 1), address(0));
        assertNotEq(ChainConfig.getRouterAddress(10, 1), address(0));
        
        // Test unsupported chains
        assertEq(ChainConfig.getRouterAddress(999, 0), address(0));
        assertEq(ChainConfig.getRouterAddress(999, 1), address(0));
        
        // Test unsupported router types
        assertEq(ChainConfig.getRouterAddress(1, 999), address(0));
    }

    function testRouterAddresses() public {
        // Verify specific router addresses are set
        assertEq(ChainConfig.UNISWAP_V3_ROUTER_ETHEREUM, 0xE592427A0AEce92De3Edee1F18E0157C05861564);
        assertEq(ChainConfig.ONEINCH_ROUTER_ETHEREUM, 0x1111111254EEB25477B68fb85Ed929f73A960582);
        
        // Verify addresses are not zero
        assertNotEq(ChainConfig.UNISWAP_V3_ROUTER_ETHEREUM, address(0));
        assertNotEq(ChainConfig.UNISWAP_V3_ROUTER_ARBITRUM, address(0));
        assertNotEq(ChainConfig.UNISWAP_V3_ROUTER_OPTIMISM, address(0));
        assertNotEq(ChainConfig.ONEINCH_ROUTER_ETHEREUM, address(0));
        assertNotEq(ChainConfig.ONEINCH_ROUTER_ARBITRUM, address(0));
        assertNotEq(ChainConfig.ONEINCH_ROUTER_OPTIMISM, address(0));
    }
}
