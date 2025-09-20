/**
 * Unified permit builder service for Permit2 and EIP-2612
 */

import { Permit2Builder, Permit2TypedData, Permit2Data } from './permit2Builder.js';
import { EIP2612Builder, EIP2612TypedData, EIP2612Data } from './eip2612Builder.js';
import { ChainId } from '../types/policy.js';

export type PermitType = 'PERMIT2' | 'EIP2612';

export interface PermitRequest {
  token: string;
  amount: string;
  spender: string;
  owner: string;
  permitType: PermitType;
  chainId: ChainId;
  ttl?: number; // Time to live in seconds, defaults to 300 (5 minutes)
}

export interface PermitResponse {
  permitType: PermitType;
  typedData: Permit2TypedData | EIP2612TypedData;
  messageHash: string;
  nonce: string;
  deadline: number;
  ttl: number;
  expiresAt: number;
}

export interface PermitValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class PermitBuilderService {
  private permit2Builder: Permit2Builder;
  private eip2612Builder: EIP2612Builder;
  private chainId: ChainId;
  private defaultTTL: number;

  constructor(chainId: ChainId, defaultTTL: number = 300) {
    this.chainId = chainId;
    this.defaultTTL = defaultTTL;
    this.permit2Builder = Permit2Builder.createForChain(chainId, defaultTTL);
    this.eip2612Builder = EIP2612Builder.createForToken('', chainId, defaultTTL);
  }

  /**
   * Build permit typed data based on request
   */
  async buildPermit(request: PermitRequest): Promise<PermitResponse> {
    const ttl = request.ttl || this.defaultTTL;
    const expiresAt = Math.floor(Date.now() / 1000) + ttl;

    switch (request.permitType) {
      case 'PERMIT2':
        return this.buildPermit2(request, ttl, expiresAt);
      case 'EIP2612':
        return this.buildEIP2612(request, ttl, expiresAt);
      default:
        throw new Error(`Unsupported permit type: ${request.permitType}`);
    }
  }

  /**
   * Build Permit2 permit
   */
  private async buildPermit2(
    request: PermitRequest,
    ttl: number,
    expiresAt: number
  ): Promise<PermitResponse> {
    const permit2Builder = Permit2Builder.createForChain(this.chainId, ttl);
    
    const signatureRequest = permit2Builder.createPermit2SignatureRequest({
      token: request.token,
      amount: request.amount,
      spender: request.spender,
      userAddress: request.owner,
    });

    return {
      permitType: 'PERMIT2',
      typedData: signatureRequest.typedData,
      messageHash: signatureRequest.messageHash,
      nonce: signatureRequest.nonce,
      deadline: signatureRequest.deadline,
      ttl,
      expiresAt,
    };
  }

  /**
   * Build EIP-2612 permit
   */
  private async buildEIP2612(
    request: PermitRequest,
    ttl: number,
    expiresAt: number
  ): Promise<PermitResponse> {
    const eip2612Builder = EIP2612Builder.createForToken(request.token, this.chainId, ttl);
    
    const signatureRequest = eip2612Builder.createEIP2612SignatureRequest({
      owner: request.owner,
      spender: request.spender,
      value: request.amount,
    });

    return {
      permitType: 'EIP2612',
      typedData: signatureRequest.typedData,
      messageHash: signatureRequest.messageHash,
      nonce: signatureRequest.nonce,
      deadline: signatureRequest.deadline,
      ttl,
      expiresAt,
    };
  }

  /**
   * Validate permit data
   */
  async validatePermit(permitData: Permit2Data | EIP2612Data, permitType: PermitType): Promise<PermitValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      let validation;
      
      if (permitType === 'PERMIT2') {
        validation = this.permit2Builder.validatePermit2Data(permitData as Permit2Data);
      } else if (permitType === 'EIP2612') {
        validation = this.eip2612Builder.validateEIP2612Data(permitData as EIP2612Data);
      } else {
        throw new Error(`Unsupported permit type: ${permitType}`);
      }

      errors.push(...validation.errors);

      // Additional validation checks
      if (permitType === 'PERMIT2') {
        const permit2Data = permitData as Permit2Data;
        
        // Check if amount is reasonable
        const amount = BigInt(permit2Data.permitted.amount);
        if (amount > BigInt('1000000000000000000000000')) { // 1M tokens
          warnings.push('Amount is very large, please verify this is correct');
        }

        // Check if deadline is too far in the future
        const maxDeadline = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours
        if (permit2Data.deadline > maxDeadline) {
          warnings.push('Deadline is more than 24 hours in the future');
        }
      }

      if (permitType === 'EIP2612') {
        const eip2612Data = permitData as EIP2612Data;
        
        // Check if amount is reasonable
        const amount = BigInt(eip2612Data.value);
        if (amount > BigInt('1000000000000000000000000')) { // 1M tokens
          warnings.push('Amount is very large, please verify this is correct');
        }

        // Check if deadline is too far in the future
        const maxDeadline = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours
        if (eip2612Data.deadline > maxDeadline) {
          warnings.push('Deadline is more than 24 hours in the future');
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        valid: false,
        errors,
        warnings,
      };
    }
  }

  /**
   * Get recommended permit type for a token
   */
  async getRecommendedPermitType(tokenAddress: string): Promise<PermitType> {
    // Check if token supports EIP-2612
    const eip2612Builder = EIP2612Builder.createForToken(tokenAddress, this.chainId);
    const supportsEIP2612 = await eip2612Builder.supportsEIP2612(tokenAddress);
    
    if (supportsEIP2612) {
      return 'EIP2612';
    }
    
    // Default to Permit2 for tokens that don't support EIP-2612
    return 'PERMIT2';
  }

  /**
   * Check if permit is expired
   */
  isPermitExpired(deadline: number): boolean {
    return deadline <= Math.floor(Date.now() / 1000);
  }

  /**
   * Get time until permit expires
   */
  getTimeUntilExpiry(deadline: number): number {
    return Math.max(0, deadline - Math.floor(Date.now() / 1000));
  }

  /**
   * Create permit request with recommended type
   */
  async createPermitRequest(params: {
    token: string;
    amount: string;
    spender: string;
    owner: string;
    ttl?: number;
  }): Promise<PermitRequest> {
    const permitType = await this.getRecommendedPermitType(params.token);
    
    return {
      ...params,
      permitType,
      chainId: this.chainId,
      ttl: params.ttl || this.defaultTTL,
    };
  }

  /**
   * Get permit builder for specific type
   */
  getPermitBuilder(permitType: PermitType): Permit2Builder | EIP2612Builder {
    switch (permitType) {
      case 'PERMIT2':
        return this.permit2Builder;
      case 'EIP2612':
        return this.eip2612Builder;
      default:
        throw new Error(`Unsupported permit type: ${permitType}`);
    }
  }

  /**
   * Get chain information
   */
  getChainInfo(): { chainId: ChainId; ttl: number } {
    return {
      chainId: this.chainId,
      ttl: this.defaultTTL,
    };
  }

  /**
   * Update TTL for future permits
   */
  updateTTL(newTTL: number): void {
    if (newTTL <= 0 || newTTL > 86400) { // Max 24 hours
      throw new Error('TTL must be between 1 and 86400 seconds');
    }
    
    this.defaultTTL = newTTL;
    this.permit2Builder = Permit2Builder.createForChain(this.chainId, newTTL);
    this.eip2612Builder = EIP2612Builder.createForToken('', this.chainId, newTTL);
  }

  /**
   * Get supported permit types for chain
   */
  getSupportedPermitTypes(): PermitType[] {
    return ['PERMIT2', 'EIP2612'];
  }

  /**
   * Health check for permit builders
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    permit2Available: boolean;
    eip2612Available: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let permit2Available = true;
    let eip2612Available = true;

    try {
      // Test Permit2 builder
      const permit2Test = this.permit2Builder.createPermit2SignatureRequest({
        token: '0x0000000000000000000000000000000000000000',
        amount: '1000000000000000000',
        spender: '0x0000000000000000000000000000000000000000',
        userAddress: '0x0000000000000000000000000000000000000000',
      });
      
      if (!permit2Test.typedData || !permit2Test.messageHash) {
        permit2Available = false;
        errors.push('Permit2 builder test failed');
      }
    } catch (error) {
      permit2Available = false;
      errors.push(`Permit2 builder error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      // Test EIP-2612 builder
      const eip2612Test = this.eip2612Builder.createEIP2612SignatureRequest({
        owner: '0x0000000000000000000000000000000000000000',
        spender: '0x0000000000000000000000000000000000000000',
        value: '1000000000000000000',
      });
      
      if (!eip2612Test.typedData || !eip2612Test.messageHash) {
        eip2612Available = false;
        errors.push('EIP-2612 builder test failed');
      }
    } catch (error) {
      eip2612Available = false;
      errors.push(`EIP-2612 builder error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const status = (permit2Available && eip2612Available) ? 'healthy' : 
                  (permit2Available || eip2612Available) ? 'degraded' : 'unhealthy';

    return {
      status,
      permit2Available,
      eip2612Available,
      errors,
    };
  }
}
