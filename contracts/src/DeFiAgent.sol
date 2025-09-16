// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ChainConfig} from "./ChainConfig.sol";
import {PolicyConfig} from "./PolicyConfig.sol";

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
    PolicyConfig public policyConfig;
    address public owner;
    uint256 public maxNotionalPerTxUSD = 1000 * 1e18; // $1000 in wei

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "DeFiAgent: not owner");
        _;
    }

    modifier onlySupportedChain() {
        require(policyConfig.isChainSupported(block.chainid), "DeFiAgent: unsupported chain");
        _;
    }

    constructor(address _policyConfig) {
        require(_policyConfig != address(0), "DeFiAgent: zero address");
        owner = msg.sender;
        policyConfig = PolicyConfig(_policyConfig);
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

        // Get policy parameters from PolicyConfig
        (
            uint256 maxSlippageBps,
            uint256 maxPriceImpactBps,
            uint256 minLiquidityUSD,
            ,
        ) = policyConfig.getPolicyParameters();

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
        if (poolLiquidityUSD < minLiquidityUSD) {
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
        // Get allowed routers from PolicyConfig
        address[] memory allowedRouters = policyConfig.getAllowedRouters(block.chainid, routerType);
        require(allowedRouters.length > 0, "DeFiAgent: no allowed routers");
        
        // For now, use the first allowed router
        // In the future, this could implement router selection logic
        address router = allowedRouters[0];
        
        // Verify the router is still allowed
        require(policyConfig.isRouterAllowed(block.chainid, routerType, router), "DeFiAgent: router not allowed");

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
     * @dev Update max notional per transaction (only owner)
     * @notice Other policy parameters are managed by PolicyConfig contract
     */
    function updateMaxNotionalPerTxUSD(uint256 _maxNotionalPerTxUSD) external onlyOwner {
        maxNotionalPerTxUSD = _maxNotionalPerTxUSD;
    }

    /**
     * @dev Update PolicyConfig contract address (only owner)
     * @notice This allows upgrading the policy configuration
     */
    function updatePolicyConfig(address _policyConfig) external onlyOwner {
        require(_policyConfig != address(0), "DeFiAgent: zero address");
        policyConfig = PolicyConfig(_policyConfig);
    }
}
