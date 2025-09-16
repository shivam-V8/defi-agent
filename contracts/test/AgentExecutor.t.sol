// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {AgentExecutor} from "../src/AgentExecutor.sol";
import {PolicyConfig} from "../src/PolicyConfig.sol";
import {ChainConfig} from "../src/ChainConfig.sol";
import {IERC20} from "forge-std/interfaces/IERC20.sol";

/**
 * @title AgentExecutorTest
 * @dev Comprehensive test suite for AgentExecutor contract
 */
contract AgentExecutorTest is Test {
    AgentExecutor public agentExecutor;
    PolicyConfig public policyConfig;
    address public owner;
    address public user;
    address public tokenIn;
    address public tokenOut;
    address public router;

    // Events to test
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

    function setUp() public {
        owner = address(this);
        user = makeAddr("user");
        tokenIn = makeAddr("tokenIn");
        tokenOut = makeAddr("tokenOut");
        router = makeAddr("router");
        
        // Set up test environment to use Ethereum mainnet chain ID
        vm.chainId(ChainConfig.ETHEREUM_CHAIN_ID);
        
        // Deploy PolicyConfig first
        policyConfig = new PolicyConfig();
        
        // Deploy AgentExecutor with PolicyConfig address
        agentExecutor = new AgentExecutor(address(policyConfig));
        
        // Verify initial state
        assertEq(agentExecutor.owner(), owner);
        assertEq(address(agentExecutor.policyConfig()), address(policyConfig));
    }

    // ============ INITIALIZATION TESTS ============

    function testInitialization() public {
        assertEq(agentExecutor.owner(), owner);
        assertEq(address(agentExecutor.policyConfig()), address(policyConfig));
        assertEq(agentExecutor.PERMIT2(), 0x000000000022D473030F116dDEE9F6B43aC78BA3);
    }

    function testConstructorValidation() public {
        // Test zero address
        vm.expectRevert("AgentExecutor: zero address");
        new AgentExecutor(address(0));
    }

    // ============ PERMIT2 EXECUTION TESTS ============

    function testExecuteSwapWithPermit2() public {
        uint256 amountIn = 1000 * 1e18;
        uint256 minReceived = 2000 * 1e18;
        uint256 deadline = block.timestamp + 300; // 5 minutes
        uint256 routerType = 0; // Uniswap
        bytes memory swapCalldata = "";
        bytes memory permit2Data = "";

        // Expect events
        vm.expectEmit(true, true, true, true);
        emit ApprovalGranted(tokenIn, ChainConfig.UNISWAP_V3_ROUTER_ETHEREUM, amountIn);
        vm.expectEmit(true, true, true, true);
        emit ApprovalReset(tokenIn, ChainConfig.UNISWAP_V3_ROUTER_ETHEREUM);
        vm.expectEmit(true, true, true, true);
        emit SwapExecuted(
            user,
            ChainConfig.UNISWAP_V3_ROUTER_ETHEREUM,
            tokenIn,
            tokenOut,
            amountIn,
            minReceived,
            ChainConfig.ETHEREUM_CHAIN_ID
        );

        vm.prank(user);
        agentExecutor.executeSwapWithPermit2(
            tokenIn,
            tokenOut,
            amountIn,
            minReceived,
            deadline,
            routerType,
            swapCalldata,
            permit2Data
        );
    }

    function testExecuteSwapWithPermit2Validation() public {
        uint256 amountIn = 1000 * 1e18;
        uint256 minReceived = 2000 * 1e18;
        uint256 deadline = block.timestamp + 300;
        uint256 routerType = 0;
        bytes memory swapCalldata = "";
        bytes memory permit2Data = "";

        // Test zero tokenIn
        vm.prank(user);
        vm.expectRevert("AgentExecutor: zero tokenIn");
        agentExecutor.executeSwapWithPermit2(
            address(0),
            tokenOut,
            amountIn,
            minReceived,
            deadline,
            routerType,
            swapCalldata,
            permit2Data
        );

        // Test zero tokenOut
        vm.prank(user);
        vm.expectRevert("AgentExecutor: zero tokenOut");
        agentExecutor.executeSwapWithPermit2(
            tokenIn,
            address(0),
            amountIn,
            minReceived,
            deadline,
            routerType,
            swapCalldata,
            permit2Data
        );

        // Test same tokens
        vm.prank(user);
        vm.expectRevert("AgentExecutor: same tokens");
        agentExecutor.executeSwapWithPermit2(
            tokenIn,
            tokenIn,
            amountIn,
            minReceived,
            deadline,
            routerType,
            swapCalldata,
            permit2Data
        );

        // Test zero amountIn
        vm.prank(user);
        vm.expectRevert("AgentExecutor: zero amountIn");
        agentExecutor.executeSwapWithPermit2(
            tokenIn,
            tokenOut,
            0,
            minReceived,
            deadline,
            routerType,
            swapCalldata,
            permit2Data
        );

        // Test zero minReceived
        vm.prank(user);
        vm.expectRevert("AgentExecutor: zero minReceived");
        agentExecutor.executeSwapWithPermit2(
            tokenIn,
            tokenOut,
            amountIn,
            0,
            deadline,
            routerType,
            swapCalldata,
            permit2Data
        );

        // Test deadline passed
        vm.prank(user);
        vm.expectRevert("AgentExecutor: deadline passed");
        agentExecutor.executeSwapWithPermit2(
            tokenIn,
            tokenOut,
            amountIn,
            minReceived,
            block.timestamp - 1,
            routerType,
            swapCalldata,
            permit2Data
        );

        // Test invalid router type
        vm.prank(user);
        vm.expectRevert("AgentExecutor: invalid router type");
        agentExecutor.executeSwapWithPermit2(
            tokenIn,
            tokenOut,
            amountIn,
            minReceived,
            deadline,
            11,
            swapCalldata,
            permit2Data
        );
    }

    function testExecuteSwapWithPermit2NoAllowedRouters() public {
        uint256 amountIn = 1000 * 1e18;
        uint256 minReceived = 2000 * 1e18;
        uint256 deadline = block.timestamp + 300;
        uint256 routerType = 2; // Valid router type but no allowed routers
        bytes memory swapCalldata = "";
        bytes memory permit2Data = "";

        vm.prank(user);
        vm.expectRevert("AgentExecutor: no allowed routers");
        agentExecutor.executeSwapWithPermit2(
            tokenIn,
            tokenOut,
            amountIn,
            minReceived,
            deadline,
            routerType,
            swapCalldata,
            permit2Data
        );
    }

    function testExecuteSwapWithPermit2RouterNotAllowed() public {
        uint256 amountIn = 1000 * 1e18;
        uint256 minReceived = 2000 * 1e18;
        uint256 deadline = block.timestamp + 300;
        uint256 routerType = 0;
        bytes memory swapCalldata = "";
        bytes memory permit2Data = "";

        // Remove the default router from allowlist
        policyConfig.setRouterAllowlist(
            ChainConfig.ETHEREUM_CHAIN_ID,
            0,
            ChainConfig.UNISWAP_V3_ROUTER_ETHEREUM,
            false
        );

        vm.prank(user);
        vm.expectRevert("AgentExecutor: router not allowed");
        agentExecutor.executeSwapWithPermit2(
            tokenIn,
            tokenOut,
            amountIn,
            minReceived,
            deadline,
            routerType,
            swapCalldata,
            permit2Data
        );
    }

    // ============ EIP-2612 EXECUTION TESTS ============

    function testExecuteSwapWithPermit2612() public {
        uint256 amountIn = 1000 * 1e18;
        uint256 minReceived = 2000 * 1e18;
        uint256 deadline = block.timestamp + 300; // 5 minutes
        uint256 routerType = 1; // 1inch
        bytes memory swapCalldata = "";
        bytes memory permit2612Data = "";

        // Expect events
        vm.expectEmit(true, true, true, true);
        emit ApprovalGranted(tokenIn, ChainConfig.ONEINCH_ROUTER_ETHEREUM, amountIn);
        vm.expectEmit(true, true, true, true);
        emit ApprovalReset(tokenIn, ChainConfig.ONEINCH_ROUTER_ETHEREUM);
        vm.expectEmit(true, true, true, true);
        emit SwapExecuted(
            user,
            ChainConfig.ONEINCH_ROUTER_ETHEREUM,
            tokenIn,
            tokenOut,
            amountIn,
            minReceived,
            ChainConfig.ETHEREUM_CHAIN_ID
        );

        vm.prank(user);
        agentExecutor.executeSwapWithPermit2612(
            tokenIn,
            tokenOut,
            amountIn,
            minReceived,
            deadline,
            routerType,
            swapCalldata,
            permit2612Data
        );
    }

    function testExecuteSwapWithPermit2612Validation() public {
        uint256 amountIn = 1000 * 1e18;
        uint256 minReceived = 2000 * 1e18;
        uint256 deadline = block.timestamp + 300;
        uint256 routerType = 1;
        bytes memory swapCalldata = "";
        bytes memory permit2612Data = "";

        // Test zero tokenIn
        vm.prank(user);
        vm.expectRevert("AgentExecutor: zero tokenIn");
        agentExecutor.executeSwapWithPermit2612(
            address(0),
            tokenOut,
            amountIn,
            minReceived,
            deadline,
            routerType,
            swapCalldata,
            permit2612Data
        );

        // Test zero tokenOut
        vm.prank(user);
        vm.expectRevert("AgentExecutor: zero tokenOut");
        agentExecutor.executeSwapWithPermit2612(
            tokenIn,
            address(0),
            amountIn,
            minReceived,
            deadline,
            routerType,
            swapCalldata,
            permit2612Data
        );

        // Test same tokens
        vm.prank(user);
        vm.expectRevert("AgentExecutor: same tokens");
        agentExecutor.executeSwapWithPermit2612(
            tokenIn,
            tokenIn,
            amountIn,
            minReceived,
            deadline,
            routerType,
            swapCalldata,
            permit2612Data
        );

        // Test zero amountIn
        vm.prank(user);
        vm.expectRevert("AgentExecutor: zero amountIn");
        agentExecutor.executeSwapWithPermit2612(
            tokenIn,
            tokenOut,
            0,
            minReceived,
            deadline,
            routerType,
            swapCalldata,
            permit2612Data
        );

        // Test zero minReceived
        vm.prank(user);
        vm.expectRevert("AgentExecutor: zero minReceived");
        agentExecutor.executeSwapWithPermit2612(
            tokenIn,
            tokenOut,
            amountIn,
            0,
            deadline,
            routerType,
            swapCalldata,
            permit2612Data
        );

        // Test deadline passed
        vm.prank(user);
        vm.expectRevert("AgentExecutor: deadline passed");
        agentExecutor.executeSwapWithPermit2612(
            tokenIn,
            tokenOut,
            amountIn,
            minReceived,
            block.timestamp - 1,
            routerType,
            swapCalldata,
            permit2612Data
        );

        // Test invalid router type
        vm.prank(user);
        vm.expectRevert("AgentExecutor: invalid router type");
        agentExecutor.executeSwapWithPermit2612(
            tokenIn,
            tokenOut,
            amountIn,
            minReceived,
            deadline,
            11,
            swapCalldata,
            permit2612Data
        );
    }

    function testExecuteSwapWithPermit2612NoAllowedRouters() public {
        uint256 amountIn = 1000 * 1e18;
        uint256 minReceived = 2000 * 1e18;
        uint256 deadline = block.timestamp + 300;
        uint256 routerType = 2; // Valid router type but no allowed routers
        bytes memory swapCalldata = "";
        bytes memory permit2612Data = "";

        vm.prank(user);
        vm.expectRevert("AgentExecutor: no allowed routers");
        agentExecutor.executeSwapWithPermit2612(
            tokenIn,
            tokenOut,
            amountIn,
            minReceived,
            deadline,
            routerType,
            swapCalldata,
            permit2612Data
        );
    }

    function testExecuteSwapWithPermit2612RouterNotAllowed() public {
        uint256 amountIn = 1000 * 1e18;
        uint256 minReceived = 2000 * 1e18;
        uint256 deadline = block.timestamp + 300;
        uint256 routerType = 1;
        bytes memory swapCalldata = "";
        bytes memory permit2612Data = "";

        // Remove the default router from allowlist
        policyConfig.setRouterAllowlist(
            ChainConfig.ETHEREUM_CHAIN_ID,
            1,
            ChainConfig.ONEINCH_ROUTER_ETHEREUM,
            false
        );

        vm.prank(user);
        vm.expectRevert("AgentExecutor: router not allowed");
        agentExecutor.executeSwapWithPermit2612(
            tokenIn,
            tokenOut,
            amountIn,
            minReceived,
            deadline,
            routerType,
            swapCalldata,
            permit2612Data
        );
    }

    // ============ EMERGENCY FUNCTIONS TESTS ============

    function testEmergencyResetApproval() public {
        // Create a mock token contract
        MockERC20 mockToken = new MockERC20();
        address testRouter = makeAddr("testRouter");

        vm.expectEmit(true, true, true, true);
        emit ApprovalReset(address(mockToken), testRouter);

        agentExecutor.emergencyResetApproval(address(mockToken), testRouter);
    }

    function testEmergencyResetApprovalOnlyOwner() public {
        address testToken = makeAddr("testToken");
        address testRouter = makeAddr("testRouter");

        vm.prank(user);
        vm.expectRevert("AgentExecutor: not owner");
        agentExecutor.emergencyResetApproval(testToken, testRouter);
    }

    function testEmergencyResetApprovalValidation() public {
        address testRouter = makeAddr("testRouter");

        // Test zero token
        vm.expectRevert("AgentExecutor: zero token");
        agentExecutor.emergencyResetApproval(address(0), testRouter);

        // Test zero router
        vm.expectRevert("AgentExecutor: zero router");
        agentExecutor.emergencyResetApproval(makeAddr("testToken"), address(0));
    }

    // ============ VIEW FUNCTIONS TESTS ============

    function testGetApprovalAmount() public {
        // Create a mock token contract
        MockERC20 mockToken = new MockERC20();
        address testRouter = makeAddr("testRouter");

        // Should return 0 for non-existent approvals
        assertEq(agentExecutor.getApprovalAmount(address(mockToken), testRouter), 0);
    }

    function testIsRouterAllowed() public {
        // Test allowed router
        assertTrue(agentExecutor.isRouterAllowed(0, ChainConfig.UNISWAP_V3_ROUTER_ETHEREUM));
        assertTrue(agentExecutor.isRouterAllowed(1, ChainConfig.ONEINCH_ROUTER_ETHEREUM));

        // Test disallowed router
        assertFalse(agentExecutor.isRouterAllowed(0, makeAddr("unknownRouter")));
        assertFalse(agentExecutor.isRouterAllowed(999, ChainConfig.UNISWAP_V3_ROUTER_ETHEREUM));
    }

    function testGetPolicyParameters() public {
        (
            uint256 maxSlippage,
            uint256 maxPriceImpact,
            uint256 minLiquidity,
            uint256 ttl,
            uint256 approvalMultiplier
        ) = agentExecutor.getPolicyParameters();

        assertEq(maxSlippage, 50);
        assertEq(maxPriceImpact, 150);
        assertEq(minLiquidity, 250000 * 1e18);
        assertEq(ttl, 120);
        assertEq(approvalMultiplier, 102);
    }

    // ============ EDGE CASE TESTS ============

    function testBoundaryValues() public {
        uint256 amountIn = 1; // Minimum amount
        uint256 minReceived = 1; // Minimum amount
        uint256 deadline = block.timestamp; // Exact deadline
        uint256 routerType = 0;
        bytes memory swapCalldata = "";
        bytes memory permit2Data = "";

        // Should pass with boundary values
        vm.prank(user);
        agentExecutor.executeSwapWithPermit2(
            tokenIn,
            tokenOut,
            amountIn,
            minReceived,
            deadline,
            routerType,
            swapCalldata,
            permit2Data
        );
    }

    function testMaximumRouterType() public {
        uint256 amountIn = 1000 * 1e18;
        uint256 minReceived = 2000 * 1e18;
        uint256 deadline = block.timestamp + 300;
        uint256 routerType = 10; // Maximum allowed router type
        bytes memory swapCalldata = "";
        bytes memory permit2Data = "";

        // Should fail because router type 10 has no allowed routers
        vm.prank(user);
        vm.expectRevert("AgentExecutor: no allowed routers");
        agentExecutor.executeSwapWithPermit2(
            tokenIn,
            tokenOut,
            amountIn,
            minReceived,
            deadline,
            routerType,
            swapCalldata,
            permit2Data
        );
    }

    function testUnsupportedChain() public {
        // Change to unsupported chain
        vm.chainId(999);

        uint256 amountIn = 1000 * 1e18;
        uint256 minReceived = 2000 * 1e18;
        uint256 deadline = block.timestamp + 300;
        uint256 routerType = 0;
        bytes memory swapCalldata = "";
        bytes memory permit2Data = "";

        vm.prank(user);
        vm.expectRevert("AgentExecutor: unsupported chain");
        agentExecutor.executeSwapWithPermit2(
            tokenIn,
            tokenOut,
            amountIn,
            minReceived,
            deadline,
            routerType,
            swapCalldata,
            permit2Data
        );
    }

    function testDifferentRouterTypes() public {
        uint256 amountIn = 1000 * 1e18;
        uint256 minReceived = 2000 * 1e18;
        uint256 deadline = block.timestamp + 300;
        bytes memory swapCalldata = "";
        bytes memory permit2Data = "";

        // Test router type 0 (Uniswap)
        vm.prank(user);
        agentExecutor.executeSwapWithPermit2(
            tokenIn,
            tokenOut,
            amountIn,
            minReceived,
            deadline,
            0,
            swapCalldata,
            permit2Data
        );

        // Test router type 1 (1inch)
        vm.prank(user);
        agentExecutor.executeSwapWithPermit2612(
            tokenIn,
            tokenOut,
            amountIn,
            minReceived,
            deadline,
            1,
            swapCalldata,
            permit2Data
        );
    }
}

/**
 * @title MockERC20
 * @dev Mock ERC20 token for testing
 */
contract MockERC20 {
    mapping(address => mapping(address => uint256)) public allowance;
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
}
