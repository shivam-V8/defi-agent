// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {RuleRegistry} from "../src/RuleRegistry.sol";

/**
 * @title RuleRegistryTest
 * @dev Comprehensive test suite for RuleRegistry contract
 */
contract RuleRegistryTest is Test {
    RuleRegistry public ruleRegistry;
    address public owner;
    address public user1;
    address public user2;

    // Events to test
    event RuleAdded(
        address indexed user,
        uint256 indexed ruleId,
        string kind,
        bytes params,
        uint256 cooldownSeconds
    );
    
    event RuleUpdated(
        address indexed user,
        uint256 indexed ruleId,
        string kind,
        bytes params,
        uint256 cooldownSeconds
    );
    
    event RuleDeleted(
        address indexed user,
        uint256 indexed ruleId
    );
    
    event RuleFired(
        address indexed user,
        uint256 indexed ruleId,
        string metric,
        uint256 timestamp
    );
    
    event RuleActivated(
        address indexed user,
        uint256 indexed ruleId
    );
    
    event RuleDeactivated(
        address indexed user,
        uint256 indexed ruleId
    );

    function setUp() public {
        ruleRegistry = new RuleRegistry();
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
    }

    // ============ INITIALIZATION TESTS ============

    function testInitialization() public {
        assertEq(ruleRegistry.owner(), owner);
    }

    // ============ ADD RULE TESTS ============

    function testAddRule() public {
        string memory kind = "price_alert";
        bytes memory params = abi.encode("token", "USDC", "1000000"); // $1.00 in 6 decimals
        uint256 cooldownSeconds = 300; // 5 minutes

        vm.expectEmit(true, true, true, true);
        emit RuleAdded(user1, 0, kind, params, cooldownSeconds);

        uint256 ruleId = ruleRegistry.addRule(user1, kind, params, cooldownSeconds);
        
        assertEq(ruleId, 0);
        assertEq(ruleRegistry.getUserRuleCount(user1), 1);
        
        (bool exists, bool active) = ruleRegistry.isRuleActive(user1, 0);
        assertTrue(exists);
        assertTrue(active);
    }

    function testAddMyRule() public {
        string memory kind = "volume_alert";
        bytes memory params = abi.encode("minVolume", "1000000000000000000"); // 1 ETH
        uint256 cooldownSeconds = 600; // 10 minutes

        vm.expectEmit(true, true, true, true);
        emit RuleAdded(user1, 0, kind, params, cooldownSeconds);

        vm.prank(user1);
        uint256 ruleId = ruleRegistry.addMyRule(kind, params, cooldownSeconds);
        
        assertEq(ruleId, 0);
        assertEq(ruleRegistry.getUserRuleCount(user1), 1);
        
        vm.prank(user1);
        (bool exists, bool active) = ruleRegistry.isMyRuleActive(0);
        assertTrue(exists);
        assertTrue(active);
    }

    function testAddMultipleRules() public {
        // Add first rule
        ruleRegistry.addRule(user1, "price_alert", abi.encode("token", "USDC"), 300);
        assertEq(ruleRegistry.getUserRuleCount(user1), 1);
        
        // Add second rule
        ruleRegistry.addRule(user1, "volume_alert", abi.encode("minVolume", "1000"), 600);
        assertEq(ruleRegistry.getUserRuleCount(user1), 2);
        
        // Add third rule
        ruleRegistry.addRule(user1, "liquidity_alert", abi.encode("minLiquidity", "50000"), 900);
        assertEq(ruleRegistry.getUserRuleCount(user1), 3);
    }

    function testAddRuleValidation() public {
        // Test zero user address
        vm.expectRevert("RuleRegistry: zero user address");
        ruleRegistry.addRule(address(0), "price_alert", abi.encode("test"), 300);
        
        // Test empty rule kind
        vm.expectRevert("RuleRegistry: empty rule kind");
        ruleRegistry.addRule(user1, "", abi.encode("test"), 300);
        
        // Test zero cooldown
        vm.expectRevert("RuleRegistry: cooldown must be positive");
        ruleRegistry.addRule(user1, "price_alert", abi.encode("test"), 0);
    }

    function testAddMyRuleValidation() public {
        vm.startPrank(user1);
        
        // Test empty rule kind
        vm.expectRevert("RuleRegistry: empty rule kind");
        ruleRegistry.addMyRule("", abi.encode("test"), 300);
        
        // Test zero cooldown
        vm.expectRevert("RuleRegistry: cooldown must be positive");
        ruleRegistry.addMyRule("price_alert", abi.encode("test"), 0);
        
        vm.stopPrank();
    }

    // ============ UPDATE RULE TESTS ============

    function testUpdateRule() public {
        // Add initial rule
        ruleRegistry.addRule(user1, "price_alert", abi.encode("token", "USDC"), 300);
        
        string memory newKind = "volume_alert";
        bytes memory newParams = abi.encode("minVolume", "2000000000000000000"); // 2 ETH
        uint256 newCooldown = 600;

        vm.expectEmit(true, true, true, true);
        emit RuleUpdated(user1, 0, newKind, newParams, newCooldown);

        ruleRegistry.updateRule(user1, 0, newKind, newParams, newCooldown);
        
        RuleRegistry.Rule memory rule = ruleRegistry.getRule(user1, 0);
        assertEq(rule.kind, newKind);
        assertEq(rule.params, newParams);
        assertEq(rule.cooldownSeconds, newCooldown);
        assertTrue(rule.active); // Should preserve active status
    }

    function testUpdateMyRule() public {
        // Add initial rule
        vm.prank(user1);
        ruleRegistry.addMyRule("price_alert", abi.encode("token", "USDC"), 300);
        
        string memory newKind = "liquidity_alert";
        bytes memory newParams = abi.encode("minLiquidity", "100000");
        uint256 newCooldown = 900;

        vm.expectEmit(true, true, true, true);
        emit RuleUpdated(user1, 0, newKind, newParams, newCooldown);

        vm.prank(user1);
        ruleRegistry.updateMyRule(0, newKind, newParams, newCooldown);
        
        vm.prank(user1);
        RuleRegistry.Rule memory rule = ruleRegistry.getMyRule(0);
        assertEq(rule.kind, newKind);
        assertEq(rule.params, newParams);
        assertEq(rule.cooldownSeconds, newCooldown);
        assertTrue(rule.active);
    }

    function testUpdateRuleValidation() public {
        // Test non-existent rule
        vm.expectRevert("RuleRegistry: rule does not exist");
        ruleRegistry.updateRule(user1, 0, "price_alert", abi.encode("test"), 300);
        
        // Add a rule first
        ruleRegistry.addRule(user1, "price_alert", abi.encode("test"), 300);
        
        // Test empty rule kind
        vm.expectRevert("RuleRegistry: empty rule kind");
        ruleRegistry.updateRule(user1, 0, "", abi.encode("test"), 300);
        
        // Test zero cooldown
        vm.expectRevert("RuleRegistry: cooldown must be positive");
        ruleRegistry.updateRule(user1, 0, "price_alert", abi.encode("test"), 0);
    }

    function testUpdateRuleAccessControl() public {
        // Add rule as owner
        ruleRegistry.addRule(user1, "price_alert", abi.encode("test"), 300);
        
        // User1 should be able to update their own rule
        vm.prank(user1);
        ruleRegistry.updateRule(user1, 0, "volume_alert", abi.encode("test"), 600);
        
        // User2 should not be able to update user1's rule
        vm.prank(user2);
        vm.expectRevert("RuleRegistry: not rule owner");
        ruleRegistry.updateRule(user1, 0, "liquidity_alert", abi.encode("test"), 900);
    }

    // ============ DELETE RULE TESTS ============

    function testDeleteRule() public {
        // Add a rule
        ruleRegistry.addRule(user1, "price_alert", abi.encode("token", "USDC"), 300);
        assertEq(ruleRegistry.getUserRuleCount(user1), 1);
        
        vm.expectEmit(true, true, true, true);
        emit RuleDeleted(user1, 0);

        ruleRegistry.deleteRule(user1, 0);
        
        // Rule count should remain the same (we don't decrement for gas efficiency)
        assertEq(ruleRegistry.getUserRuleCount(user1), 1);
        
        // But rule should not exist anymore
        vm.expectRevert("RuleRegistry: rule does not exist");
        ruleRegistry.getRule(user1, 0);
    }

    function testDeleteMyRule() public {
        // Add a rule
        vm.prank(user1);
        ruleRegistry.addMyRule("price_alert", abi.encode("token", "USDC"), 300);
        
        vm.expectEmit(true, true, true, true);
        emit RuleDeleted(user1, 0);

        vm.prank(user1);
        ruleRegistry.deleteMyRule(0);
        
        // Rule should not exist anymore
        vm.prank(user1);
        vm.expectRevert("RuleRegistry: rule does not exist");
        ruleRegistry.getMyRule(0);
    }

    function testDeleteRuleValidation() public {
        // Test non-existent rule
        vm.expectRevert("RuleRegistry: rule does not exist");
        ruleRegistry.deleteRule(user1, 0);
    }

    function testDeleteRuleAccessControl() public {
        // Add rule as owner
        ruleRegistry.addRule(user1, "price_alert", abi.encode("test"), 300);
        
        // User1 should be able to delete their own rule
        vm.prank(user1);
        ruleRegistry.deleteRule(user1, 0);
        
        // Add another rule
        ruleRegistry.addRule(user1, "volume_alert", abi.encode("test"), 600);
        
        // User2 should not be able to delete user1's rule
        vm.prank(user2);
        vm.expectRevert("RuleRegistry: not rule owner");
        ruleRegistry.deleteRule(user1, 1);
    }

    // ============ ACTIVATE/DEACTIVATE RULE TESTS ============

    function testActivateRule() public {
        // Add a rule
        ruleRegistry.addRule(user1, "price_alert", abi.encode("test"), 300);
        
        // Deactivate it first
        ruleRegistry.deactivateRule(user1, 0);
        (bool exists, bool active) = ruleRegistry.isRuleActive(user1, 0);
        assertTrue(exists);
        assertFalse(active);
        
        vm.expectEmit(true, true, true, true);
        emit RuleActivated(user1, 0);

        ruleRegistry.activateRule(user1, 0);
        
        (exists, active) = ruleRegistry.isRuleActive(user1, 0);
        assertTrue(exists);
        assertTrue(active);
    }

    function testDeactivateRule() public {
        // Add a rule
        ruleRegistry.addRule(user1, "price_alert", abi.encode("test"), 300);
        
        vm.expectEmit(true, true, true, true);
        emit RuleDeactivated(user1, 0);

        ruleRegistry.deactivateRule(user1, 0);
        
        (bool exists, bool active) = ruleRegistry.isRuleActive(user1, 0);
        assertTrue(exists);
        assertFalse(active);
    }

    function testActivateMyRule() public {
        // Add a rule
        vm.prank(user1);
        ruleRegistry.addMyRule("price_alert", abi.encode("test"), 300);
        
        // Deactivate it first
        vm.prank(user1);
        ruleRegistry.deactivateMyRule(0);
        
        vm.expectEmit(true, true, true, true);
        emit RuleActivated(user1, 0);

        vm.prank(user1);
        ruleRegistry.activateMyRule(0);
        
        vm.prank(user1);
        (bool exists, bool active) = ruleRegistry.isMyRuleActive(0);
        assertTrue(exists);
        assertTrue(active);
    }

    function testDeactivateMyRule() public {
        // Add a rule
        vm.prank(user1);
        ruleRegistry.addMyRule("price_alert", abi.encode("test"), 300);
        
        vm.expectEmit(true, true, true, true);
        emit RuleDeactivated(user1, 0);

        vm.prank(user1);
        ruleRegistry.deactivateMyRule(0);
        
        vm.prank(user1);
        (bool exists, bool active) = ruleRegistry.isMyRuleActive(0);
        assertTrue(exists);
        assertFalse(active);
    }

    function testActivateDeactivateValidation() public {
        // Test non-existent rule
        vm.expectRevert("RuleRegistry: rule does not exist");
        ruleRegistry.activateRule(user1, 0);
        
        vm.expectRevert("RuleRegistry: rule does not exist");
        ruleRegistry.deactivateRule(user1, 0);
        
        // Add a rule
        ruleRegistry.addRule(user1, "price_alert", abi.encode("test"), 300);
        
        // Test activating already active rule
        vm.expectRevert("RuleRegistry: rule already active");
        ruleRegistry.activateRule(user1, 0);
        
        // Deactivate it
        ruleRegistry.deactivateRule(user1, 0);
        
        // Test deactivating already inactive rule
        vm.expectRevert("RuleRegistry: rule already inactive");
        ruleRegistry.deactivateRule(user1, 0);
    }

    // ============ FIRE RULE TESTS ============

    function testFireRule() public {
        // Add a rule
        ruleRegistry.addRule(user1, "price_alert", abi.encode("token", "USDC"), 300);
        
        string memory metric = "price_above_threshold";
        uint256 expectedTimestamp = block.timestamp;

        vm.expectEmit(true, true, true, true);
        emit RuleFired(user1, 0, metric, expectedTimestamp);

        ruleRegistry.fireRule(user1, 0, metric);
    }

    function testFireRuleValidation() public {
        // Test non-existent rule
        vm.expectRevert("RuleRegistry: rule does not exist");
        ruleRegistry.fireRule(user1, 0, "test_metric");
        
        // Add a rule
        ruleRegistry.addRule(user1, "price_alert", abi.encode("test"), 300);
        
        // Test empty metric
        vm.expectRevert("RuleRegistry: empty metric");
        ruleRegistry.fireRule(user1, 0, "");
        
        // Deactivate the rule
        ruleRegistry.deactivateRule(user1, 0);
        
        // Test firing inactive rule
        vm.expectRevert("RuleRegistry: rule is inactive");
        ruleRegistry.fireRule(user1, 0, "test_metric");
    }

    function testFireRuleAccessControl() public {
        // Add a rule
        ruleRegistry.addRule(user1, "price_alert", abi.encode("test"), 300);
        
        // Only owner should be able to fire rules
        vm.prank(user1);
        vm.expectRevert("RuleRegistry: not owner");
        ruleRegistry.fireRule(user1, 0, "test_metric");
        
        vm.prank(user2);
        vm.expectRevert("RuleRegistry: not owner");
        ruleRegistry.fireRule(user1, 0, "test_metric");
    }

    // ============ QUERY TESTS ============

    function testGetUserRuleIds() public {
        // Add multiple rules
        ruleRegistry.addRule(user1, "price_alert", abi.encode("test1"), 300);
        ruleRegistry.addRule(user1, "volume_alert", abi.encode("test2"), 600);
        ruleRegistry.addRule(user1, "liquidity_alert", abi.encode("test3"), 900);
        
        // Deactivate one rule
        ruleRegistry.deactivateRule(user1, 1);
        
        uint256[] memory ruleIds = ruleRegistry.getUserRuleIds(user1);
        assertEq(ruleIds.length, 2); // Only active rules
        assertEq(ruleIds[0], 0);
        assertEq(ruleIds[1], 2);
    }

    function testGetMyRuleIds() public {
        // Add multiple rules
        vm.startPrank(user1);
        ruleRegistry.addMyRule("price_alert", abi.encode("test1"), 300);
        ruleRegistry.addMyRule("volume_alert", abi.encode("test2"), 600);
        ruleRegistry.addMyRule("liquidity_alert", abi.encode("test3"), 900);
        
        // Deactivate one rule
        ruleRegistry.deactivateMyRule(1);
        
        uint256[] memory ruleIds = ruleRegistry.getMyRuleIds();
        assertEq(ruleIds.length, 2); // Only active rules
        assertEq(ruleIds[0], 0);
        assertEq(ruleIds[1], 2);
        vm.stopPrank();
    }

    function testGetUserRuleCount() public {
        assertEq(ruleRegistry.getUserRuleCount(user1), 0);
        
        ruleRegistry.addRule(user1, "price_alert", abi.encode("test"), 300);
        assertEq(ruleRegistry.getUserRuleCount(user1), 1);
        
        ruleRegistry.addRule(user1, "volume_alert", abi.encode("test"), 600);
        assertEq(ruleRegistry.getUserRuleCount(user1), 2);
        
        // Deleting a rule doesn't change the count
        ruleRegistry.deleteRule(user1, 0);
        assertEq(ruleRegistry.getUserRuleCount(user1), 2);
    }

    function testGetMyRuleCount() public {
        vm.startPrank(user1);
        assertEq(ruleRegistry.getMyRuleCount(), 0);
        
        ruleRegistry.addMyRule("price_alert", abi.encode("test"), 300);
        assertEq(ruleRegistry.getMyRuleCount(), 1);
        
        ruleRegistry.addMyRule("volume_alert", abi.encode("test"), 600);
        assertEq(ruleRegistry.getMyRuleCount(), 2);
        vm.stopPrank();
    }

    // ============ EMERGENCY FUNCTIONS TESTS ============

    function testEmergencyClearUserRules() public {
        // Add multiple rules
        ruleRegistry.addRule(user1, "price_alert", abi.encode("test1"), 300);
        ruleRegistry.addRule(user1, "volume_alert", abi.encode("test2"), 600);
        ruleRegistry.addRule(user1, "liquidity_alert", abi.encode("test3"), 900);
        
        assertEq(ruleRegistry.getUserRuleCount(user1), 3);
        
        // Clear all rules
        ruleRegistry.emergencyClearUserRules(user1);
        
        assertEq(ruleRegistry.getUserRuleCount(user1), 0);
        
        // Rules should not exist
        vm.expectRevert("RuleRegistry: rule does not exist");
        ruleRegistry.getRule(user1, 0);
    }

    function testEmergencyClearUserRulesValidation() public {
        vm.expectRevert("RuleRegistry: zero user address");
        ruleRegistry.emergencyClearUserRules(address(0));
    }

    function testEmergencyClearUserRulesAccessControl() public {
        vm.prank(user1);
        vm.expectRevert("RuleRegistry: not owner");
        ruleRegistry.emergencyClearUserRules(user1);
    }

    // ============ OWNERSHIP TESTS ============

    function testTransferOwnership() public {
        address newOwner = makeAddr("newOwner");
        
        ruleRegistry.transferOwnership(newOwner);
        assertEq(ruleRegistry.owner(), newOwner);
    }

    function testTransferOwnershipValidation() public {
        vm.expectRevert("RuleRegistry: zero address");
        ruleRegistry.transferOwnership(address(0));
    }

    function testTransferOwnershipAccessControl() public {
        vm.prank(user1);
        vm.expectRevert("RuleRegistry: not owner");
        ruleRegistry.transferOwnership(user1);
    }

    // ============ INTEGRATION TESTS ============

    function testFullRuleLifecycle() public {
        // 1. Add a rule
        vm.prank(user1);
        uint256 ruleId = ruleRegistry.addMyRule("price_alert", abi.encode("token", "USDC", "1000000"), 300);
        assertEq(ruleId, 0);
        
        // 2. Verify rule exists and is active
        vm.prank(user1);
        (bool exists, bool active) = ruleRegistry.isMyRuleActive(0);
        assertTrue(exists);
        assertTrue(active);
        
        // 3. Update the rule
        vm.prank(user1);
        ruleRegistry.updateMyRule(0, "volume_alert", abi.encode("minVolume", "1000000000000000000"), 600);
        
        // 4. Verify update
        vm.prank(user1);
        RuleRegistry.Rule memory rule = ruleRegistry.getMyRule(0);
        assertEq(rule.kind, "volume_alert");
        assertEq(rule.cooldownSeconds, 600);
        assertTrue(rule.active);
        
        // 5. Fire the rule
        ruleRegistry.fireRule(user1, 0, "volume_threshold_exceeded");
        
        // 6. Deactivate the rule
        vm.prank(user1);
        ruleRegistry.deactivateMyRule(0);
        
        // 7. Verify deactivation
        vm.prank(user1);
        (exists, active) = ruleRegistry.isMyRuleActive(0);
        assertTrue(exists);
        assertFalse(active);
        
        // 8. Try to fire inactive rule (should fail)
        vm.expectRevert("RuleRegistry: rule is inactive");
        ruleRegistry.fireRule(user1, 0, "test_metric");
        
        // 9. Reactivate the rule
        vm.prank(user1);
        ruleRegistry.activateMyRule(0);
        
        // 10. Verify reactivation
        vm.prank(user1);
        (exists, active) = ruleRegistry.isMyRuleActive(0);
        assertTrue(exists);
        assertTrue(active);
        
        // 11. Delete the rule
        vm.prank(user1);
        ruleRegistry.deleteMyRule(0);
        
        // 12. Verify deletion
        vm.prank(user1);
        vm.expectRevert("RuleRegistry: rule does not exist");
        ruleRegistry.getMyRule(0);
    }

    function testMultipleUsersRules() public {
        // User1 adds rules
        vm.prank(user1);
        ruleRegistry.addMyRule("price_alert", abi.encode("token", "USDC"), 300);
        
        vm.prank(user1);
        ruleRegistry.addMyRule("volume_alert", abi.encode("minVolume", "1000"), 600);
        
        // User2 adds rules
        vm.prank(user2);
        ruleRegistry.addMyRule("liquidity_alert", abi.encode("minLiquidity", "50000"), 900);
        
        vm.prank(user2);
        ruleRegistry.addMyRule("price_alert", abi.encode("token", "ETH"), 300);
        
        // Verify counts
        assertEq(ruleRegistry.getUserRuleCount(user1), 2);
        assertEq(ruleRegistry.getUserRuleCount(user2), 2);
        
        // Verify rule IDs
        uint256[] memory user1Rules = ruleRegistry.getUserRuleIds(user1);
        uint256[] memory user2Rules = ruleRegistry.getUserRuleIds(user2);
        
        assertEq(user1Rules.length, 2);
        assertEq(user2Rules.length, 2);
        
        // Verify rules are independent
        vm.prank(user1);
        RuleRegistry.Rule memory user1Rule = ruleRegistry.getMyRule(0);
        assertEq(user1Rule.kind, "price_alert");
        
        vm.prank(user2);
        RuleRegistry.Rule memory user2Rule = ruleRegistry.getMyRule(0);
        assertEq(user2Rule.kind, "liquidity_alert");
    }

    // ============ EDGE CASE TESTS ============

    function testBoundaryValues() public {
        // Test minimum cooldown (1 second)
        vm.prank(user1);
        ruleRegistry.addMyRule("price_alert", abi.encode("test"), 1);
        
        // Test maximum cooldown (1 year)
        vm.prank(user1);
        ruleRegistry.addMyRule("volume_alert", abi.encode("test"), 365 * 24 * 60 * 60);
        
        // Test empty params
        vm.prank(user1);
        ruleRegistry.addMyRule("liquidity_alert", "", 300);
        
        assertEq(ruleRegistry.getUserRuleCount(user1), 3);
    }

    function testLargeParams() public {
        // Test with large params
        bytes memory largeParams = new bytes(1000);
        for (uint256 i = 0; i < 1000; i++) {
            largeParams[i] = bytes1(uint8(i % 256));
        }
        
        vm.prank(user1);
        ruleRegistry.addMyRule("complex_alert", largeParams, 300);
        
        vm.prank(user1);
        RuleRegistry.Rule memory rule = ruleRegistry.getMyRule(0);
        assertEq(rule.params, largeParams);
    }

    function testLongRuleKind() public {
        // Test with long rule kind
        string memory longKind = "very_long_rule_kind_name_that_exceeds_normal_length_but_should_still_work";
        
        vm.prank(user1);
        ruleRegistry.addMyRule(longKind, abi.encode("test"), 300);
        
        vm.prank(user1);
        RuleRegistry.Rule memory rule = ruleRegistry.getMyRule(0);
        assertEq(rule.kind, longKind);
    }
}
