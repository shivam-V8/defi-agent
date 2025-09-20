'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useSignTypedData, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { QuoteResponse, TxParamsResponse } from './use-quote';
// Import types from the types package
const AGENT_EXECUTOR_ADDRESSES = {
  1: '0x0000000000000000000000000000000000000000',
  42161: '0x0000000000000000000000000000000000000000',
  10: '0x0000000000000000000000000000000000000000',
  11155111: '0x0000000000000000000000000000000000000000',
  421614: '0x0000000000000000000000000000000000000000',
  11155420: '0x0000000000000000000000000000000000000000',
  31337: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
} as const;
import { toast } from 'sonner';

// Permit2 domain and types for EIP-712 signing
const PERMIT2_DOMAIN = {
  name: 'Permit2',
  version: '1',
  chainId: 1, // Will be updated dynamically
  verifyingContract: '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const,
};

const PERMIT2_TYPES = {
  PermitTransferFrom: [
    { name: 'permitted', type: 'TokenPermissions' },
    { name: 'spender', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
  TokenPermissions: [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ],
} as const;

// AgentExecutor contract ABI (simplified)
const AGENT_EXECUTOR_ABI = [
  {
    name: 'executeSwapWithPermit2',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'minReceived', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'routerType', type: 'uint256' },
      { name: 'swapCalldata', type: 'bytes' },
      { name: 'permit2Data', type: 'bytes' },
    ],
    outputs: [],
  },
] as const;

export interface ExecutionState {
  isSigning: boolean;
  isExecuting: boolean;
  isWaiting: boolean;
  transactionHash?: string;
  success: boolean;
  error?: string;
}

export function useExecution() {
  const { address } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const { writeContractAsync } = useWriteContract();
  const [executionState, setExecutionState] = useState<ExecutionState>({
    isSigning: false,
    isExecuting: false,
    isWaiting: false,
    success: false,
  });

  const { data: receipt, isLoading: isWaiting } = useWaitForTransactionReceipt({
    hash: executionState.transactionHash as `0x${string}` | undefined,
  });

  // Handle transaction success
  useEffect(() => {
    if (receipt && receipt.status === 'success') {
      setExecutionState(prev => ({
        ...prev,
        isWaiting: false,
        success: true,
      }));
      toast.success('Swap executed successfully!');
    } else if (receipt && receipt.status === 'reverted') {
      setExecutionState(prev => ({
        ...prev,
        isWaiting: false,
        success: false,
        error: 'Transaction reverted',
      }));
      toast.error('Transaction failed');
    }
  }, [receipt]);

  const executeSwap = useCallback(async (
    quote: QuoteResponse,
    txParams: TxParamsResponse,
    chainId: number
  ) => {
    if (!address || !quote || !txParams) {
      toast.error('Missing required data for execution');
      return;
    }

    try {
      setExecutionState({
        isSigning: true,
        isExecuting: false,
        isWaiting: false,
        success: false,
      });

      // Get AgentExecutor address for the chain
      const agentExecutorAddress = AGENT_EXECUTOR_ADDRESSES[chainId as keyof typeof AGENT_EXECUTOR_ADDRESSES];
      if (!agentExecutorAddress || agentExecutorAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error(`AgentExecutor not deployed on chain ${chainId}`);
      }

      // Step 1: Sign Permit2 permit
      const permit2Data = await signPermit2(
        quote.bestRoute.tokenIn,
        quote.bestRoute.amountIn,
        quote.bestRoute.deadline,
        chainId,
        agentExecutorAddress
      );

      setExecutionState(prev => ({
        ...prev,
        isSigning: false,
        isExecuting: true,
      }));

      // Step 2: Execute swap via AgentExecutor
      const hash = await executeSwapTransaction(
        quote,
        txParams,
        permit2Data,
        chainId
      );

      setExecutionState(prev => ({
        ...prev,
        isExecuting: false,
        isWaiting: true,
        transactionHash: hash,
      }));

      toast.success('Transaction submitted! Waiting for confirmation...');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Execution failed';
      setExecutionState({
        isSigning: false,
        isExecuting: false,
        isWaiting: false,
        success: false,
        error: errorMessage,
      });
      toast.error(errorMessage);
      console.error('Execution error:', error);
    }
  }, [address, signTypedDataAsync, writeContractAsync]);

  const signPermit2 = useCallback(async (
    tokenAddress: string,
    amount: string,
    deadline: number,
    chainId: number,
    agentExecutorAddress: string
  ) => {
    if (!address) throw new Error('No wallet connected');

    const domain = {
      ...PERMIT2_DOMAIN,
      chainId,
    };

    const message = {
      permitted: {
        token: tokenAddress as `0x${string}`,
        amount: BigInt(amount),
      },
      spender: agentExecutorAddress as `0x${string}`,
      nonce: BigInt(Math.floor(Math.random() * 1000000)), // Random nonce for demo
      deadline: BigInt(deadline),
    };

    const signature = await signTypedDataAsync({
      domain,
      types: PERMIT2_TYPES,
      primaryType: 'PermitTransferFrom',
      message,
    });

    // Parse signature into v, r, s
    const sig = signature.slice(2);
    const r = '0x' + sig.slice(0, 64);
    const s = '0x' + sig.slice(64, 128);
    const v = parseInt(sig.slice(128, 130), 16);

    // Encode permit2 data
    return {
      token: tokenAddress,
      amount: BigInt(amount),
      deadline: BigInt(deadline),
      v,
      r,
      s,
    };
  }, [address, signTypedDataAsync]);

  const executeSwapTransaction = useCallback(async (
    quote: QuoteResponse,
    txParams: TxParamsResponse,
    permit2Data: any,
    chainId: number
  ) => {
    if (!address) throw new Error('No wallet connected');

    // Get AgentExecutor address for the chain
    const agentExecutorAddress = AGENT_EXECUTOR_ADDRESSES[chainId as keyof typeof AGENT_EXECUTOR_ADDRESSES];
    if (!agentExecutorAddress || agentExecutorAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error(`AgentExecutor not deployed on chain ${chainId}. Please switch to Local Testnet (chain 31337) for testing.`);
    }

    // Encode permit2 data for contract call
    const permit2Encoded = encodePermit2Data(permit2Data);

    // Get router type from quote
    const routerType = getRouterType(quote.bestRoute.routerType);

    // Call AgentExecutor
    const hash = await writeContractAsync({
      address: agentExecutorAddress as `0x${string}`,
      abi: AGENT_EXECUTOR_ABI,
      functionName: 'executeSwapWithPermit2',
      args: [
        quote.bestRoute.tokenIn as `0x${string}`,
        quote.bestRoute.tokenOut as `0x${string}`,
        BigInt(quote.bestRoute.amountIn),
        BigInt(quote.bestRoute.minReceived),
        BigInt(quote.bestRoute.deadline),
        BigInt(routerType),
        txParams.data as `0x${string}`,
        permit2Encoded as `0x${string}`,
      ],
    });

    return hash;
  }, [address, writeContractAsync]);

  const resetExecution = useCallback(() => {
    setExecutionState({
      isSigning: false,
      isExecuting: false,
      isWaiting: false,
      success: false,
    });
  }, []);

  return {
    executionState,
    executeSwap,
    resetExecution,
    receipt,
    isWaiting,
  };
}

// Helper functions
function encodePermit2Data(permit2Data: any): string {
  // This would encode the permit2 data according to the contract's expected format
  // For now, return a placeholder
  return '0x' + '0'.repeat(64);
}

function getRouterType(routerTypeString: string): number {
  const routerTypes: Record<string, number> = {
    'UNISWAP_V3': 0,
    '1INCH': 1,
    'ZEROX': 2,
  };
  return routerTypes[routerTypeString] ?? 0;
}

export function getExplorerUrl(chainId: number, txHash: string): string {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io',
    42161: 'https://arbiscan.io',
    10: 'https://optimistic.etherscan.io',
  };
  
  const baseUrl = explorers[chainId] || 'https://etherscan.io';
  return `${baseUrl}/tx/${txHash}`;
}
