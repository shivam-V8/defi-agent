// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title RuleRegistry
 * @dev Lightweight on-chain alerts configuration contract
 * @notice Stores per-user rules with minimal on-chain data, using events for off-chain worker coordination
 */
contract RuleRegistry {
    // Rule structure
    struct Rule {
        string kind;           // Rule type (e.g., "price_alert", "volume_alert", "liquidity_alert")
        bytes params;          // JSON-ish parameters encoded as bytes
        uint256 cooldownSeconds; // Minimum time between rule firings
        bool active;           // Whether the rule is active
    }

    // State variables
    mapping(address => mapping(uint256 => Rule)) public userRules; // user => ruleId => Rule
    mapping(address => uint256) public userRuleCount; // user => number of rules
    address public owner;

    // Events
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

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "RuleRegistry: not owner");
        _;
    }

    modifier onlyRuleOwner(address user, uint256 ruleId) {
        require(msg.sender == user || msg.sender == owner, "RuleRegistry: not rule owner");
        require(ruleId < userRuleCount[user], "RuleRegistry: rule does not exist");
        require(bytes(userRules[user][ruleId].kind).length > 0, "RuleRegistry: rule does not exist");
        _;
    }

    modifier validRuleId(address user, uint256 ruleId) {
        require(ruleId < userRuleCount[user], "RuleRegistry: rule does not exist");
        require(bytes(userRules[user][ruleId].kind).length > 0, "RuleRegistry: rule does not exist");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Add a new rule for a user
     * @param user The user address
     * @param kind The rule type
     * @param params Rule parameters encoded as bytes
     * @param cooldownSeconds Minimum time between rule firings
     * @return ruleId The ID of the newly created rule
     */
    function addRule(
        address user,
        string calldata kind,
        bytes calldata params,
        uint256 cooldownSeconds
    ) external onlyOwner returns (uint256 ruleId) {
        require(user != address(0), "RuleRegistry: zero user address");
        require(bytes(kind).length > 0, "RuleRegistry: empty rule kind");
        require(cooldownSeconds > 0, "RuleRegistry: cooldown must be positive");

        ruleId = userRuleCount[user];
        userRules[user][ruleId] = Rule({
            kind: kind,
            params: params,
            cooldownSeconds: cooldownSeconds,
            active: true
        });
        
        userRuleCount[user]++;

        emit RuleAdded(user, ruleId, kind, params, cooldownSeconds);
        return ruleId;
    }

    /**
     * @dev Add a new rule for the caller
     * @param kind The rule type
     * @param params Rule parameters encoded as bytes
     * @param cooldownSeconds Minimum time between rule firings
     * @return ruleId The ID of the newly created rule
     */
    function addMyRule(
        string calldata kind,
        bytes calldata params,
        uint256 cooldownSeconds
    ) external returns (uint256 ruleId) {
        require(bytes(kind).length > 0, "RuleRegistry: empty rule kind");
        require(cooldownSeconds > 0, "RuleRegistry: cooldown must be positive");

        ruleId = userRuleCount[msg.sender];
        userRules[msg.sender][ruleId] = Rule({
            kind: kind,
            params: params,
            cooldownSeconds: cooldownSeconds,
            active: true
        });
        
        userRuleCount[msg.sender]++;

        emit RuleAdded(msg.sender, ruleId, kind, params, cooldownSeconds);
        return ruleId;
    }

    /**
     * @dev Update an existing rule
     * @param user The user address
     * @param ruleId The rule ID to update
     * @param kind The new rule type
     * @param params New rule parameters encoded as bytes
     * @param cooldownSeconds New minimum time between rule firings
     */
    function updateRule(
        address user,
        uint256 ruleId,
        string calldata kind,
        bytes calldata params,
        uint256 cooldownSeconds
    ) external onlyRuleOwner(user, ruleId) {
        require(bytes(kind).length > 0, "RuleRegistry: empty rule kind");
        require(cooldownSeconds > 0, "RuleRegistry: cooldown must be positive");

        userRules[user][ruleId] = Rule({
            kind: kind,
            params: params,
            cooldownSeconds: cooldownSeconds,
            active: userRules[user][ruleId].active // Preserve active status
        });

        emit RuleUpdated(user, ruleId, kind, params, cooldownSeconds);
    }

    /**
     * @dev Update an existing rule for the caller
     * @param ruleId The rule ID to update
     * @param kind The new rule type
     * @param params New rule parameters encoded as bytes
     * @param cooldownSeconds New minimum time between rule firings
     */
    function updateMyRule(
        uint256 ruleId,
        string calldata kind,
        bytes calldata params,
        uint256 cooldownSeconds
    ) external validRuleId(msg.sender, ruleId) {
        require(bytes(kind).length > 0, "RuleRegistry: empty rule kind");
        require(cooldownSeconds > 0, "RuleRegistry: cooldown must be positive");

        userRules[msg.sender][ruleId] = Rule({
            kind: kind,
            params: params,
            cooldownSeconds: cooldownSeconds,
            active: userRules[msg.sender][ruleId].active // Preserve active status
        });

        emit RuleUpdated(msg.sender, ruleId, kind, params, cooldownSeconds);
    }

    /**
     * @dev Delete a rule (marks as inactive and clears data)
     * @param user The user address
     * @param ruleId The rule ID to delete
     */
    function deleteRule(address user, uint256 ruleId) external onlyRuleOwner(user, ruleId) {
        // Clear the rule data
        delete userRules[user][ruleId];

        emit RuleDeleted(user, ruleId);
    }

    /**
     * @dev Delete a rule for the caller
     * @param ruleId The rule ID to delete
     */
    function deleteMyRule(uint256 ruleId) external validRuleId(msg.sender, ruleId) {
        // Clear the rule data
        delete userRules[msg.sender][ruleId];

        emit RuleDeleted(msg.sender, ruleId);
    }

    /**
     * @dev Activate a rule
     * @param user The user address
     * @param ruleId The rule ID to activate
     */
    function activateRule(address user, uint256 ruleId) external onlyRuleOwner(user, ruleId) {
        require(!userRules[user][ruleId].active, "RuleRegistry: rule already active");
        
        userRules[user][ruleId].active = true;
        emit RuleActivated(user, ruleId);
    }

    /**
     * @dev Activate a rule for the caller
     * @param ruleId The rule ID to activate
     */
    function activateMyRule(uint256 ruleId) external validRuleId(msg.sender, ruleId) {
        require(!userRules[msg.sender][ruleId].active, "RuleRegistry: rule already active");
        
        userRules[msg.sender][ruleId].active = true;
        emit RuleActivated(msg.sender, ruleId);
    }

    /**
     * @dev Deactivate a rule
     * @param user The user address
     * @param ruleId The rule ID to deactivate
     */
    function deactivateRule(address user, uint256 ruleId) external onlyRuleOwner(user, ruleId) {
        require(userRules[user][ruleId].active, "RuleRegistry: rule already inactive");
        
        userRules[user][ruleId].active = false;
        emit RuleDeactivated(user, ruleId);
    }

    /**
     * @dev Deactivate a rule for the caller
     * @param ruleId The rule ID to deactivate
     */
    function deactivateMyRule(uint256 ruleId) external validRuleId(msg.sender, ruleId) {
        require(userRules[msg.sender][ruleId].active, "RuleRegistry: rule already inactive");
        
        userRules[msg.sender][ruleId].active = false;
        emit RuleDeactivated(msg.sender, ruleId);
    }

    /**
     * @dev Fire a rule (emits event for off-chain worker)
     * @param user The user address
     * @param ruleId The rule ID to fire
     * @param metric The metric that triggered the rule
     */
    function fireRule(
        address user,
        uint256 ruleId,
        string calldata metric
    ) external onlyOwner validRuleId(user, ruleId) {
        require(userRules[user][ruleId].active, "RuleRegistry: rule is inactive");
        require(bytes(metric).length > 0, "RuleRegistry: empty metric");

        emit RuleFired(user, ruleId, metric, block.timestamp);
    }

    /**
     * @dev Get a rule for a user
     * @param user The user address
     * @param ruleId The rule ID
     * @return rule The rule data
     */
    function getRule(address user, uint256 ruleId) external view validRuleId(user, ruleId) returns (Rule memory rule) {
        return userRules[user][ruleId];
    }

    /**
     * @dev Get a rule for the caller
     * @param ruleId The rule ID
     * @return rule The rule data
     */
    function getMyRule(uint256 ruleId) external view validRuleId(msg.sender, ruleId) returns (Rule memory rule) {
        return userRules[msg.sender][ruleId];
    }

    /**
     * @dev Get the number of rules for a user
     * @param user The user address
     * @return count The number of rules
     */
    function getUserRuleCount(address user) external view returns (uint256 count) {
        return userRuleCount[user];
    }

    /**
     * @dev Get the number of rules for the caller
     * @return count The number of rules
     */
    function getMyRuleCount() external view returns (uint256 count) {
        return userRuleCount[msg.sender];
    }

    /**
     * @dev Check if a rule exists and is active
     * @param user The user address
     * @param ruleId The rule ID
     * @return exists True if the rule exists
     * @return active True if the rule is active
     */
    function isRuleActive(address user, uint256 ruleId) external view returns (bool exists, bool active) {
        exists = ruleId < userRuleCount[user];
        if (exists) {
            active = userRules[user][ruleId].active;
        }
    }

    /**
     * @dev Check if a rule exists and is active for the caller
     * @param ruleId The rule ID
     * @return exists True if the rule exists
     * @return active True if the rule is active
     */
    function isMyRuleActive(uint256 ruleId) external view returns (bool exists, bool active) {
        exists = ruleId < userRuleCount[msg.sender];
        if (exists) {
            active = userRules[msg.sender][ruleId].active;
        }
    }

    /**
     * @dev Get all rule IDs for a user (returns array of active rule IDs)
     * @param user The user address
     * @return ruleIds Array of rule IDs
     */
    function getUserRuleIds(address user) external view returns (uint256[] memory ruleIds) {
        return _getUserRuleIds(user);
    }

    /**
     * @dev Internal function to get all rule IDs for a user
     * @param user The user address
     * @return ruleIds Array of rule IDs
     */
    function _getUserRuleIds(address user) internal view returns (uint256[] memory ruleIds) {
        uint256 count = userRuleCount[user];
        uint256 activeCount = 0;
        
        // First pass: count active rules
        for (uint256 i = 0; i < count; i++) {
            if (userRules[user][i].active) {
                activeCount++;
            }
        }
        
        // Second pass: collect active rule IDs
        ruleIds = new uint256[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < count; i++) {
            if (userRules[user][i].active) {
                ruleIds[index] = i;
                index++;
            }
        }
        
        return ruleIds;
    }

    /**
     * @dev Get all rule IDs for the caller
     * @return ruleIds Array of rule IDs
     */
    function getMyRuleIds() external view returns (uint256[] memory ruleIds) {
        return _getUserRuleIds(msg.sender);
    }

    /**
     * @dev Emergency function to clear all rules for a user (only owner)
     * @param user The user address
     */
    function emergencyClearUserRules(address user) external onlyOwner {
        require(user != address(0), "RuleRegistry: zero user address");
        
        uint256 count = userRuleCount[user];
        for (uint256 i = 0; i < count; i++) {
            delete userRules[user][i];
        }
        userRuleCount[user] = 0;
    }

    /**
     * @dev Transfer ownership
     * @param newOwner The new owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "RuleRegistry: zero address");
        owner = newOwner;
    }
}
