// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {DeFiAgent} from "../src/DeFiAgent.sol";
import {ChainConfig} from "../src/ChainConfig.sol";

/**
 * @title DeployMultiChain
 * @dev Multi-chain deployment script for DeFiAgent contract
 */
contract DeployMultiChain is Script {
    struct DeploymentInfo {
        uint256 chainId;
        string chainName;
        address contractAddress;
        bool deployed;
    }

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts with the account:", deployer);
        console.log("Account balance:", deployer.balance);

        // Define chains to deploy to
        uint256[] memory chainIds = new uint256[](3);
        chainIds[0] = ChainConfig.ETHEREUM_CHAIN_ID;
        chainIds[1] = ChainConfig.ARBITRUM_CHAIN_ID;
        chainIds[2] = ChainConfig.OPTIMISM_CHAIN_ID;

        DeploymentInfo[] memory deployments = new DeploymentInfo[](chainIds.length);

        for (uint256 i = 0; i < chainIds.length; i++) {
            uint256 chainId = chainIds[i];
            string memory chainName = ChainConfig.getChainName(chainId);
            
            console.log("\n=== Deploying to", chainName, "===");
            console.log("Chain ID:", chainId);

            // Check if we're on the correct chain
            if (block.chainid != chainId) {
                console.log("Skipping", chainName, "- not on correct chain");
                deployments[i] = DeploymentInfo({
                    chainId: chainId,
                    chainName: chainName,
                    contractAddress: address(0),
                    deployed: false
                });
                continue;
            }

            vm.startBroadcast(deployerPrivateKey);

            // Deploy DeFiAgent contract
            DeFiAgent defiAgent = new DeFiAgent();
            
            vm.stopBroadcast();

            deployments[i] = DeploymentInfo({
                chainId: chainId,
                chainName: chainName,
                contractAddress: address(defiAgent),
                deployed: true
            });

            console.log("DeFiAgent deployed to:", address(defiAgent));
            console.log("Owner:", defiAgent.owner());
        }

        // Print deployment summary
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        for (uint256 i = 0; i < deployments.length; i++) {
            DeploymentInfo memory info = deployments[i];
            if (info.deployed) {
                console.log("SUCCESS", info.chainName, ":", info.contractAddress);
            } else {
                console.log("SKIPPED", info.chainName, ": Not deployed (wrong chain)");
            }
        }
    }
}
