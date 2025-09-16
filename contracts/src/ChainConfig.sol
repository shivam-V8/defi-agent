// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ChainConfig
 * @dev Chain configuration constants for supported networks
 */
library ChainConfig {
    // Chain IDs
    uint256 public constant ETHEREUM_CHAIN_ID = 1;
    uint256 public constant ARBITRUM_CHAIN_ID = 42161;
    uint256 public constant OPTIMISM_CHAIN_ID = 10;
    uint256 public constant SEPOLIA_CHAIN_ID = 11155111;
    uint256 public constant ARBITRUM_SEPOLIA_CHAIN_ID = 421614;
    uint256 public constant OPTIMISM_SEPOLIA_CHAIN_ID = 11155420;

    // Network names
    string public constant ETHEREUM_NAME = "ethereum";
    string public constant ARBITRUM_NAME = "arbitrum";
    string public constant OPTIMISM_NAME = "optimism";
    string public constant SEPOLIA_NAME = "sepolia";
    string public constant ARBITRUM_SEPOLIA_NAME = "arbitrum-sepolia";
    string public constant OPTIMISM_SEPOLIA_NAME = "optimism-sepolia";

    // Router addresses (placeholder - will be updated with actual addresses)
    address public constant UNISWAP_V3_ROUTER_ETHEREUM = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address public constant UNISWAP_V3_ROUTER_ARBITRUM = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address public constant UNISWAP_V3_ROUTER_OPTIMISM = 0xE592427A0AEce92De3Edee1F18E0157C05861564;

    // 1inch router addresses (placeholder)
    address public constant ONEINCH_ROUTER_ETHEREUM = 0x1111111254EEB25477B68fb85Ed929f73A960582;
    address public constant ONEINCH_ROUTER_ARBITRUM = 0x1111111254EEB25477B68fb85Ed929f73A960582;
    address public constant ONEINCH_ROUTER_OPTIMISM = 0x1111111254EEB25477B68fb85Ed929f73A960582;

    /**
     * @dev Get chain name by chain ID
     * @param chainId The chain ID
     * @return The chain name
     */
    function getChainName(uint256 chainId) internal pure returns (string memory) {
        if (chainId == ETHEREUM_CHAIN_ID) return ETHEREUM_NAME;
        if (chainId == ARBITRUM_CHAIN_ID) return ARBITRUM_NAME;
        if (chainId == OPTIMISM_CHAIN_ID) return OPTIMISM_NAME;
        if (chainId == SEPOLIA_CHAIN_ID) return SEPOLIA_NAME;
        if (chainId == ARBITRUM_SEPOLIA_CHAIN_ID) return ARBITRUM_SEPOLIA_NAME;
        if (chainId == OPTIMISM_SEPOLIA_CHAIN_ID) return OPTIMISM_SEPOLIA_NAME;
        return "unknown";
    }

    /**
     * @dev Check if chain ID is supported
     * @param chainId The chain ID
     * @return True if supported
     */
    function isSupportedChain(uint256 chainId) internal pure returns (bool) {
        return chainId == ETHEREUM_CHAIN_ID ||
               chainId == ARBITRUM_CHAIN_ID ||
               chainId == OPTIMISM_CHAIN_ID ||
               chainId == SEPOLIA_CHAIN_ID ||
               chainId == ARBITRUM_SEPOLIA_CHAIN_ID ||
               chainId == OPTIMISM_SEPOLIA_CHAIN_ID;
    }

    /**
     * @dev Get router address for a given chain and router type
     * @param chainId The chain ID
     * @param routerType 0 for Uniswap, 1 for 1inch
     * @return The router address
     */
    function getRouterAddress(uint256 chainId, uint256 routerType) internal pure returns (address) {
        if (routerType == 0) {
            // Uniswap
            if (chainId == ETHEREUM_CHAIN_ID) return UNISWAP_V3_ROUTER_ETHEREUM;
            if (chainId == ARBITRUM_CHAIN_ID) return UNISWAP_V3_ROUTER_ARBITRUM;
            if (chainId == OPTIMISM_CHAIN_ID) return UNISWAP_V3_ROUTER_OPTIMISM;
        } else if (routerType == 1) {
            // 1inch
            if (chainId == ETHEREUM_CHAIN_ID) return ONEINCH_ROUTER_ETHEREUM;
            if (chainId == ARBITRUM_CHAIN_ID) return ONEINCH_ROUTER_ARBITRUM;
            if (chainId == OPTIMISM_CHAIN_ID) return ONEINCH_ROUTER_OPTIMISM;
        }
        return address(0);
    }
}
