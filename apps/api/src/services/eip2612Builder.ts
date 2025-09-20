/**
 * EIP-2612 typed data builder for token approvals
 */

import { ChainId } from '../types/policy.js';

// EIP-2612 types and interfaces
export interface EIP2612Data {
  owner: string;
  spender: string;
  value: string;
  nonce: string;
  deadline: number;
}

export interface EIP2612TypedData {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  types: {
    EIP712Domain: Array<{
      name: string;
      type: string;
    }>;
    Permit: Array<{
      name: string;
      type: string;
    }>;
  };
  primaryType: string;
  message: {
    owner: string;
    spender: string;
    value: string;
    nonce: string;
    deadline: number;
  };
}

export interface EIP2612BuilderConfig {
  chainId: ChainId;
  tokenAddress: string;
  tokenName: string;
  tokenVersion: string;
  ttl: number; // Time to live in seconds
}

export class EIP2612Builder {
  private config: EIP2612BuilderConfig;

  constructor(config: EIP2612BuilderConfig) {
    this.config = config;
  }

  /**
   * Build EIP-2612 typed data for token approval
   */
  buildEIP2612TypedData(params: {
    owner: string;
    spender: string;
    value: string;
    nonce: string;
  }): EIP2612TypedData {
    const deadline = Math.floor(Date.now() / 1000) + this.config.ttl;

    return {
      domain: {
        name: this.config.tokenName,
        version: this.config.tokenVersion,
        chainId: this.config.chainId,
        verifyingContract: this.config.tokenAddress,
      },
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' },
        ],
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
      primaryType: 'Permit',
      message: {
        owner: params.owner,
        spender: params.spender,
        value: params.value,
        nonce: params.nonce,
        deadline,
      },
    };
  }

  /**
   * Calculate EIP-2612 message hash
   */
  calculateEIP2612Hash(typedData: EIP2612TypedData): string {
    // This would typically use a library like ethers.js or viem
    // For now, we'll create a mock hash calculation
    const domainHash = this.hashDomain(typedData.domain);
    const structHash = this.hashStruct(typedData.primaryType, typedData.types, typedData.message);
    
    // EIP-712 hash calculation
    const messageHash = this.hashMessage(domainHash, structHash);
    return messageHash;
  }

  /**
   * Validate EIP-2612 data
   */
  validateEIP2612Data(data: EIP2612Data): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate owner address
    if (!this.isValidAddress(data.owner)) {
      errors.push('Invalid owner address');
    }

    // Validate spender address
    if (!this.isValidAddress(data.spender)) {
      errors.push('Invalid spender address');
    }

    // Validate value
    if (!this.isValidAmount(data.value)) {
      errors.push('Invalid value');
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
   * Get token nonce for a user
   */
  async getTokenNonce(userAddress: string): Promise<string> {
    // In a real implementation, this would query the token contract
    // For now, we'll generate a mock nonce
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = (timestamp % 1000000).toString();
    return nonce;
  }

  /**
   * Check if token supports EIP-2612
   */
  async supportsEIP2612(tokenAddress: string): Promise<boolean> {
    // In a real implementation, this would check the token contract
    // For now, we'll return true for common tokens
    const commonTokens = [
      '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C', // USDC
      '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
      '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
    ];
    
    return commonTokens.includes(tokenAddress.toLowerCase());
  }

  /**
   * Get token allowance for a user and spender
   */
  async getTokenAllowance(
    userAddress: string,
    spenderAddress: string
  ): Promise<string> {
    // In a real implementation, this would query the token contract
    // For now, we'll return 0
    return '0';
  }

  /**
   * Create EIP-2612 signature request
   */
  createEIP2612SignatureRequest(params: {
    owner: string;
    spender: string;
    value: string;
  }): {
    typedData: EIP2612TypedData;
    messageHash: string;
    nonce: string;
    deadline: number;
  } {
    const nonce = Math.floor(Date.now() / 1000).toString();
    const deadline = Math.floor(Date.now() / 1000) + this.config.ttl;

    const typedData = this.buildEIP2612TypedData({
      ...params,
      nonce,
    });

    const messageHash = this.calculateEIP2612Hash(typedData);

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
   * Get token metadata for chain
   */
  static getTokenMetadata(tokenAddress: string, chainId: ChainId): {
    name: string;
    version: string;
  } {
    const tokenMetadata: Record<string, Record<ChainId, { name: string; version: string }>> = {
      '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C': { // USDC
        [ChainId.ETHEREUM]: { name: 'USD Coin', version: '2' },
        [ChainId.ARBITRUM]: { name: 'USD Coin', version: '2' },
        [ChainId.OPTIMISM]: { name: 'USD Coin', version: '2' },
        [ChainId.POLYGON]: { name: 'USD Coin', version: '2' },
        [ChainId.BASE]: { name: 'USD Coin', version: '2' },
        [ChainId.LOCAL_TESTNET]: { name: 'USD Coin', version: '2' },
      },
      '0xdAC17F958D2ee523a2206206994597C13D831ec7': { // USDT
        [ChainId.ETHEREUM]: { name: 'Tether USD', version: '2' },
        [ChainId.ARBITRUM]: { name: 'Tether USD', version: '2' },
        [ChainId.OPTIMISM]: { name: 'Tether USD', version: '2' },
        [ChainId.POLYGON]: { name: 'Tether USD', version: '2' },
        [ChainId.BASE]: { name: 'Tether USD', version: '2' },
        [ChainId.LOCAL_TESTNET]: { name: 'Tether USD', version: '2' },
      },
      '0x6B175474E89094C44Da98b954EedeAC495271d0F': { // DAI
        [ChainId.ETHEREUM]: { name: 'Dai Stablecoin', version: '1' },
        [ChainId.ARBITRUM]: { name: 'Dai Stablecoin', version: '1' },
        [ChainId.OPTIMISM]: { name: 'Dai Stablecoin', version: '1' },
        [ChainId.POLYGON]: { name: 'Dai Stablecoin', version: '1' },
        [ChainId.BASE]: { name: 'Dai Stablecoin', version: '1' },
        [ChainId.LOCAL_TESTNET]: { name: 'Dai Stablecoin', version: '1' },
      },
    };

    const metadata = tokenMetadata[tokenAddress.toLowerCase()]?.[chainId];
    return metadata || { name: 'Unknown Token', version: '1' };
  }

  /**
   * Create EIP-2612 builder for token
   */
  static createForToken(
    tokenAddress: string,
    chainId: ChainId,
    ttl: number = 300
  ): EIP2612Builder {
    const metadata = EIP2612Builder.getTokenMetadata(tokenAddress, chainId);
    
    return new EIP2612Builder({
      chainId,
      tokenAddress,
      tokenName: metadata.name,
      tokenVersion: metadata.version,
      ttl,
    });
  }
}
