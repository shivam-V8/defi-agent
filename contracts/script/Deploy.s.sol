// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {DeFiAgent} from "../src/DeFiAgent.sol";
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

        // Deploy DeFiAgent contract
        DeFiAgent defiAgent = new DeFiAgent();
        
        console.log("DeFiAgent deployed to:", address(defiAgent));

        vm.stopBroadcast();

        // Verify deployment
        console.log("Deployment completed successfully!");
        console.log("Contract address:", address(defiAgent));
        console.log("Owner:", defiAgent.owner());
        console.log("Max notional per tx USD:", defiAgent.maxNotionalPerTxUSD());
        console.log("Max slippage BPS:", defiAgent.maxSlippageBps());
        console.log("Max price impact BPS:", defiAgent.maxPriceImpactBps());
        console.log("Min pool liquidity USD:", defiAgent.minPoolLiquidityUSD());
    }
}
