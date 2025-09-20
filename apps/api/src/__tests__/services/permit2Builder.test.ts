/**
 * Unit tests for Permit2 builder
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Permit2Builder, Permit2Data } from '../../services/permit2Builder.js';
import { ChainId } from '../../types/policy.js';

describe('Permit2Builder', () => {
  let permit2Builder: Permit2Builder;

  beforeEach(() => {
    permit2Builder = Permit2Builder.createForChain(ChainId.LOCAL_TESTNET, 300);
  });

  describe('Permit2 Typed Data Building', () => {
    it('should build valid Permit2 typed data', () => {
      const params = {
        token: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amount: '1000000000000000000',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        nonce: '123',
        userAddress: '0x1234567890123456789012345678901234567890',
      };

      const typedData = permit2Builder.buildPermit2TypedData(params);

      expect(typedData.domain.name).toBe('Permit2');
      expect(typedData.domain.version).toBe('1');
      expect(typedData.domain.chainId).toBe(ChainId.LOCAL_TESTNET);
      expect(typedData.domain.verifyingContract).toBeDefined();
      expect(typedData.primaryType).toBe('PermitSingle');
      expect(typedData.message.details.token).toBe(params.token);
      expect(typedData.message.details.amount).toBe(params.amount);
      expect(typedData.message.spender).toBe(params.spender);
    });

    it('should include correct deadline in typed data', () => {
      const params = {
        token: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amount: '1000000000000000000',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        nonce: '123',
        userAddress: '0x1234567890123456789012345678901234567890',
      };

      const beforeTime = Math.floor(Date.now() / 1000);
      const typedData = permit2Builder.buildPermit2TypedData(params);
      const afterTime = Math.floor(Date.now() / 1000);

      expect(typedData.message.sigDeadline).toBeGreaterThanOrEqual(beforeTime + 300);
      expect(typedData.message.sigDeadline).toBeLessThanOrEqual(afterTime + 300);
      expect(typedData.message.details.expiration).toBe(typedData.message.sigDeadline);
    });

    it('should have correct EIP712 domain structure', () => {
      const params = {
        token: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amount: '1000000000000000000',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        nonce: '123',
        userAddress: '0x1234567890123456789012345678901234567890',
      };

      const typedData = permit2Builder.buildPermit2TypedData(params);

      expect(typedData.types.EIP712Domain).toHaveLength(4);
      expect(typedData.types.EIP712Domain[0].name).toBe('name');
      expect(typedData.types.EIP712Domain[0].type).toBe('string');
      expect(typedData.types.PermitDetails).toHaveLength(4);
      expect(typedData.types.PermitSingle).toHaveLength(3);
    });
  });

  describe('Hash Calculation', () => {
    it('should calculate consistent hashes for same input', () => {
      const params = {
        token: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amount: '1000000000000000000',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        nonce: '123',
        userAddress: '0x1234567890123456789012345678901234567890',
      };

      const typedData1 = permit2Builder.buildPermit2TypedData(params);
      const typedData2 = permit2Builder.buildPermit2TypedData(params);

      const hash1 = permit2Builder.calculatePermit2Hash(typedData1);
      const hash2 = permit2Builder.calculatePermit2Hash(typedData2);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('should calculate different hashes for different inputs', () => {
      const params1 = {
        token: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amount: '1000000000000000000',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        nonce: '123',
        userAddress: '0x1234567890123456789012345678901234567890',
      };

      const params2 = {
        ...params1,
        amount: '2000000000000000000', // Different amount
      };

      const typedData1 = permit2Builder.buildPermit2TypedData(params1);
      const typedData2 = permit2Builder.buildPermit2TypedData(params2);

      const hash1 = permit2Builder.calculatePermit2Hash(typedData1);
      const hash2 = permit2Builder.calculatePermit2Hash(typedData2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Data Validation', () => {
    it('should validate correct Permit2 data', () => {
      const validData: Permit2Data = {
        permitted: {
          token: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
          amount: '1000000000000000000',
        },
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        nonce: '123',
        deadline: Math.floor(Date.now() / 1000) + 300,
      };

      const validation = permit2Builder.validatePermit2Data(validData);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid token address', () => {
      const invalidData: Permit2Data = {
        permitted: {
          token: 'invalid_address',
          amount: '1000000000000000000',
        },
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        nonce: '123',
        deadline: Math.floor(Date.now() / 1000) + 300,
      };

      const validation = permit2Builder.validatePermit2Data(invalidData);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid token address');
    });

    it('should reject invalid spender address', () => {
      const invalidData: Permit2Data = {
        permitted: {
          token: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
          amount: '1000000000000000000',
        },
        spender: 'invalid_address',
        nonce: '123',
        deadline: Math.floor(Date.now() / 1000) + 300,
      };

      const validation = permit2Builder.validatePermit2Data(invalidData);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid spender address');
    });

    it('should reject invalid amount', () => {
      const invalidData: Permit2Data = {
        permitted: {
          token: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
          amount: '0', // Invalid amount
        },
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        nonce: '123',
        deadline: Math.floor(Date.now() / 1000) + 300,
      };

      const validation = permit2Builder.validatePermit2Data(invalidData);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid amount');
    });

    it('should reject expired deadline', () => {
      const invalidData: Permit2Data = {
        permitted: {
          token: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
          amount: '1000000000000000000',
        },
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        nonce: '123',
        deadline: Math.floor(Date.now() / 1000) - 100, // Expired
      };

      const validation = permit2Builder.validatePermit2Data(invalidData);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Deadline must be in the future');
    });

    it('should reject deadline exceeding TTL', () => {
      const invalidData: Permit2Data = {
        permitted: {
          token: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
          amount: '1000000000000000000',
        },
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        nonce: '123',
        deadline: Math.floor(Date.now() / 1000) + 1000, // Exceeds 300s TTL
      };

      const validation = permit2Builder.validatePermit2Data(invalidData);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Deadline exceeds maximum TTL of 300 seconds');
    });
  });

  describe('Signature Request Creation', () => {
    it('should create valid signature request', () => {
      const params = {
        token: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amount: '1000000000000000000',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        userAddress: '0x1234567890123456789012345678901234567890',
      };

      const signatureRequest = permit2Builder.createPermit2SignatureRequest(params);

      expect(signatureRequest.typedData).toBeDefined();
      expect(signatureRequest.messageHash).toMatch(/^0x[a-f0-9]{64}$/);
      expect(signatureRequest.nonce).toMatch(/^\d+$/);
      expect(signatureRequest.deadline).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should generate unique nonces for different requests', () => {
      const params = {
        token: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amount: '1000000000000000000',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        userAddress: '0x1234567890123456789012345678901234567890',
      };

      const request1 = permit2Builder.createPermit2SignatureRequest(params);
      const request2 = permit2Builder.createPermit2SignatureRequest(params);

      expect(request1.nonce).not.toBe(request2.nonce);
      expect(request1.messageHash).not.toBe(request2.messageHash);
    });
  });

  describe('Chain Support', () => {
    it('should get Permit2 address for different chains', () => {
      const ethereumAddress = Permit2Builder.getPermit2Address(ChainId.ETHEREUM);
      const arbitrumAddress = Permit2Builder.getPermit2Address(ChainId.ARBITRUM);
      const localAddress = Permit2Builder.getPermit2Address(ChainId.LOCAL_TESTNET);

      expect(ethereumAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(arbitrumAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(localAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should create builder for different chains', () => {
      const ethereumBuilder = Permit2Builder.createForChain(ChainId.ETHEREUM, 600);
      const arbitrumBuilder = Permit2Builder.createForChain(ChainId.ARBITRUM, 300);

      expect(ethereumBuilder).toBeInstanceOf(Permit2Builder);
      expect(arbitrumBuilder).toBeInstanceOf(Permit2Builder);
    });
  });

  describe('Mock Contract Interactions', () => {
    it('should get nonce for user and token', async () => {
      const nonce = await permit2Builder.getNonce(
        '0x1234567890123456789012345678901234567890',
        '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C'
      );

      expect(nonce).toMatch(/^\d+$/);
      expect(parseInt(nonce)).toBeGreaterThanOrEqual(0);
    });

    it('should check permit approval status', async () => {
      const isApproved = await permit2Builder.isPermit2Approved(
        '0x1234567890123456789012345678901234567890',
        '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        '1000000000000000000'
      );

      expect(typeof isApproved).toBe('boolean');
    });

    it('should get permit allowance', async () => {
      const allowance = await permit2Builder.getPermit2Allowance(
        '0x1234567890123456789012345678901234567890',
        '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
      );

      expect(allowance).toMatch(/^\d+$/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large amounts', () => {
      const params = {
        token: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amount: '1000000000000000000000000000000000000000000000000000000', // Very large amount
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        nonce: '123',
        userAddress: '0x1234567890123456789012345678901234567890',
      };

      const typedData = permit2Builder.buildPermit2TypedData(params);
      const hash = permit2Builder.calculatePermit2Hash(typedData);

      expect(typedData.message.details.amount).toBe(params.amount);
      expect(hash).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('should handle zero nonce', () => {
      const params = {
        token: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amount: '1000000000000000000',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        nonce: '0',
        userAddress: '0x1234567890123456789012345678901234567890',
      };

      const typedData = permit2Builder.buildPermit2TypedData(params);
      const hash = permit2Builder.calculatePermit2Hash(typedData);

      expect(typedData.message.details.nonce).toBe(0);
      expect(hash).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('should handle different TTL values', () => {
      const shortTTLBuilder = Permit2Builder.createForChain(ChainId.LOCAL_TESTNET, 60);
      const longTTLBuilder = Permit2Builder.createForChain(ChainId.LOCAL_TESTNET, 3600);

      const params = {
        token: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        amount: '1000000000000000000',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        userAddress: '0x1234567890123456789012345678901234567890',
      };

      const shortRequest = shortTTLBuilder.createPermit2SignatureRequest(params);
      const longRequest = longTTLBuilder.createPermit2SignatureRequest(params);

      expect(shortRequest.deadline).toBeLessThan(longRequest.deadline);
      expect(shortRequest.deadline - Math.floor(Date.now() / 1000)).toBeLessThanOrEqual(60);
      expect(longRequest.deadline - Math.floor(Date.now() / 1000)).toBeLessThanOrEqual(3600);
    });
  });
});
