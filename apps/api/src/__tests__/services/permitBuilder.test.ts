/**
 * Unit tests for unified permit builder service
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PermitBuilderService, PermitRequest, PermitResponse } from '../../services/permitBuilder.js';
import { ChainId } from '../../types/policy.js';

describe('PermitBuilderService', () => {
  let permitBuilderService: PermitBuilderService;

  beforeEach(() => {
    permitBuilderService = new PermitBuilderService(ChainId.LOCAL_TESTNET, 300);
  });

  describe('Permit Building', () => {
    it('should build Permit2 permit', async () => {
      const request: PermitRequest = {
        token: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amount: '1000000000000000000',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        owner: '0x1234567890123456789012345678901234567890',
        permitType: 'PERMIT2',
        chainId: ChainId.LOCAL_TESTNET,
        ttl: 300,
      };

      const response = await permitBuilderService.buildPermit(request);

      expect(response.permitType).toBe('PERMIT2');
      expect(response.typedData).toBeDefined();
      expect(response.messageHash).toMatch(/^0x[a-f0-9]{64}$/);
      expect(response.nonce).toMatch(/^\d+$/);
      expect(response.deadline).toBeGreaterThan(Math.floor(Date.now() / 1000));
      expect(response.ttl).toBe(300);
      expect(response.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should build EIP-2612 permit', async () => {
      const request: PermitRequest = {
        token: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amount: '1000000000000000000',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        owner: '0x1234567890123456789012345678901234567890',
        permitType: 'EIP2612',
        chainId: ChainId.LOCAL_TESTNET,
        ttl: 300,
      };

      const response = await permitBuilderService.buildPermit(request);

      expect(response.permitType).toBe('EIP2612');
      expect(response.typedData).toBeDefined();
      expect(response.messageHash).toMatch(/^0x[a-f0-9]{64}$/);
      expect(response.nonce).toMatch(/^\d+$/);
      expect(response.deadline).toBeGreaterThan(Math.floor(Date.now() / 1000));
      expect(response.ttl).toBe(300);
      expect(response.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should throw error for unsupported permit type', async () => {
      const request: PermitRequest = {
        token: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amount: '1000000000000000000',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        owner: '0x1234567890123456789012345678901234567890',
        permitType: 'UNSUPPORTED' as any,
        chainId: ChainId.LOCAL_TESTNET,
        ttl: 300,
      };

      await expect(permitBuilderService.buildPermit(request)).rejects.toThrow('Unsupported permit type');
    });
  });

  describe('Permit Validation', () => {
    it('should validate Permit2 data', async () => {
      const permitData = {
        permitted: {
          token: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
          amount: '1000000000000000000',
        },
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        nonce: '123',
        deadline: Math.floor(Date.now() / 1000) + 300,
      };

      const validation = await permitBuilderService.validatePermit(permitData, 'PERMIT2');

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate EIP-2612 data', async () => {
      const permitData = {
        owner: '0x1234567890123456789012345678901234567890',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        value: '1000000000000000000',
        nonce: '123',
        deadline: Math.floor(Date.now() / 1000) + 300,
      };

      const validation = await permitBuilderService.validatePermit(permitData, 'EIP2612');

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid Permit2 data', async () => {
      const permitData = {
        permitted: {
          token: 'invalid_address',
          amount: '1000000000000000000',
        },
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        nonce: '123',
        deadline: Math.floor(Date.now() / 1000) + 300,
      };

      const validation = await permitBuilderService.validatePermit(permitData, 'PERMIT2');

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid token address');
    });

    it('should reject invalid EIP-2612 data', async () => {
      const permitData = {
        owner: 'invalid_address',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        value: '1000000000000000000',
        nonce: '123',
        deadline: Math.floor(Date.now() / 1000) + 300,
      };

      const validation = await permitBuilderService.validatePermit(permitData, 'EIP2612');

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid owner address');
    });

    it('should generate warnings for large amounts', async () => {
      const permitData = {
        permitted: {
          token: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
          amount: '1000000000000000000000000000000000000000000000000000000', // Very large amount
        },
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        nonce: '123',
        deadline: Math.floor(Date.now() / 1000) + 300,
      };

      const validation = await permitBuilderService.validatePermit(permitData, 'PERMIT2');

      expect(validation.valid).toBe(true);
      expect(validation.warnings).toContain('Amount is very large, please verify this is correct');
    });

    it('should generate warnings for far future deadlines', async () => {
      const permitData = {
        permitted: {
          token: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
          amount: '1000000000000000000',
        },
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        nonce: '123',
        deadline: Math.floor(Date.now() / 1000) + (25 * 60 * 60), // 25 hours
      };

      const validation = await permitBuilderService.validatePermit(permitData, 'PERMIT2');

      expect(validation.valid).toBe(true);
      expect(validation.warnings).toContain('Deadline is more than 24 hours in the future');
    });
  });

  describe('Permit Type Recommendation', () => {
    it('should recommend EIP-2612 for supported tokens', async () => {
      const usdcAddress = '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C';
      const permitType = await permitBuilderService.getRecommendedPermitType(usdcAddress);

      expect(permitType).toBe('EIP2612');
    });

    it('should recommend Permit2 for unsupported tokens', async () => {
      const unknownAddress = '0x1234567890123456789012345678901234567890';
      const permitType = await permitBuilderService.getRecommendedPermitType(unknownAddress);

      expect(permitType).toBe('PERMIT2');
    });
  });

  describe('Permit Expiry Management', () => {
    it('should check if permit is expired', () => {
      const futureDeadline = Math.floor(Date.now() / 1000) + 300;
      const pastDeadline = Math.floor(Date.now() / 1000) - 100;

      expect(permitBuilderService.isPermitExpired(futureDeadline)).toBe(false);
      expect(permitBuilderService.isPermitExpired(pastDeadline)).toBe(true);
    });

    it('should calculate time until expiry', () => {
      const deadline = Math.floor(Date.now() / 1000) + 300;
      const timeUntilExpiry = permitBuilderService.getTimeUntilExpiry(deadline);

      expect(timeUntilExpiry).toBeGreaterThan(0);
      expect(timeUntilExpiry).toBeLessThanOrEqual(300);
    });

    it('should return zero for expired permits', () => {
      const pastDeadline = Math.floor(Date.now() / 1000) - 100;
      const timeUntilExpiry = permitBuilderService.getTimeUntilExpiry(pastDeadline);

      expect(timeUntilExpiry).toBe(0);
    });
  });

  describe('Permit Request Creation', () => {
    it('should create permit request with recommended type', async () => {
      const params = {
        token: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amount: '1000000000000000000',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        owner: '0x1234567890123456789012345678901234567890',
        ttl: 600,
      };

      const request = await permitBuilderService.createPermitRequest(params);

      expect(request.token).toBe(params.token);
      expect(request.amount).toBe(params.amount);
      expect(request.spender).toBe(params.spender);
      expect(request.owner).toBe(params.owner);
      expect(request.chainId).toBe(ChainId.LOCAL_TESTNET);
      expect(request.ttl).toBe(600);
      expect(['PERMIT2', 'EIP2612']).toContain(request.permitType);
    });

    it('should use default TTL when not specified', async () => {
      const params = {
        token: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amount: '1000000000000000000',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        owner: '0x1234567890123456789012345678901234567890',
      };

      const request = await permitBuilderService.createPermitRequest(params);

      expect(request.ttl).toBe(300); // Default TTL
    });
  });

  describe('Builder Access', () => {
    it('should get Permit2 builder', () => {
      const builder = permitBuilderService.getPermitBuilder('PERMIT2') as any;

      expect(builder).toBeDefined();
      expect(typeof builder.createPermit2SignatureRequest).toBe('function');
    });

    it('should get EIP-2612 builder', () => {
      const builder = permitBuilderService.getPermitBuilder('EIP2612') as any;

      expect(builder).toBeDefined();
      expect(typeof builder.createEIP2612SignatureRequest).toBe('function');
    });

    it('should throw error for unsupported builder type', () => {
      expect(() => {
        permitBuilderService.getPermitBuilder('UNSUPPORTED' as any);
      }).toThrow('Unsupported permit type');
    });
  });

  describe('Configuration Management', () => {
    it('should get chain information', () => {
      const chainInfo = permitBuilderService.getChainInfo();

      expect(chainInfo.chainId).toBe(ChainId.LOCAL_TESTNET);
      expect(chainInfo.ttl).toBe(300);
    });

    it('should update TTL', () => {
      permitBuilderService.updateTTL(600);

      const chainInfo = permitBuilderService.getChainInfo();
      expect(chainInfo.ttl).toBe(600);
    });

    it('should reject invalid TTL values', () => {
      expect(() => permitBuilderService.updateTTL(0)).toThrow('TTL must be between 1 and 86400 seconds');
      expect(() => permitBuilderService.updateTTL(86401)).toThrow('TTL must be between 1 and 86400 seconds');
    });

    it('should get supported permit types', () => {
      const supportedTypes = permitBuilderService.getSupportedPermitTypes();

      expect(supportedTypes).toContain('PERMIT2');
      expect(supportedTypes).toContain('EIP2612');
      expect(supportedTypes).toHaveLength(2);
    });
  });

  describe('Health Check', () => {
    it('should perform health check', async () => {
      const health = await permitBuilderService.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.permit2Available).toBe(true);
      expect(health.eip2612Available).toBe(true);
      expect(health.errors).toHaveLength(0);
    });

    it('should handle builder errors gracefully', async () => {
      // Mock a builder error
      const permit2Builder = permitBuilderService.getPermitBuilder('PERMIT2') as any;
      const originalCreatePermit2SignatureRequest = permit2Builder.createPermit2SignatureRequest;
      permit2Builder.createPermit2SignatureRequest = jest.fn().mockImplementation(() => {
        throw new Error('Permit2 builder error');
      });

      const health = await permitBuilderService.healthCheck();

      expect(health.status).toBe('degraded');
      expect(health.permit2Available).toBe(false);
      expect(health.eip2612Available).toBe(true);
      expect(health.errors.length).toBeGreaterThan(0);

      // Restore original function
      permit2Builder.createPermit2SignatureRequest = originalCreatePermit2SignatureRequest;
    });
  });

  describe('Edge Cases', () => {
    it('should handle very short TTL', () => {
      const shortTTLService = new PermitBuilderService(ChainId.LOCAL_TESTNET, 1);

      const request: PermitRequest = {
        token: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amount: '1000000000000000000',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        owner: '0x1234567890123456789012345678901234567890',
        permitType: 'PERMIT2',
        chainId: ChainId.LOCAL_TESTNET,
        ttl: 1,
      };

      return expect(shortTTLService.buildPermit(request)).resolves.toBeDefined();
    });

    it('should handle very long TTL', () => {
      const longTTLService = new PermitBuilderService(ChainId.LOCAL_TESTNET, 86400);

      const request: PermitRequest = {
        token: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amount: '1000000000000000000',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        owner: '0x1234567890123456789012345678901234567890',
        permitType: 'EIP2612',
        chainId: ChainId.LOCAL_TESTNET,
        ttl: 86400,
      };

      return expect(longTTLService.buildPermit(request)).resolves.toBeDefined();
    });

    it('should handle different chains', () => {
      const ethereumService = new PermitBuilderService(ChainId.ETHEREUM, 300);
      const arbitrumService = new PermitBuilderService(ChainId.ARBITRUM, 300);

      expect(ethereumService.getChainInfo().chainId).toBe(ChainId.ETHEREUM);
      expect(arbitrumService.getChainInfo().chainId).toBe(ChainId.ARBITRUM);
    });
  });
});
