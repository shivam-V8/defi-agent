/**
 * Unit tests for EIP-2612 builder
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { EIP2612Builder, EIP2612Data } from '../../services/eip2612Builder.js';
import { ChainId } from '../../types/policy.js';

describe('EIP2612Builder', () => {
  let eip2612Builder: EIP2612Builder;

  beforeEach(() => {
    eip2612Builder = EIP2612Builder.createForToken(
      '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C', // USDC
      ChainId.LOCAL_TESTNET,
      300
    );
  });

  describe('EIP-2612 Typed Data Building', () => {
    it('should build valid EIP-2612 typed data', () => {
      const params = {
        owner: '0x1234567890123456789012345678901234567890',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        value: '1000000000000000000',
        nonce: '123',
      };

      const typedData = eip2612Builder.buildEIP2612TypedData(params);

      expect(typedData.domain.name).toBe('USD Coin');
      expect(typedData.domain.version).toBe('2');
      expect(typedData.domain.chainId).toBe(ChainId.LOCAL_TESTNET);
      expect(typedData.domain.verifyingContract).toBe('0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C');
      expect(typedData.primaryType).toBe('Permit');
      expect(typedData.message.owner).toBe(params.owner);
      expect(typedData.message.spender).toBe(params.spender);
      expect(typedData.message.value).toBe(params.value);
    });

    it('should include correct deadline in typed data', () => {
      const params = {
        owner: '0x1234567890123456789012345678901234567890',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        value: '1000000000000000000',
        nonce: '123',
      };

      const beforeTime = Math.floor(Date.now() / 1000);
      const typedData = eip2612Builder.buildEIP2612TypedData(params);
      const afterTime = Math.floor(Date.now() / 1000);

      expect(typedData.message.deadline).toBeGreaterThanOrEqual(beforeTime + 300);
      expect(typedData.message.deadline).toBeLessThanOrEqual(afterTime + 300);
    });

    it('should have correct EIP712 domain structure', () => {
      const params = {
        owner: '0x1234567890123456789012345678901234567890',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        value: '1000000000000000000',
        nonce: '123',
      };

      const typedData = eip2612Builder.buildEIP2612TypedData(params);

      expect(typedData.types.EIP712Domain).toHaveLength(4);
      expect(typedData.types.EIP712Domain[0].name).toBe('name');
      expect(typedData.types.EIP712Domain[0].type).toBe('string');
      expect(typedData.types.Permit).toHaveLength(5);
    });
  });

  describe('Hash Calculation', () => {
    it('should calculate consistent hashes for same input', () => {
      const params = {
        owner: '0x1234567890123456789012345678901234567890',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        value: '1000000000000000000',
        nonce: '123',
      };

      const typedData1 = eip2612Builder.buildEIP2612TypedData(params);
      const typedData2 = eip2612Builder.buildEIP2612TypedData(params);

      const hash1 = eip2612Builder.calculateEIP2612Hash(typedData1);
      const hash2 = eip2612Builder.calculateEIP2612Hash(typedData2);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('should calculate different hashes for different inputs', () => {
      const params1 = {
        owner: '0x1234567890123456789012345678901234567890',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        value: '1000000000000000000',
        nonce: '123',
      };

      const params2 = {
        ...params1,
        value: '2000000000000000000', // Different value
      };

      const typedData1 = eip2612Builder.buildEIP2612TypedData(params1);
      const typedData2 = eip2612Builder.buildEIP2612TypedData(params2);

      const hash1 = eip2612Builder.calculateEIP2612Hash(typedData1);
      const hash2 = eip2612Builder.calculateEIP2612Hash(typedData2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Data Validation', () => {
    it('should validate correct EIP-2612 data', () => {
      const validData: EIP2612Data = {
        owner: '0x1234567890123456789012345678901234567890',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        value: '1000000000000000000',
        nonce: '123',
        deadline: Math.floor(Date.now() / 1000) + 300,
      };

      const validation = eip2612Builder.validateEIP2612Data(validData);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid owner address', () => {
      const invalidData: EIP2612Data = {
        owner: 'invalid_address',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        value: '1000000000000000000',
        nonce: '123',
        deadline: Math.floor(Date.now() / 1000) + 300,
      };

      const validation = eip2612Builder.validateEIP2612Data(invalidData);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid owner address');
    });

    it('should reject invalid spender address', () => {
      const invalidData: EIP2612Data = {
        owner: '0x1234567890123456789012345678901234567890',
        spender: 'invalid_address',
        value: '1000000000000000000',
        nonce: '123',
        deadline: Math.floor(Date.now() / 1000) + 300,
      };

      const validation = eip2612Builder.validateEIP2612Data(invalidData);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid spender address');
    });

    it('should reject invalid value', () => {
      const invalidData: EIP2612Data = {
        owner: '0x1234567890123456789012345678901234567890',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        value: '0', // Invalid value
        nonce: '123',
        deadline: Math.floor(Date.now() / 1000) + 300,
      };

      const validation = eip2612Builder.validateEIP2612Data(invalidData);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid value');
    });

    it('should reject expired deadline', () => {
      const invalidData: EIP2612Data = {
        owner: '0x1234567890123456789012345678901234567890',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        value: '1000000000000000000',
        nonce: '123',
        deadline: Math.floor(Date.now() / 1000) - 100, // Expired
      };

      const validation = eip2612Builder.validateEIP2612Data(invalidData);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Deadline must be in the future');
    });

    it('should reject deadline exceeding TTL', () => {
      const invalidData: EIP2612Data = {
        owner: '0x1234567890123456789012345678901234567890',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        value: '1000000000000000000',
        nonce: '123',
        deadline: Math.floor(Date.now() / 1000) + 1000, // Exceeds 300s TTL
      };

      const validation = eip2612Builder.validateEIP2612Data(invalidData);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Deadline exceeds maximum TTL of 300 seconds');
    });
  });

  describe('Signature Request Creation', () => {
    it('should create valid signature request', () => {
      const params = {
        owner: '0x1234567890123456789012345678901234567890',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        value: '1000000000000000000',
      };

      const signatureRequest = eip2612Builder.createEIP2612SignatureRequest(params);

      expect(signatureRequest.typedData).toBeDefined();
      expect(signatureRequest.messageHash).toMatch(/^0x[a-f0-9]{64}$/);
      expect(signatureRequest.nonce).toMatch(/^\d+$/);
      expect(signatureRequest.deadline).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should generate unique nonces for different requests', () => {
      const params = {
        owner: '0x1234567890123456789012345678901234567890',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        value: '1000000000000000000',
      };

      const request1 = eip2612Builder.createEIP2612SignatureRequest(params);
      const request2 = eip2612Builder.createEIP2612SignatureRequest(params);

      expect(request1.nonce).not.toBe(request2.nonce);
      expect(request1.messageHash).not.toBe(request2.messageHash);
    });
  });

  describe('Token Support', () => {
    it('should check if token supports EIP-2612', async () => {
      const usdcAddress = '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C';
      const unknownAddress = '0x1234567890123456789012345678901234567890';

      const usdcSupport = await eip2612Builder.supportsEIP2612(usdcAddress);
      const unknownSupport = await eip2612Builder.supportsEIP2612(unknownAddress);

      expect(usdcSupport).toBe(true);
      expect(unknownSupport).toBe(false);
    });

    it('should get token metadata for different chains', () => {
      const usdcAddress = '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C';
      const usdtAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

      const usdcMetadata = EIP2612Builder.getTokenMetadata(usdcAddress, ChainId.ETHEREUM);
      const usdtMetadata = EIP2612Builder.getTokenMetadata(usdtAddress, ChainId.ETHEREUM);

      expect(usdcMetadata.name).toBe('USD Coin');
      expect(usdcMetadata.version).toBe('2');
      expect(usdtMetadata.name).toBe('Tether USD');
      expect(usdtMetadata.version).toBe('2');
    });

    it('should create builder for different tokens', () => {
      const usdcBuilder = EIP2612Builder.createForToken(
        '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        ChainId.ETHEREUM,
        600
      );
      const usdtBuilder = EIP2612Builder.createForToken(
        '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        ChainId.ETHEREUM,
        300
      );

      expect(usdcBuilder).toBeInstanceOf(EIP2612Builder);
      expect(usdtBuilder).toBeInstanceOf(EIP2612Builder);
    });
  });

  describe('Mock Contract Interactions', () => {
    it('should get token nonce for user', async () => {
      const nonce = await eip2612Builder.getTokenNonce(
        '0x1234567890123456789012345678901234567890'
      );

      expect(nonce).toMatch(/^\d+$/);
      expect(parseInt(nonce)).toBeGreaterThanOrEqual(0);
    });

    it('should get token allowance', async () => {
      const allowance = await eip2612Builder.getTokenAllowance(
        '0x1234567890123456789012345678901234567890',
        '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
      );

      expect(allowance).toMatch(/^\d+$/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large values', () => {
      const params = {
        owner: '0x1234567890123456789012345678901234567890',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        value: '1000000000000000000000000000000000000000000000000000000', // Very large value
        nonce: '123',
      };

      const typedData = eip2612Builder.buildEIP2612TypedData(params);
      const hash = eip2612Builder.calculateEIP2612Hash(typedData);

      expect(typedData.message.value).toBe(params.value);
      expect(hash).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('should handle zero nonce', () => {
      const params = {
        owner: '0x1234567890123456789012345678901234567890',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        value: '1000000000000000000',
        nonce: '0',
      };

      const typedData = eip2612Builder.buildEIP2612TypedData(params);
      const hash = eip2612Builder.calculateEIP2612Hash(typedData);

      expect(typedData.message.nonce).toBe('0');
      expect(hash).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('should handle different TTL values', () => {
      const shortTTLBuilder = EIP2612Builder.createForToken(
        '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        ChainId.LOCAL_TESTNET,
        60
      );
      const longTTLBuilder = EIP2612Builder.createForToken(
        '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C',
        ChainId.LOCAL_TESTNET,
        3600
      );

      const params = {
        owner: '0x1234567890123456789012345678901234567890',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        value: '1000000000000000000',
      };

      const shortRequest = shortTTLBuilder.createEIP2612SignatureRequest(params);
      const longRequest = longTTLBuilder.createEIP2612SignatureRequest(params);

      expect(shortRequest.deadline).toBeLessThan(longRequest.deadline);
      expect(shortRequest.deadline - Math.floor(Date.now() / 1000)).toBeLessThanOrEqual(60);
      expect(longRequest.deadline - Math.floor(Date.now() / 1000)).toBeLessThanOrEqual(3600);
    });

    it('should handle different token versions', () => {
      const daiBuilder = EIP2612Builder.createForToken(
        '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
        ChainId.ETHEREUM,
        300
      );

      const params = {
        owner: '0x1234567890123456789012345678901234567890',
        spender: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        value: '1000000000000000000',
        nonce: '123',
      };

      const typedData = daiBuilder.buildEIP2612TypedData(params);

      expect(typedData.domain.name).toBe('Dai Stablecoin');
      expect(typedData.domain.version).toBe('1');
    });
  });
});
