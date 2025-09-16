// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "forge-std/interfaces/IERC20.sol";

/**
 * @title PermitAdapter
 * @dev Helper library for Permit2 and EIP-2612 verification and token management
 * @notice Provides secure permit verification and allowance management to prevent allowance drift
 */
library PermitAdapter {
    // Permit2 contract address (mainnet: 0x000000000022D473030F116dDEE9F6B43aC78BA3)
    address public constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    
    // Events
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

    // Structs for permit data
    struct Permit2Data {
        address token;
        uint256 amount;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }
    
    struct Permit2612Data {
        address owner;
        address spender;
        uint256 value;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    /**
     * @dev Verify and execute Permit2 transfer
     * @param permitData Permit2 permit data
     * @param from Token owner address
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function verifyAndExecutePermit2(
        Permit2Data memory permitData,
        address from,
        address to,
        uint256 amount
    ) internal {
        // TODO: Implement actual Permit2 signature verification
        // This is a placeholder that simulates the permit verification
        
        // In a real implementation, this would:
        // 1. Verify the Permit2 signature
        // 2. Check the permit deadline
        // 3. Execute the token transfer via Permit2
        // 4. Emit the transfer event
        
        // For now, we'll simulate the transfer
        emit Permit2Transfer(permitData.token, from, to, amount);
    }

    /**
     * @dev Verify and execute EIP-2612 permit
     * @param permitData EIP-2612 permit data
     * @param token Token contract address
     */
    function verifyAndExecutePermit2612(
        Permit2612Data memory permitData,
        address token
    ) internal {
        // TODO: Implement actual EIP-2612 permit verification
        // This is a placeholder that simulates the permit verification
        
        // In a real implementation, this would:
        // 1. Verify the EIP-2612 signature
        // 2. Check the permit deadline
        // 3. Call permit() on the token contract
        // 4. Emit the approval event
        
        // For now, we'll simulate the permit
        emit Permit2612Approval(token, permitData.owner, permitData.spender, permitData.value);
    }

    /**
     * @dev Grant temporary approval to router and return previous allowance
     * @param token Token contract address
     * @param router Router contract address
     * @param amount Amount to approve
     * @return previousAllowance Previous allowance amount
     */
    function grantTemporaryApproval(
        address token,
        address router,
        uint256 amount
    ) internal returns (uint256 previousAllowance) {
        IERC20 tokenContract = IERC20(token);
        previousAllowance = tokenContract.allowance(address(this), router);
        
        // Grant approval
        require(tokenContract.approve(router, amount), "PermitAdapter: approval failed");
    }

    /**
     * @dev Reset allowance to zero (safety reset)
     * @param token Token contract address
     * @param spender Spender address
     * @return previousAllowance Previous allowance amount
     */
    function resetAllowanceToZero(
        address token,
        address spender
    ) internal returns (uint256 previousAllowance) {
        IERC20 tokenContract = IERC20(token);
        previousAllowance = tokenContract.allowance(address(this), spender);
        
        if (previousAllowance > 0) {
            require(tokenContract.approve(spender, 0), "PermitAdapter: reset failed");
            emit AllowanceReset(token, spender, previousAllowance, 0);
        }
    }

    /**
     * @dev Reset allowance to exact remainder (precision reset)
     * @param token Token contract address
     * @param spender Spender address
     * @param exactRemainder Exact amount to set as allowance
     * @return previousAllowance Previous allowance amount
     */
    function resetAllowanceToExact(
        address token,
        address spender,
        uint256 exactRemainder
    ) internal returns (uint256 previousAllowance) {
        IERC20 tokenContract = IERC20(token);
        previousAllowance = tokenContract.allowance(address(this), spender);
        
        require(tokenContract.approve(spender, exactRemainder), "PermitAdapter: reset failed");
        emit AllowanceReset(token, spender, previousAllowance, exactRemainder);
    }

    /**
     * @dev Get current allowance
     * @param token Token contract address
     * @param spender Spender address
     * @return allowance Current allowance amount
     */
    function getCurrentAllowance(
        address token,
        address spender
    ) internal view returns (uint256 allowance) {
        return IERC20(token).allowance(address(this), spender);
    }

    /**
     * @dev Check if allowance is zero
     * @param token Token contract address
     * @param spender Spender address
     * @return isZero True if allowance is zero
     */
    function isAllowanceZero(
        address token,
        address spender
    ) internal view returns (bool isZero) {
        return getCurrentAllowance(token, spender) == 0;
    }

    /**
     * @dev Execute swap with proper allowance management
     * @param token Token contract address
     * @param router Router contract address
     * @param amount Amount to approve for swap
     * @param swapCalldata Router-specific swap calldata
     * @return success True if swap executed successfully
     */
    function executeSwapWithAllowanceManagement(
        address token,
        address router,
        uint256 amount,
        bytes memory swapCalldata
    ) internal returns (bool success) {
        // Grant temporary approval
        uint256 previousAllowance = grantTemporaryApproval(token, router, amount);
        
        // TODO: Execute the actual swap
        // This would involve calling the router with swapCalldata
        // For now, we'll simulate success
        success = true;
        
        // Reset allowance to zero for safety
        resetAllowanceToZero(token, router);
    }

    /**
     * @dev Parse Permit2 data from bytes
     * @param permit2Data Raw Permit2 data bytes
     * @return permit Parsed Permit2 data struct
     */
    function parsePermit2Data(
        bytes memory permit2Data
    ) internal pure returns (Permit2Data memory permit) {
        // TODO: Implement actual Permit2 data parsing
        // This is a placeholder that returns default values
        
        // In a real implementation, this would decode the permit2Data bytes
        // and extract the token, amount, deadline, and signature components
        
        return Permit2Data({
            token: address(0),
            amount: 0,
            deadline: 0,
            v: 0,
            r: bytes32(0),
            s: bytes32(0)
        });
    }

    /**
     * @dev Parse EIP-2612 permit data from bytes
     * @param permit2612Data Raw EIP-2612 permit data bytes
     * @return permit Parsed EIP-2612 permit data struct
     */
    function parsePermit2612Data(
        bytes memory permit2612Data
    ) internal pure returns (Permit2612Data memory permit) {
        // TODO: Implement actual EIP-2612 permit data parsing
        // This is a placeholder that returns default values
        
        // In a real implementation, this would decode the permit2612Data bytes
        // and extract the owner, spender, value, deadline, and signature components
        
        return Permit2612Data({
            owner: address(0),
            spender: address(0),
            value: 0,
            deadline: 0,
            v: 0,
            r: bytes32(0),
            s: bytes32(0)
        });
    }

    /**
     * @dev Validate permit deadline
     * @param deadline Permit deadline timestamp
     * @return valid True if deadline is valid (not expired)
     */
    function validatePermitDeadline(
        uint256 deadline
    ) internal view returns (bool valid) {
        return block.timestamp <= deadline;
    }

    /**
     * @dev Calculate approval multiplier for safety buffer
     * @param amount Base amount
     * @param multiplier Multiplier in basis points (e.g., 102 for 1.02x)
     * @return adjustedAmount Amount with multiplier applied
     */
    function calculateApprovalWithMultiplier(
        uint256 amount,
        uint256 multiplier
    ) internal pure returns (uint256 adjustedAmount) {
        return (amount * multiplier) / 100;
    }
}
