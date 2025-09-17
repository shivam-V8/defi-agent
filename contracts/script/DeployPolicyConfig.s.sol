// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PolicyConfig} from "../src/PolicyConfig.sol";
import {ChainConfig} from "../src/ChainConfig.sol";

/**
 * @title DeployPolicyConfig
 * @dev Deployment script for PolicyConfig contract
 * @notice This script deploys PolicyConfig with default router allowlists
 */
contract DeployPolicyConfig is Script {
    PolicyConfig public policyConfig;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying PolicyConfig with deployer:", deployer);
        console.log("Deployer balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy PolicyConfig
        policyConfig = new PolicyConfig();
        
        console.log("PolicyConfig deployed at:", address(policyConfig));

        // Verify initial configuration
        console.log("\n=== Initial Configuration ===");
        
        // Check supported chains
        console.log("Ethereum supported:", policyConfig.isChainSupported(ChainConfig.ETHEREUM_CHAIN_ID));
        console.log("Arbitrum supported:", policyConfig.isChainSupported(ChainConfig.ARBITRUM_CHAIN_ID));
        console.log("Optimism supported:", policyConfig.isChainSupported(ChainConfig.OPTIMISM_CHAIN_ID));

        // Check router allowlists
        console.log("\n=== Router Allowlists ===");
        
        // Ethereum routers
        console.log("Ethereum UniswapV3 allowed:", policyConfig.isRouterAllowed(
            ChainConfig.ETHEREUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_UNISWAP_V3,
            ChainConfig.UNISWAP_V3_ROUTER_ETHEREUM
        ));
        console.log("Ethereum 1inch allowed:", policyConfig.isRouterAllowed(
            ChainConfig.ETHEREUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_ONEINCH,
            ChainConfig.ONEINCH_ROUTER_ETHEREUM
        ));
        console.log("Ethereum SushiSwap allowed:", policyConfig.isRouterAllowed(
            ChainConfig.ETHEREUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_SUSHISWAP,
            ChainConfig.SUSHISWAP_ROUTER_ETHEREUM
        ));
        console.log("Ethereum Curve allowed:", policyConfig.isRouterAllowed(
            ChainConfig.ETHEREUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_CURVE,
            ChainConfig.CURVE_ROUTER_ETHEREUM
        ));

        // Arbitrum routers
        console.log("Arbitrum UniswapV3 allowed:", policyConfig.isRouterAllowed(
            ChainConfig.ARBITRUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_UNISWAP_V3,
            ChainConfig.UNISWAP_V3_ROUTER_ARBITRUM
        ));
        console.log("Arbitrum 1inch allowed:", policyConfig.isRouterAllowed(
            ChainConfig.ARBITRUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_ONEINCH,
            ChainConfig.ONEINCH_ROUTER_ARBITRUM
        ));
        console.log("Arbitrum SushiSwap allowed:", policyConfig.isRouterAllowed(
            ChainConfig.ARBITRUM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_SUSHISWAP,
            ChainConfig.SUSHISWAP_ROUTER_ARBITRUM
        ));

        // Optimism routers
        console.log("Optimism UniswapV3 allowed:", policyConfig.isRouterAllowed(
            ChainConfig.OPTIMISM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_UNISWAP_V3,
            ChainConfig.UNISWAP_V3_ROUTER_OPTIMISM
        ));
        console.log("Optimism 1inch allowed:", policyConfig.isRouterAllowed(
            ChainConfig.OPTIMISM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_ONEINCH,
            ChainConfig.ONEINCH_ROUTER_OPTIMISM
        ));
        console.log("Optimism SushiSwap allowed:", policyConfig.isRouterAllowed(
            ChainConfig.OPTIMISM_CHAIN_ID,
            ChainConfig.ROUTER_TYPE_SUSHISWAP,
            ChainConfig.SUSHISWAP_ROUTER_OPTIMISM
        ));

        // Check policy parameters
        console.log("\n=== Policy Parameters ===");
        (uint256 maxSlippage, uint256 maxPriceImpact, uint256 minLiquidity, uint256 ttl, uint256 approvalMult) = 
            policyConfig.getPolicyParameters();
        console.log("Max slippage (bps):", maxSlippage);
        console.log("Max price impact (bps):", maxPriceImpact);
        console.log("Min liquidity (USD):", minLiquidity);
        console.log("TTL (seconds):", ttl);
        console.log("Approval multiplier:", approvalMult);

        vm.stopBroadcast();

        console.log("\n=== Deployment Complete ===");
        console.log("PolicyConfig address:", address(policyConfig));
        console.log("Owner:", policyConfig.owner());
    }
}
