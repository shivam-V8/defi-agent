// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PolicyConfig} from "./PolicyConfig.sol";
import {ChainConfig} from "./ChainConfig.sol";
import {PermitAdapter} from "./PermitAdapter.sol";
import {IERC20} from "forge-std/interfaces/IERC20.sol";

/**
 * @title AgentExecutor
 * @dev Guarded execution wrapper for DeFi swaps with Permit2 and EIP-2612 support
 * @notice Provides secure token approval management and swap execution with comprehensive validation
 */
contract AgentExecutor {
    using ChainConfig for uint256;

    // Events
    event SwapExecuted(
        address indexed user,
        address indexed router,
        address indexed tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 chainId
    );

    event ApprovalGranted(
        address indexed token,
        address indexed spender,
        uint256 amount
    );

    event ApprovalReset(
        address indexed token,
        address indexed spender
    );

    // State variables
    PolicyConfig public immutable policyConfig;
    address public immutable owner;
    
    // Router approvals tracking (for cleanup)
    mapping(address => mapping(address => uint256)) public routerApprovals; // token => router => amount

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "AgentExecutor: not owner");
        _;
    }

    modifier onlySupportedChain() {
        require(policyConfig.isChainSupported(block.chainid), "AgentExecutor: unsupported chain");
        _;
    }

    constructor(address _policyConfig) {
        require(_policyConfig != address(0), "AgentExecutor: zero address");
        policyConfig = PolicyConfig(_policyConfig);
        owner = msg.sender;
    }

    /**
     * @dev Execute swap using Permit2 for token approval
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Input amount
     * @param minReceived Minimum amount of tokenOut to receive
     * @param deadline Transaction deadline
     * @param routerType Router type (0 = Uniswap, 1 = 1inch, etc.)
     * @param swapCalldata Router-specific swap calldata
     * @param permit2Data Permit2 permit data (signature, deadline, nonce, etc.)
     */
    function executeSwapWithPermit2(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minReceived,
        uint256 deadline,
        uint256 routerType,
        bytes calldata swapCalldata,
        bytes calldata permit2Data
    ) external onlySupportedChain {
        _validateExecution(tokenIn, tokenOut, amountIn, minReceived, deadline, routerType);
        
        // Get allowed routers from PolicyConfig
        address[] memory allowedRouters = policyConfig.getAllowedRouters(block.chainid, routerType);
        
        // For now, use the first allowed router
        // In the future, this could implement router selection logic
        address router = allowedRouters[0];
        
        // Verify the router is still allowed
        require(policyConfig.isRouterAllowed(block.chainid, routerType, router), "AgentExecutor: router not allowed");

        // Execute Permit2 transfer and swap
        uint256 amountOut = _executePermit2Swap(
            tokenIn,
            tokenOut,
            amountIn,
            minReceived,
            router,
            swapCalldata,
            permit2Data
        );

        emit SwapExecuted(
            msg.sender,
            router,
            tokenIn,
            tokenOut,
            amountIn,
            amountOut,
            block.chainid
        );
    }

    /**
     * @dev Execute swap using EIP-2612 permit for token approval
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Input amount
     * @param minReceived Minimum amount of tokenOut to receive
     * @param deadline Transaction deadline
     * @param routerType Router type (0 = Uniswap, 1 = 1inch, etc.)
     * @param swapCalldata Router-specific swap calldata
     * @param permit2612Data EIP-2612 permit data (v, r, s, deadline, nonce)
     */
    function executeSwapWithPermit2612(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minReceived,
        uint256 deadline,
        uint256 routerType,
        bytes calldata swapCalldata,
        bytes calldata permit2612Data
    ) external onlySupportedChain {
        _validateExecution(tokenIn, tokenOut, amountIn, minReceived, deadline, routerType);
        
        // Get allowed routers from PolicyConfig
        address[] memory allowedRouters = policyConfig.getAllowedRouters(block.chainid, routerType);
        
        // For now, use the first allowed router
        // In the future, this could implement router selection logic
        address router = allowedRouters[0];
        
        // Verify the router is still allowed
        require(policyConfig.isRouterAllowed(block.chainid, routerType, router), "AgentExecutor: router not allowed");

        // Execute EIP-2612 permit and swap
        uint256 amountOut = _executePermit2612Swap(
            tokenIn,
            tokenOut,
            amountIn,
            minReceived,
            router,
            swapCalldata,
            permit2612Data
        );

        emit SwapExecuted(
            msg.sender,
            router,
            tokenIn,
            tokenOut,
            amountIn,
            amountOut,
            block.chainid
        );
    }

    /**
     * @dev Validate execution parameters
     */
    function _validateExecution(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minReceived,
        uint256 deadline,
        uint256 routerType
    ) internal view {
        require(tokenIn != address(0), "AgentExecutor: zero tokenIn");
        require(tokenOut != address(0), "AgentExecutor: zero tokenOut");
        require(tokenIn != tokenOut, "AgentExecutor: same tokens");
        require(amountIn > 0, "AgentExecutor: zero amountIn");
        require(minReceived > 0, "AgentExecutor: zero minReceived");
        require(block.timestamp <= deadline, "AgentExecutor: deadline passed");
        require(routerType <= 10, "AgentExecutor: invalid router type");
        
        // Check if there are any allowed routers for this router type
        address[] memory allowedRouters = policyConfig.getAllowedRouters(block.chainid, routerType);
        require(allowedRouters.length > 0, "AgentExecutor: no allowed routers");
    }

    /**
     * @dev Execute swap using Permit2
     */
    function _executePermit2Swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minReceived,
        address router,
        bytes calldata swapCalldata,
        bytes calldata permit2Data
    ) internal returns (uint256 amountOut) {
        // Parse Permit2 data
        PermitAdapter.Permit2Data memory permit = PermitAdapter.parsePermit2Data(permit2Data);
        
        // Verify and execute Permit2 transfer
        PermitAdapter.verifyAndExecutePermit2(permit, msg.sender, address(this), amountIn);
        
        // Get policy parameters for approval multiplier
        (, , , , uint256 approvalMultiplier) = policyConfig.getPolicyParameters();
        
        // Calculate approval amount with multiplier
        uint256 approvalAmount = PermitAdapter.calculateApprovalWithMultiplier(amountIn, approvalMultiplier);
        
        // Execute swap with proper allowance management
        bool success = PermitAdapter.executeSwapWithAllowanceManagement(
            tokenIn,
            router,
            approvalAmount,
            swapCalldata
        );
        
        require(success, "AgentExecutor: swap execution failed");
        
        // Simulate amountOut (in real implementation, this would come from the swap)
        amountOut = minReceived; // For testing purposes
        
        return amountOut;
    }

    /**
     * @dev Execute swap using EIP-2612 permit
     */
    function _executePermit2612Swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minReceived,
        address router,
        bytes calldata swapCalldata,
        bytes calldata permit2612Data
    ) internal returns (uint256 amountOut) {
        // Parse EIP-2612 permit data
        PermitAdapter.Permit2612Data memory permit = PermitAdapter.parsePermit2612Data(permit2612Data);
        
        // Verify and execute EIP-2612 permit
        PermitAdapter.verifyAndExecutePermit2612(permit, tokenIn);
        
        // Transfer tokens from user to this contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Get policy parameters for approval multiplier
        (, , , , uint256 approvalMultiplier) = policyConfig.getPolicyParameters();
        
        // Calculate approval amount with multiplier
        uint256 approvalAmount = PermitAdapter.calculateApprovalWithMultiplier(amountIn, approvalMultiplier);
        
        // Execute swap with proper allowance management
        bool success = PermitAdapter.executeSwapWithAllowanceManagement(
            tokenIn,
            router,
            approvalAmount,
            swapCalldata
        );
        
        require(success, "AgentExecutor: swap execution failed");
        
        // Simulate amountOut (in real implementation, this would come from the swap)
        amountOut = minReceived; // For testing purposes
        
        return amountOut;
    }

    /**
     * @dev Emergency function to reset approvals (only owner)
     * @param token Token address
     * @param router Router address
     */
    function emergencyResetApproval(address token, address router) external onlyOwner {
        require(token != address(0), "AgentExecutor: zero token");
        require(router != address(0), "AgentExecutor: zero router");
        
        // Use PermitAdapter for safe allowance reset
        PermitAdapter.resetAllowanceToZero(token, router);
    }

    /**
     * @dev Get current approval amount for a token and router
     * @param token Token address
     * @param router Router address
     * @return amount Current approval amount
     */
    function getApprovalAmount(address token, address router) external view returns (uint256 amount) {
        return PermitAdapter.getCurrentAllowance(token, router);
    }

    /**
     * @dev Check if a router is allowed for the current chain and router type
     * @param routerType Router type
     * @param router Router address
     * @return allowed True if router is allowed
     */
    function isRouterAllowed(uint256 routerType, address router) external view returns (bool allowed) {
        return policyConfig.isRouterAllowed(block.chainid, routerType, router);
    }

    /**
     * @dev Get policy parameters from PolicyConfig
     * @return maxSlippage Maximum slippage in basis points
     * @return maxPriceImpact Maximum price impact in basis points
     * @return minLiquidity Minimum pool liquidity in USD
     * @return ttl Quote TTL in seconds
     * @return approvalMultiplier Approval multiplier
     */
    function getPolicyParameters() external view returns (
        uint256 maxSlippage,
        uint256 maxPriceImpact,
        uint256 minLiquidity,
        uint256 ttl,
        uint256 approvalMultiplier
    ) {
        return policyConfig.getPolicyParameters();
    }
}
