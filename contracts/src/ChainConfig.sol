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

    // Uniswap V3 SwapRouter addresses (official)
    address public constant UNISWAP_V3_ROUTER_ETHEREUM = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address public constant UNISWAP_V3_ROUTER_ARBITRUM = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address public constant UNISWAP_V3_ROUTER_OPTIMISM = 0xE592427A0AEce92De3Edee1F18E0157C05861564;

    // 1inch AggregationRouterV5 addresses (official)
    address public constant ONEINCH_ROUTER_ETHEREUM = 0x1111111254EEB25477B68fb85Ed929f73A960582;
    address public constant ONEINCH_ROUTER_ARBITRUM = 0x1111111254EEB25477B68fb85Ed929f73A960582;
    address public constant ONEINCH_ROUTER_OPTIMISM = 0x1111111254EEB25477B68fb85Ed929f73A960582;

    // Additional DEX routers for diversification
    // SushiSwap Router addresses
    address public constant SUSHISWAP_ROUTER_ETHEREUM = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;
    address public constant SUSHISWAP_ROUTER_ARBITRUM = 0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506;
    address public constant SUSHISWAP_ROUTER_OPTIMISM = 0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506;

    // Curve Router addresses (for stablecoin swaps)
    address public constant CURVE_ROUTER_ETHEREUM = 0x8301AE4fc9c624d1D396cbDAa1ed877821D7C511;
    address public constant CURVE_ROUTER_ARBITRUM = 0x0000000000000000000000000000000000000000; // Not deployed on Arbitrum
    address public constant CURVE_ROUTER_OPTIMISM = 0x0000000000000000000000000000000000000000; // Not deployed on Optimism

    // Router type constants
    uint256 public constant ROUTER_TYPE_UNISWAP_V3 = 0;
    uint256 public constant ROUTER_TYPE_ONEINCH = 1;
    uint256 public constant ROUTER_TYPE_SUSHISWAP = 2;
    uint256 public constant ROUTER_TYPE_CURVE = 3;

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
     * @param routerType 0=UniswapV3, 1=1inch, 2=SushiSwap, 3=Curve
     * @return The router address
     */
    function getRouterAddress(uint256 chainId, uint256 routerType) internal pure returns (address) {
        if (routerType == ROUTER_TYPE_UNISWAP_V3) {
            // Uniswap V3
            if (chainId == ETHEREUM_CHAIN_ID) return UNISWAP_V3_ROUTER_ETHEREUM;
            if (chainId == ARBITRUM_CHAIN_ID) return UNISWAP_V3_ROUTER_ARBITRUM;
            if (chainId == OPTIMISM_CHAIN_ID) return UNISWAP_V3_ROUTER_OPTIMISM;
        } else if (routerType == ROUTER_TYPE_ONEINCH) {
            // 1inch
            if (chainId == ETHEREUM_CHAIN_ID) return ONEINCH_ROUTER_ETHEREUM;
            if (chainId == ARBITRUM_CHAIN_ID) return ONEINCH_ROUTER_ARBITRUM;
            if (chainId == OPTIMISM_CHAIN_ID) return ONEINCH_ROUTER_OPTIMISM;
        } else if (routerType == ROUTER_TYPE_SUSHISWAP) {
            // SushiSwap
            if (chainId == ETHEREUM_CHAIN_ID) return SUSHISWAP_ROUTER_ETHEREUM;
            if (chainId == ARBITRUM_CHAIN_ID) return SUSHISWAP_ROUTER_ARBITRUM;
            if (chainId == OPTIMISM_CHAIN_ID) return SUSHISWAP_ROUTER_OPTIMISM;
        } else if (routerType == ROUTER_TYPE_CURVE) {
            // Curve
            if (chainId == ETHEREUM_CHAIN_ID) return CURVE_ROUTER_ETHEREUM;
            if (chainId == ARBITRUM_CHAIN_ID) return CURVE_ROUTER_ARBITRUM;
            if (chainId == OPTIMISM_CHAIN_ID) return CURVE_ROUTER_OPTIMISM;
        }
        return address(0);
    }
}
