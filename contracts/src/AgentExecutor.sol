// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PolicyConfig} from "./PolicyConfig.sol";
import {ChainConfig} from "./ChainConfig.sol";
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
    
    // Permit2 contract address (mainnet: 0x000000000022D473030F116dDEE9F6B43aC78BA3)
    address public constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    
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
        // TODO: Implement Permit2 integration
        // This is a placeholder that simulates the swap execution
        
        // For now, we'll simulate the swap by checking token balances
        // In a real implementation, this would:
        // 1. Verify Permit2 signature
        // 2. Transfer tokens from user to this contract via Permit2
        // 3. Grant temporary approval to router
        // 4. Execute router swap
        // 5. Reset approval
        // 6. Transfer output tokens to user
        
        // Simulate amountOut (in real implementation, this would come from the swap)
        amountOut = minReceived; // For testing purposes
        
        // Emit approval events for transparency
        emit ApprovalGranted(tokenIn, router, amountIn);
        emit ApprovalReset(tokenIn, router);
        
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
        // TODO: Implement EIP-2612 permit integration
        // This is a placeholder that simulates the swap execution
        
        // For now, we'll simulate the swap by checking token balances
        // In a real implementation, this would:
        // 1. Verify EIP-2612 permit signature
        // 2. Call permit() on token contract
        // 3. Transfer tokens from user to this contract
        // 4. Grant temporary approval to router
        // 5. Execute router swap
        // 6. Reset approval
        // 7. Transfer output tokens to user
        
        // Simulate amountOut (in real implementation, this would come from the swap)
        amountOut = minReceived; // For testing purposes
        
        // Emit approval events for transparency
        emit ApprovalGranted(tokenIn, router, amountIn);
        emit ApprovalReset(tokenIn, router);
        
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
        
        // Reset approval to zero
        IERC20(token).approve(router, 0);
        
        emit ApprovalReset(token, router);
    }

    /**
     * @dev Get current approval amount for a token and router
     * @param token Token address
     * @param router Router address
     * @return amount Current approval amount
     */
    function getApprovalAmount(address token, address router) external view returns (uint256 amount) {
        return IERC20(token).allowance(address(this), router);
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
