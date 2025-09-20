// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ChainConfig} from "./ChainConfig.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "openzeppelin-contracts/contracts/utils/Pausable.sol";

/**
 * @title PolicyConfig
 * @dev On-chain source of truth for global guardrails and policy parameters
 * @notice Stores router allowlists per chain, policy parameters, and provides read-only getters
 */
contract PolicyConfig is ReentrancyGuard, Pausable {
    using ChainConfig for uint256;

    // Events
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

    // State variables
    address public owner;

    // Policy parameters
    uint256 public maxSlippageBps = 50; // 0.5% default
    uint256 public maxPriceImpactBps = 150; // 1.5% default
    uint256 public minLiquidityUSD = 250000 * 1e18; // $250k default
    uint256 public ttlSeconds = 120; // 2 minutes default
    uint256 public approvalMultiplier = 102; // 1.02x default (102/100)

    // Router allowlists per chain
    mapping(uint256 => bool) public supportedChains;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public routerAllowlist; // chainId => routerType => routerAddress => allowed

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "PolicyConfig: not owner");
        _;
    }

    modifier onlySupportedChain(uint256 chainId) {
        require(supportedChains[chainId], "PolicyConfig: unsupported chain");
        _;
    }

    // Pause/Unpause functions
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    constructor() {
        owner = msg.sender;
        
        // Initialize supported chains
        supportedChains[ChainConfig.ETHEREUM_CHAIN_ID] = true;
        supportedChains[ChainConfig.ARBITRUM_CHAIN_ID] = true;
        supportedChains[ChainConfig.OPTIMISM_CHAIN_ID] = true;
        supportedChains[ChainConfig.SEPOLIA_CHAIN_ID] = true;
        supportedChains[ChainConfig.ARBITRUM_SEPOLIA_CHAIN_ID] = true;
        supportedChains[ChainConfig.OPTIMISM_SEPOLIA_CHAIN_ID] = true;

        // Initialize default router allowlists
        _initializeDefaultRouters();
    }

    /**
     * @dev Initialize default router allowlists for each supported chain
     */
    function _initializeDefaultRouters() internal {
        // Ethereum mainnet routers
        routerAllowlist[ChainConfig.ETHEREUM_CHAIN_ID][ChainConfig.ROUTER_TYPE_UNISWAP_V3][ChainConfig.UNISWAP_V3_ROUTER_ETHEREUM] = true;
        routerAllowlist[ChainConfig.ETHEREUM_CHAIN_ID][ChainConfig.ROUTER_TYPE_ONEINCH][ChainConfig.ONEINCH_ROUTER_ETHEREUM] = true;
        routerAllowlist[ChainConfig.ETHEREUM_CHAIN_ID][ChainConfig.ROUTER_TYPE_SUSHISWAP][ChainConfig.SUSHISWAP_ROUTER_ETHEREUM] = true;
        routerAllowlist[ChainConfig.ETHEREUM_CHAIN_ID][ChainConfig.ROUTER_TYPE_CURVE][ChainConfig.CURVE_ROUTER_ETHEREUM] = true;

        // Arbitrum routers
        routerAllowlist[ChainConfig.ARBITRUM_CHAIN_ID][ChainConfig.ROUTER_TYPE_UNISWAP_V3][ChainConfig.UNISWAP_V3_ROUTER_ARBITRUM] = true;
        routerAllowlist[ChainConfig.ARBITRUM_CHAIN_ID][ChainConfig.ROUTER_TYPE_ONEINCH][ChainConfig.ONEINCH_ROUTER_ARBITRUM] = true;
        routerAllowlist[ChainConfig.ARBITRUM_CHAIN_ID][ChainConfig.ROUTER_TYPE_SUSHISWAP][ChainConfig.SUSHISWAP_ROUTER_ARBITRUM] = true;
        // Curve not deployed on Arbitrum

        // Optimism routers
        routerAllowlist[ChainConfig.OPTIMISM_CHAIN_ID][ChainConfig.ROUTER_TYPE_UNISWAP_V3][ChainConfig.UNISWAP_V3_ROUTER_OPTIMISM] = true;
        routerAllowlist[ChainConfig.OPTIMISM_CHAIN_ID][ChainConfig.ROUTER_TYPE_ONEINCH][ChainConfig.ONEINCH_ROUTER_OPTIMISM] = true;
        routerAllowlist[ChainConfig.OPTIMISM_CHAIN_ID][ChainConfig.ROUTER_TYPE_SUSHISWAP][ChainConfig.SUSHISWAP_ROUTER_OPTIMISM] = true;
        // Curve not deployed on Optimism
    }

    // ============ READ-ONLY GETTERS ============

    /**
     * @dev Get all policy parameters in a single call
     * @return maxSlippage Maximum slippage in basis points
     * @return maxPriceImpact Maximum price impact in basis points
     * @return minLiquidity Minimum pool liquidity in USD (wei)
     * @return ttl Quote TTL in seconds
     * @return approvalMult Approval multiplier (e.g., 102 for 1.02x)
     */
    function getPolicyParameters() external view returns (
        uint256 maxSlippage,
        uint256 maxPriceImpact,
        uint256 minLiquidity,
        uint256 ttl,
        uint256 approvalMult
    ) {
        return (maxSlippageBps, maxPriceImpactBps, minLiquidityUSD, ttlSeconds, approvalMultiplier);
    }

    /**
     * @dev Check if a router is allowed for a specific chain and router type
     * @param chainId The chain ID
     * @param routerType The router type (0 = Uniswap, 1 = 1inch, etc.)
     * @param routerAddress The router contract address
     * @return allowed True if the router is allowed
     */
    function isRouterAllowed(
        uint256 chainId,
        uint256 routerType,
        address routerAddress
    ) external view returns (bool allowed) {
        return routerAllowlist[chainId][routerType][routerAddress];
    }

    /**
     * @dev Check if a chain is supported
     * @param chainId The chain ID
     * @return supported True if the chain is supported
     */
    function isChainSupported(uint256 chainId) external view returns (bool supported) {
        return supportedChains[chainId];
    }

    /**
     * @dev Get all allowed routers for a specific chain and router type
     * @param chainId The chain ID
     * @param routerType The router type
     * @return allowedRouters Array of allowed router addresses
     * @notice This is a view function but may be gas-intensive for large allowlists
     */
    function getAllowedRouters(
        uint256 chainId,
        uint256 routerType
    ) external view returns (address[] memory allowedRouters) {
        // This is a simplified implementation
        // In practice, you might want to maintain a separate array of allowed routers
        // or use events to track them off-chain
        
        // For now, return the known default routers
        if (chainId == ChainConfig.ETHEREUM_CHAIN_ID) {
            if (routerType == ChainConfig.ROUTER_TYPE_UNISWAP_V3) {
                allowedRouters = new address[](1);
                allowedRouters[0] = ChainConfig.UNISWAP_V3_ROUTER_ETHEREUM;
            } else if (routerType == ChainConfig.ROUTER_TYPE_ONEINCH) {
                allowedRouters = new address[](1);
                allowedRouters[0] = ChainConfig.ONEINCH_ROUTER_ETHEREUM;
            } else if (routerType == ChainConfig.ROUTER_TYPE_SUSHISWAP) {
                allowedRouters = new address[](1);
                allowedRouters[0] = ChainConfig.SUSHISWAP_ROUTER_ETHEREUM;
            } else if (routerType == ChainConfig.ROUTER_TYPE_CURVE) {
                allowedRouters = new address[](1);
                allowedRouters[0] = ChainConfig.CURVE_ROUTER_ETHEREUM;
            }
        } else if (chainId == ChainConfig.ARBITRUM_CHAIN_ID) {
            if (routerType == ChainConfig.ROUTER_TYPE_UNISWAP_V3) {
                allowedRouters = new address[](1);
                allowedRouters[0] = ChainConfig.UNISWAP_V3_ROUTER_ARBITRUM;
            } else if (routerType == ChainConfig.ROUTER_TYPE_ONEINCH) {
                allowedRouters = new address[](1);
                allowedRouters[0] = ChainConfig.ONEINCH_ROUTER_ARBITRUM;
            } else if (routerType == ChainConfig.ROUTER_TYPE_SUSHISWAP) {
                allowedRouters = new address[](1);
                allowedRouters[0] = ChainConfig.SUSHISWAP_ROUTER_ARBITRUM;
            }
            // Curve not deployed on Arbitrum
        } else if (chainId == ChainConfig.OPTIMISM_CHAIN_ID) {
            if (routerType == ChainConfig.ROUTER_TYPE_UNISWAP_V3) {
                allowedRouters = new address[](1);
                allowedRouters[0] = ChainConfig.UNISWAP_V3_ROUTER_OPTIMISM;
            } else if (routerType == ChainConfig.ROUTER_TYPE_ONEINCH) {
                allowedRouters = new address[](1);
                allowedRouters[0] = ChainConfig.ONEINCH_ROUTER_OPTIMISM;
            } else if (routerType == ChainConfig.ROUTER_TYPE_SUSHISWAP) {
                allowedRouters = new address[](1);
                allowedRouters[0] = ChainConfig.SUSHISWAP_ROUTER_OPTIMISM;
            }
            // Curve not deployed on Optimism
        }
        
        return allowedRouters;
    }

    // ============ OWNER-ONLY SETTERS ============

    /**
     * @dev Update policy parameters
     * @param _maxSlippageBps Maximum slippage in basis points
     * @param _maxPriceImpactBps Maximum price impact in basis points
     * @param _minLiquidityUSD Minimum pool liquidity in USD (wei)
     * @param _ttlSeconds Quote TTL in seconds
     * @param _approvalMultiplier Approval multiplier (e.g., 102 for 1.02x)
     */
    function updatePolicyParameters(
        uint256 _maxSlippageBps,
        uint256 _maxPriceImpactBps,
        uint256 _minLiquidityUSD,
        uint256 _ttlSeconds,
        uint256 _approvalMultiplier
    ) external onlyOwner {
        require(_maxSlippageBps <= 1000, "PolicyConfig: slippage too high"); // Max 10%
        require(_maxPriceImpactBps <= 1000, "PolicyConfig: price impact too high"); // Max 10%
        require(_minLiquidityUSD >= 1000 * 1e18, "PolicyConfig: liquidity too low"); // Min $1k
        require(_ttlSeconds >= 30 && _ttlSeconds <= 3600, "PolicyConfig: invalid TTL"); // 30s to 1h
        require(_approvalMultiplier >= 100 && _approvalMultiplier <= 110, "PolicyConfig: invalid multiplier"); // 1x to 1.1x

        maxSlippageBps = _maxSlippageBps;
        maxPriceImpactBps = _maxPriceImpactBps;
        minLiquidityUSD = _minLiquidityUSD;
        ttlSeconds = _ttlSeconds;
        approvalMultiplier = _approvalMultiplier;

        emit PolicyUpdated(_maxSlippageBps, _maxPriceImpactBps, _minLiquidityUSD, _ttlSeconds, _approvalMultiplier);
    }

    /**
     * @dev Add or remove a router from the allowlist
     * @param chainId The chain ID
     * @param routerType The router type (0 = Uniswap, 1 = 1inch, etc.)
     * @param routerAddress The router contract address
     * @param allowed Whether the router should be allowed
     */
    function setRouterAllowlist(
        uint256 chainId,
        uint256 routerType,
        address routerAddress,
        bool allowed
    ) external onlyOwner onlySupportedChain(chainId) whenNotPaused nonReentrant {
        require(routerAddress != address(0), "PolicyConfig: zero address");
        require(routerType <= 10, "PolicyConfig: invalid router type"); // Reasonable limit

        routerAllowlist[chainId][routerType][routerAddress] = allowed;

        emit RouterAllowlistUpdated(chainId, routerType, routerAddress, allowed);
    }

    /**
     * @dev Batch update router allowlists
     * @param chainIds Array of chain IDs
     * @param routerTypes Array of router types
     * @param routerAddresses Array of router addresses
     * @param allowedValues Array of allowed values
     */
    function batchSetRouterAllowlist(
        uint256[] calldata chainIds,
        uint256[] calldata routerTypes,
        address[] calldata routerAddresses,
        bool[] calldata allowedValues
    ) external onlyOwner {
        require(
            chainIds.length == routerTypes.length &&
            routerTypes.length == routerAddresses.length &&
            routerAddresses.length == allowedValues.length,
            "PolicyConfig: array length mismatch"
        );

        for (uint256 i = 0; i < chainIds.length; i++) {
            require(supportedChains[chainIds[i]], "PolicyConfig: unsupported chain");
            require(routerAddresses[i] != address(0), "PolicyConfig: zero address");
            require(routerTypes[i] <= 10, "PolicyConfig: invalid router type");

            routerAllowlist[chainIds[i]][routerTypes[i]][routerAddresses[i]] = allowedValues[i];

            emit RouterAllowlistUpdated(chainIds[i], routerTypes[i], routerAddresses[i], allowedValues[i]);
        }
    }

    /**
     * @dev Add or remove chain support
     * @param chainId The chain ID
     * @param supported Whether the chain should be supported
     */
    function setChainSupport(uint256 chainId, bool supported) external onlyOwner whenNotPaused nonReentrant {
        supportedChains[chainId] = supported;
        emit ChainSupportUpdated(chainId, supported);
    }

    /**
     * @dev Transfer ownership to a new owner
     * @param newOwner The new owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "PolicyConfig: zero address");
        require(newOwner != owner, "PolicyConfig: same owner");

        address previousOwner = owner;
        owner = newOwner;

        emit OwnershipTransferred(previousOwner, newOwner);
    }

    /**
     * @dev Renounce ownership (sets owner to zero address)
     * @notice This will make the contract ungoverned - use with extreme caution
     */
    function renounceOwnership() external onlyOwner {
        address previousOwner = owner;
        owner = address(0);
        emit OwnershipTransferred(previousOwner, address(0));
    }
}
