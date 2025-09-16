// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {DeFiAgent} from "../src/DeFiAgent.sol";
import {PolicyConfig} from "../src/PolicyConfig.sol";
import {AgentExecutor} from "../src/AgentExecutor.sol";
import {ChainConfig} from "../src/ChainConfig.sol";

/**
 * @title Deploy
 * @dev Deployment script for DeFiAgent contract
 */
contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts with the account:", deployer);
        console.log("Account balance:", deployer.balance);
        console.log("Chain ID:", block.chainid);
        console.log("Chain name:", ChainConfig.getChainName(block.chainid));

        vm.startBroadcast(deployerPrivateKey);

        // Deploy PolicyConfig contract first
        PolicyConfig policyConfig = new PolicyConfig();
        console.log("PolicyConfig deployed to:", address(policyConfig));

        // Deploy DeFiAgent contract with PolicyConfig address
        DeFiAgent defiAgent = new DeFiAgent(address(policyConfig));
        console.log("DeFiAgent deployed to:", address(defiAgent));

        // Deploy AgentExecutor contract with PolicyConfig address
        AgentExecutor agentExecutor = new AgentExecutor(address(policyConfig));
        console.log("AgentExecutor deployed to:", address(agentExecutor));

        vm.stopBroadcast();

        // Verify deployment
        console.log("Deployment completed successfully!");
        console.log("PolicyConfig address:", address(policyConfig));
        console.log("DeFiAgent address:", address(defiAgent));
        console.log("AgentExecutor address:", address(agentExecutor));
        console.log("DeFiAgent owner:", defiAgent.owner());
        console.log("AgentExecutor owner:", agentExecutor.owner());
        console.log("DeFiAgent max notional per tx USD:", defiAgent.maxNotionalPerTxUSD());
        console.log("PolicyConfig owner:", policyConfig.owner());
        
        // Verify policy parameters
        (
            uint256 maxSlippageBps,
            uint256 maxPriceImpactBps,
            uint256 minLiquidityUSD,
            uint256 ttlSeconds,
            uint256 approvalMultiplier
        ) = policyConfig.getPolicyParameters();
        
        console.log("Policy parameters:");
        console.log("  Max slippage BPS:", maxSlippageBps);
        console.log("  Max price impact BPS:", maxPriceImpactBps);
        console.log("  Min liquidity USD:", minLiquidityUSD);
        console.log("  TTL seconds:", ttlSeconds);
        console.log("  Approval multiplier:", approvalMultiplier);
    }
}
