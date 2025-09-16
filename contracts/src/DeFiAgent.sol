// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ChainConfig} from "./ChainConfig.sol";

/**
 * @title DeFiAgent
 * @dev Basic DeFi agent contract for quote validation and execution
 */
contract DeFiAgent {
    using ChainConfig for uint256;

    // Events
    event QuoteEvaluated(
        uint256 indexed chainId,
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 expectedOut,
        bool passed,
        string[] violations
    );

    event SwapExecuted(
        uint256 indexed chainId,
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address router
    );

    // State variables
    mapping(uint256 => bool) public supportedChains;
    mapping(uint256 => mapping(uint256 => address)) public routerAddresses;
    
    address public owner;
    uint256 public maxNotionalPerTxUSD = 1000 * 1e18; // $1000 in wei
    uint256 public maxSlippageBps = 50; // 0.5%
    uint256 public maxPriceImpactBps = 150; // 1.5%
    uint256 public minPoolLiquidityUSD = 250000 * 1e18; // $250k in wei

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "DeFiAgent: not owner");
        _;
    }

    modifier onlySupportedChain() {
        require(ChainConfig.isSupportedChain(block.chainid), "DeFiAgent: unsupported chain");
        _;
    }

    constructor() {
        owner = msg.sender;
        
        // Initialize supported chains
        supportedChains[ChainConfig.ETHEREUM_CHAIN_ID] = true;
        supportedChains[ChainConfig.ARBITRUM_CHAIN_ID] = true;
        supportedChains[ChainConfig.OPTIMISM_CHAIN_ID] = true;
        
        // Initialize router addresses
        _initializeRouters();
    }

    /**
     * @dev Initialize router addresses for each chain
     */
    function _initializeRouters() internal {
        // Uniswap routers (routerType = 0)
        routerAddresses[ChainConfig.ETHEREUM_CHAIN_ID][0] = ChainConfig.UNISWAP_V3_ROUTER_ETHEREUM;
        routerAddresses[ChainConfig.ARBITRUM_CHAIN_ID][0] = ChainConfig.UNISWAP_V3_ROUTER_ARBITRUM;
        routerAddresses[ChainConfig.OPTIMISM_CHAIN_ID][0] = ChainConfig.UNISWAP_V3_ROUTER_OPTIMISM;
        
        // 1inch routers (routerType = 1)
        routerAddresses[ChainConfig.ETHEREUM_CHAIN_ID][1] = ChainConfig.ONEINCH_ROUTER_ETHEREUM;
        routerAddresses[ChainConfig.ARBITRUM_CHAIN_ID][1] = ChainConfig.ONEINCH_ROUTER_ARBITRUM;
        routerAddresses[ChainConfig.OPTIMISM_CHAIN_ID][1] = ChainConfig.ONEINCH_ROUTER_OPTIMISM;
    }

    /**
     * @dev Evaluate a quote against policy constraints
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Input amount
     * @param expectedOut Expected output amount
     * @param priceImpactBps Price impact in basis points
     * @param notionalInUSD Notional value in USD
     * @param poolLiquidityUSD Pool liquidity in USD
     * @return passed Whether the quote passes policy checks
     * @return violations Array of violation reasons
     */
    function evaluateQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 expectedOut,
        uint256 priceImpactBps,
        uint256 notionalInUSD,
        uint256 poolLiquidityUSD
    ) external onlySupportedChain returns (bool passed, string[] memory violations) {
        string[] memory tempViolations = new string[](5);
        uint256 violationCount = 0;

        // Check notional size
        if (notionalInUSD > maxNotionalPerTxUSD) {
            tempViolations[violationCount] = "NotionalTooLarge";
            violationCount++;
        }

        // Check price impact
        if (priceImpactBps > maxPriceImpactBps) {
            tempViolations[violationCount] = "PriceImpactHigh";
            violationCount++;
        }

        // Check pool liquidity
        if (poolLiquidityUSD < minPoolLiquidityUSD) {
            tempViolations[violationCount] = "LiquidityTooLow";
            violationCount++;
        }

        // Check for zero amounts
        if (amountIn == 0) {
            tempViolations[violationCount] = "ZeroAmountIn";
            violationCount++;
        }

        if (expectedOut == 0) {
            tempViolations[violationCount] = "ZeroAmountOut";
            violationCount++;
        }

        // Create final violations array
        violations = new string[](violationCount);
        for (uint256 i = 0; i < violationCount; i++) {
            violations[i] = tempViolations[i];
        }

        passed = violationCount == 0;

        emit QuoteEvaluated(
            block.chainid,
            msg.sender,
            tokenIn,
            tokenOut,
            amountIn,
            expectedOut,
            passed,
            violations
        );
    }

    /**
     * @dev Execute a swap (placeholder - will be implemented in future PRs)
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Input amount
     * @param routerType Router type (0 = Uniswap, 1 = 1inch)
     * @param swapCalldata Swap calldata
     */
    function executeSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 routerType,
        bytes calldata swapCalldata
    ) external onlySupportedChain {
        address router = routerAddresses[block.chainid][routerType];
        require(router != address(0), "DeFiAgent: unsupported router");

        // TODO: Implement actual swap execution in future PRs
        // This is a placeholder that emits an event
        
        emit SwapExecuted(
            block.chainid,
            msg.sender,
            tokenIn,
            tokenOut,
            amountIn,
            0, // amountOut will be set after execution
            router
        );
    }

    /**
     * @dev Update policy parameters (only owner)
     */
    function updatePolicy(
        uint256 _maxNotionalPerTxUSD,
        uint256 _maxSlippageBps,
        uint256 _maxPriceImpactBps,
        uint256 _minPoolLiquidityUSD
    ) external onlyOwner {
        maxNotionalPerTxUSD = _maxNotionalPerTxUSD;
        maxSlippageBps = _maxSlippageBps;
        maxPriceImpactBps = _maxPriceImpactBps;
        minPoolLiquidityUSD = _minPoolLiquidityUSD;
    }

    /**
     * @dev Add or remove supported chain (only owner)
     */
    function setSupportedChain(uint256 chainId, bool supported) external onlyOwner {
        supportedChains[chainId] = supported;
    }

    /**
     * @dev Update router address (only owner)
     */
    function setRouterAddress(uint256 chainId, uint256 routerType, address router) external onlyOwner {
        routerAddresses[chainId][routerType] = router;
    }
}
