// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {PermitAdapter} from "../src/PermitAdapter.sol";
import {IERC20} from "forge-std/interfaces/IERC20.sol";

/**
 * @title PermitAdapterTest
 * @dev Comprehensive test suite for PermitAdapter library
 */
contract PermitAdapterTest is Test {
    MockERC20 public token;
    address public router;
    address public user;
    address public executor;

    // Events to test
    event Permit2Transfer(
        address indexed token,
        address indexed from,
        address indexed to,
        uint256 amount
    );
    
    event Permit2612Approval(
        address indexed token,
        address indexed owner,
        address indexed spender,
        uint256 amount
    );
    
    event AllowanceReset(
        address indexed token,
        address indexed spender,
        uint256 previousAllowance,
        uint256 newAllowance
    );

    function setUp() public {
        token = new MockERC20();
        router = makeAddr("router");
        user = makeAddr("user");
        executor = address(this);
    }

    // ============ PERMIT2 TESTS ============

    function testVerifyAndExecutePermit2() public {
        PermitAdapter.Permit2Data memory permit = PermitAdapter.Permit2Data({
            token: address(token),
            amount: 1000 * 1e18,
            deadline: block.timestamp + 300,
            v: 27,
            r: bytes32(uint256(1)),
            s: bytes32(uint256(2))
        });

        vm.expectEmit(true, true, true, true);
        emit Permit2Transfer(address(token), user, executor, 1000 * 1e18);

        PermitAdapter.verifyAndExecutePermit2(permit, user, executor, 1000 * 1e18);
    }

    function testParsePermit2Data() public {
        // Test the placeholder parsing function
        // Note: parsePermit2Data is a placeholder, so we test the structure
        PermitAdapter.Permit2Data memory permit = PermitAdapter.parsePermit2Data("");
        
        assertEq(permit.token, address(0)); // Placeholder returns zero address
        assertEq(permit.amount, 0); // Placeholder returns zero amount
    }

    // ============ EIP-2612 TESTS ============

    function testVerifyAndExecutePermit2612() public {
        PermitAdapter.Permit2612Data memory permit = PermitAdapter.Permit2612Data({
            owner: user,
            spender: executor,
            value: 1000 * 1e18,
            deadline: block.timestamp + 300,
            v: 27,
            r: bytes32(uint256(1)),
            s: bytes32(uint256(2))
        });

        vm.expectEmit(true, true, true, true);
        emit Permit2612Approval(address(token), user, executor, 1000 * 1e18);

        PermitAdapter.verifyAndExecutePermit2612(permit, address(token));
    }

    function testParsePermit2612Data() public {
        // Test the placeholder parsing function
        // Note: parsePermit2612Data is a placeholder, so we test the structure
        PermitAdapter.Permit2612Data memory permit = PermitAdapter.parsePermit2612Data("");
        
        assertEq(permit.owner, address(0)); // Placeholder returns zero address
        assertEq(permit.spender, address(0)); // Placeholder returns zero address
    }

    // ============ ALLOWANCE MANAGEMENT TESTS ============

    function testGrantTemporaryApproval() public {
        uint256 amount = 1000 * 1e18;
        
        uint256 previousAllowance = PermitAdapter.grantTemporaryApproval(address(token), router, amount);
        
        assertEq(previousAllowance, 0); // Should start with zero allowance
        assertEq(token.allowance(executor, router), amount); // Should have new allowance
    }

    function testResetAllowanceToZero() public {
        // First grant an approval
        uint256 amount = 1000 * 1e18;
        PermitAdapter.grantTemporaryApproval(address(token), router, amount);
        assertEq(token.allowance(executor, router), amount);

        // Then reset to zero
        uint256 previousAllowance = PermitAdapter.resetAllowanceToZero(address(token), router);
        
        assertEq(previousAllowance, amount); // Should return previous allowance
        assertEq(token.allowance(executor, router), 0); // Should be reset to zero
    }

    function testResetAllowanceToZeroWhenAlreadyZero() public {
        // Reset when already zero
        uint256 previousAllowance = PermitAdapter.resetAllowanceToZero(address(token), router);
        
        assertEq(previousAllowance, 0); // Should return zero
        assertEq(token.allowance(executor, router), 0); // Should remain zero
    }

    function testResetAllowanceToExact() public {
        // First grant an approval
        uint256 initialAmount = 1000 * 1e18;
        PermitAdapter.grantTemporaryApproval(address(token), router, initialAmount);
        assertEq(token.allowance(executor, router), initialAmount);

        // Then reset to exact amount
        uint256 exactAmount = 500 * 1e18;
        uint256 previousAllowance = PermitAdapter.resetAllowanceToExact(address(token), router, exactAmount);
        
        assertEq(previousAllowance, initialAmount); // Should return previous allowance
        assertEq(token.allowance(executor, router), exactAmount); // Should be set to exact amount
    }

    // ============ ALLOWANCE QUERY TESTS ============

    function testGetCurrentAllowance() public {
        // Initially zero
        assertEq(PermitAdapter.getCurrentAllowance(address(token), router), 0);

        // After granting approval
        uint256 amount = 1000 * 1e18;
        PermitAdapter.grantTemporaryApproval(address(token), router, amount);
        assertEq(PermitAdapter.getCurrentAllowance(address(token), router), amount);
    }

    function testIsAllowanceZero() public {
        // Initially zero
        assertTrue(PermitAdapter.isAllowanceZero(address(token), router));

        // After granting approval
        uint256 amount = 1000 * 1e18;
        PermitAdapter.grantTemporaryApproval(address(token), router, amount);
        assertFalse(PermitAdapter.isAllowanceZero(address(token), router));

        // After resetting to zero
        PermitAdapter.resetAllowanceToZero(address(token), router);
        assertTrue(PermitAdapter.isAllowanceZero(address(token), router));
    }

    // ============ SWAP EXECUTION TESTS ============

    function testExecuteSwapWithAllowanceManagement() public {
        uint256 amount = 1000 * 1e18;
        
        bool success = PermitAdapter.executeSwapWithAllowanceManagement(
            address(token),
            router,
            amount,
            ""
        );

        assertTrue(success);
        
        // Verify allowance was reset to zero after swap
        assertEq(token.allowance(executor, router), 0);
    }

    // ============ VALIDATION TESTS ============

    function testValidatePermitDeadline() public {
        // Valid deadline (future)
        uint256 futureDeadline = block.timestamp + 300;
        assertTrue(PermitAdapter.validatePermitDeadline(futureDeadline));

        // Valid deadline (exact current time)
        uint256 currentDeadline = block.timestamp;
        assertTrue(PermitAdapter.validatePermitDeadline(currentDeadline));

        // Invalid deadline (past)
        uint256 pastDeadline = block.timestamp - 1;
        assertFalse(PermitAdapter.validatePermitDeadline(pastDeadline));
    }

    function testCalculateApprovalWithMultiplier() public {
        uint256 baseAmount = 1000 * 1e18;
        
        // Test 1.02x multiplier (102 basis points)
        uint256 multiplier102 = 102;
        uint256 result102 = PermitAdapter.calculateApprovalWithMultiplier(baseAmount, multiplier102);
        assertEq(result102, 1020 * 1e18); // 1000 * 1.02 = 1020

        // Test 1.05x multiplier (105 basis points)
        uint256 multiplier105 = 105;
        uint256 result105 = PermitAdapter.calculateApprovalWithMultiplier(baseAmount, multiplier105);
        assertEq(result105, 1050 * 1e18); // 1000 * 1.05 = 1050

        // Test 1.00x multiplier (100 basis points)
        uint256 multiplier100 = 100;
        uint256 result100 = PermitAdapter.calculateApprovalWithMultiplier(baseAmount, multiplier100);
        assertEq(result100, 1000 * 1e18); // 1000 * 1.00 = 1000
    }

    // ============ EDGE CASE TESTS ============

    function testBoundaryValues() public {
        // Test with minimum amount
        uint256 minAmount = 1;
        PermitAdapter.grantTemporaryApproval(address(token), router, minAmount);
        assertEq(token.allowance(executor, router), minAmount);
        
        PermitAdapter.resetAllowanceToZero(address(token), router);
        assertEq(token.allowance(executor, router), 0);

        // Test with maximum amount
        uint256 maxAmount = type(uint256).max;
        PermitAdapter.grantTemporaryApproval(address(token), router, maxAmount);
        assertEq(token.allowance(executor, router), maxAmount);
        
        PermitAdapter.resetAllowanceToZero(address(token), router);
        assertEq(token.allowance(executor, router), 0);
    }

    function testMultipleApprovals() public {
        address router2 = makeAddr("router2");
        uint256 amount1 = 1000 * 1e18;
        uint256 amount2 = 2000 * 1e18;

        // Grant approvals to different routers
        PermitAdapter.grantTemporaryApproval(address(token), router, amount1);
        PermitAdapter.grantTemporaryApproval(address(token), router2, amount2);

        assertEq(token.allowance(executor, router), amount1);
        assertEq(token.allowance(executor, router2), amount2);

        // Reset one approval
        PermitAdapter.resetAllowanceToZero(address(token), router);
        assertEq(token.allowance(executor, router), 0);
        assertEq(token.allowance(executor, router2), amount2); // Should remain unchanged

        // Reset the other approval
        PermitAdapter.resetAllowanceToZero(address(token), router2);
        assertEq(token.allowance(executor, router), 0);
        assertEq(token.allowance(executor, router2), 0);
    }

    function testApprovalMultiplierEdgeCases() public {
        uint256 baseAmount = 1000 * 1e18;

        // Test zero multiplier
        uint256 resultZero = PermitAdapter.calculateApprovalWithMultiplier(baseAmount, 0);
        assertEq(resultZero, 0);

        // Test 1x multiplier
        uint256 result1x = PermitAdapter.calculateApprovalWithMultiplier(baseAmount, 100);
        assertEq(result1x, baseAmount);

        // Test 2x multiplier
        uint256 result2x = PermitAdapter.calculateApprovalWithMultiplier(baseAmount, 200);
        assertEq(result2x, baseAmount * 2);
    }

    // ============ INTEGRATION TESTS ============

    function testFullSwapFlow() public {
        uint256 amount = 1000 * 1e18;

        // Verify initial state
        assertEq(token.allowance(executor, router), 0);

        // Execute swap with allowance management
        bool success = PermitAdapter.executeSwapWithAllowanceManagement(
            address(token),
            router,
            amount,
            ""
        );

        assertTrue(success);
        
        // Verify final state - allowance should be reset to zero
        assertEq(token.allowance(executor, router), 0);
    }

    function testAllowanceDriftPrevention() public {
        uint256 amount = 1000 * 1e18;

        // Grant approval
        PermitAdapter.grantTemporaryApproval(address(token), router, amount);
        assertEq(token.allowance(executor, router), amount);

        // Simulate a swap that doesn't use the full allowance
        // In a real scenario, the router might not use all the approved amount
        // This could lead to "allowance drift" where unused approvals accumulate
        
        // Reset to zero to prevent drift
        PermitAdapter.resetAllowanceToZero(address(token), router);
        assertEq(token.allowance(executor, router), 0);

        // This ensures no allowance drift occurs
    }
}

/**
 * @title MockERC20
 * @dev Mock ERC20 token for testing
 */
contract MockERC20 {
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => uint256) public balanceOf;
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}
