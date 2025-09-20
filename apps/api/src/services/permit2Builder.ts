/**
 * Permit2 typed data builder for token approvals
 */

import { ChainId } from '../types/policy.js';

// Permit2 types and interfaces
export interface Permit2Data {
  permitted: {
    token: string;
    amount: string;
  };
  spender: string;
  nonce: string;
  deadline: number;
}

export interface Permit2TypedData {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  types: {
    PermitDetails: Array<{
      name: string;
      type: string;
    }>;
    PermitSingle: Array<{
      name: string;
      type: string;
    }>;
    EIP712Domain: Array<{
      name: string;
      type: string;
    }>;
  };
  primaryType: string;
  message: {
    details: {
      token: string;
      amount: string;
      expiration: number;
      nonce: number;
    };
    spender: string;
    sigDeadline: number;
  };
}

export interface Permit2BuilderConfig {
  chainId: ChainId;
  permit2Address: string;
  ttl: number; // Time to live in seconds
}

export class Permit2Builder {
  private config: Permit2BuilderConfig;

  constructor(config: Permit2BuilderConfig) {
    this.config = config;
  }

  /**
   * Build Permit2 typed data for token approval
   */
  buildPermit2TypedData(params: {
    token: string;
    amount: string;
    spender: string;
    nonce: string;
    userAddress: string;
  }): Permit2TypedData {
    const deadline = Math.floor(Date.now() / 1000) + this.config.ttl;
    const expiration = deadline;

    return {
      domain: {
        name: 'Permit2',
        version: '1',
        chainId: this.config.chainId,
        verifyingContract: this.config.permit2Address,
      },
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' },
        ],
        PermitDetails: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint160' },
          { name: 'expiration', type: 'uint48' },
          { name: 'nonce', type: 'uint48' },
        ],
        PermitSingle: [
          { name: 'details', type: 'PermitDetails' },
          { name: 'spender', type: 'address' },
          { name: 'sigDeadline', type: 'uint256' },
        ],
      },
      primaryType: 'PermitSingle',
      message: {
        details: {
          token: params.token,
          amount: params.amount,
          expiration,
          nonce: parseInt(params.nonce),
        },
        spender: params.spender,
        sigDeadline: deadline,
      },
    };
  }

  /**
   * Calculate Permit2 message hash
   */
  calculatePermit2Hash(typedData: Permit2TypedData): string {
    // This would typically use a library like ethers.js or viem
    // For now, we'll create a mock hash calculation
    const domainHash = this.hashDomain(typedData.domain);
    const structHash = this.hashStruct(typedData.primaryType, typedData.types, typedData.message);
    
    // EIP-712 hash calculation
    const messageHash = this.hashMessage(domainHash, structHash);
    return messageHash;
  }

  /**
   * Validate Permit2 data
   */
  validatePermit2Data(data: Permit2Data): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate token address
    if (!this.isValidAddress(data.permitted.token)) {
      errors.push('Invalid token address');
    }

    // Validate spender address
    if (!this.isValidAddress(data.spender)) {
      errors.push('Invalid spender address');
    }

    // Validate amount
    if (!this.isValidAmount(data.permitted.amount)) {
      errors.push('Invalid amount');
    }

    // Validate nonce
    if (!this.isValidNonce(data.nonce)) {
      errors.push('Invalid nonce');
    }

    // Validate deadline
    if (data.deadline <= Math.floor(Date.now() / 1000)) {
      errors.push('Deadline must be in the future');
    }

    // Validate TTL
    const maxDeadline = Math.floor(Date.now() / 1000) + this.config.ttl;
    if (data.deadline > maxDeadline) {
      errors.push(`Deadline exceeds maximum TTL of ${this.config.ttl} seconds`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get Permit2 nonce for a user and token
   */
  async getNonce(userAddress: string, tokenAddress: string): Promise<string> {
    // In a real implementation, this would query the Permit2 contract
    // For now, we'll generate a mock nonce
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = (timestamp % 1000000).toString();
    return nonce;
  }

  /**
   * Check if Permit2 is approved for a token
   */
  async isPermit2Approved(
    userAddress: string,
    tokenAddress: string,
    spenderAddress: string,
    amount: string
  ): Promise<boolean> {
    // In a real implementation, this would query the Permit2 contract
    // For now, we'll return false (not approved)
    return false;
  }

  /**
   * Get Permit2 allowance for a user and token
   */
  async getPermit2Allowance(
    userAddress: string,
    tokenAddress: string,
    spenderAddress: string
  ): Promise<string> {
    // In a real implementation, this would query the Permit2 contract
    // For now, we'll return 0
    return '0';
  }

  /**
   * Create Permit2 signature request
   */
  createPermit2SignatureRequest(params: {
    token: string;
    amount: string;
    spender: string;
    userAddress: string;
  }): {
    typedData: Permit2TypedData;
    messageHash: string;
    nonce: string;
    deadline: number;
  } {
    const nonce = Math.floor(Date.now() / 1000).toString();
    const deadline = Math.floor(Date.now() / 1000) + this.config.ttl;

    const typedData = this.buildPermit2TypedData({
      ...params,
      nonce,
    });

    const messageHash = this.calculatePermit2Hash(typedData);

    return {
      typedData,
      messageHash,
      nonce,
      deadline,
    };
  }

  /**
   * Hash domain for EIP-712
   */
  private hashDomain(domain: any): string {
    // Mock implementation - in reality, use proper EIP-712 hashing
    const domainString = JSON.stringify(domain);
    return this.simpleHash(domainString);
  }

  /**
   * Hash struct for EIP-712
   */
  private hashStruct(primaryType: string, types: any, data: any): string {
    // Mock implementation - in reality, use proper EIP-712 hashing
    const structString = JSON.stringify({ primaryType, types, data });
    return this.simpleHash(structString);
  }

  /**
   * Hash message for EIP-712
   */
  private hashMessage(domainHash: string, structHash: string): string {
    // Mock implementation - in reality, use proper EIP-712 hashing
    const messageString = `0x1901${domainHash}${structHash}`;
    return this.simpleHash(messageString);
  }

  /**
   * Simple hash function for testing
   */
  private simpleHash(input: string): string {
    // This is a mock hash function for testing
    // In production, use proper cryptographic hashing
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return '0x' + Math.abs(hash).toString(16).padStart(64, '0');
  }

  /**
   * Validate Ethereum address
   */
  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Validate amount string
   */
  private isValidAmount(amount: string): boolean {
    return /^\d+$/.test(amount) && BigInt(amount) > 0n;
  }

  /**
   * Validate nonce string
   */
  private isValidNonce(nonce: string): boolean {
    return /^\d+$/.test(nonce) && parseInt(nonce) >= 0;
  }

  /**
   * Get Permit2 address for chain
   */
  static getPermit2Address(chainId: ChainId): string {
    const addresses: Record<ChainId, string> = {
      [ChainId.ETHEREUM]: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
      [ChainId.ARBITRUM]: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
      [ChainId.OPTIMISM]: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
      [ChainId.POLYGON]: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
      [ChainId.BASE]: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
      [ChainId.LOCAL_TESTNET]: '0x000000000022D473030F116dDEE9F6B43aC78BA3', // Mock address
    };

    return addresses[chainId] || addresses[ChainId.ETHEREUM];
  }

  /**
   * Create Permit2 builder for chain
   */
  static createForChain(chainId: ChainId, ttl: number = 300): Permit2Builder {
    const permit2Address = Permit2Builder.getPermit2Address(chainId);
    
    return new Permit2Builder({
      chainId,
      permit2Address,
      ttl,
    });
  }
}
