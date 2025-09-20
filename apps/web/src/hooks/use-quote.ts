'use client';

import { useState, useCallback } from 'react';
import { validateQuoteRequest, ClientRateLimiter } from '@/lib/validation';

export interface QuoteRequest {
  tokenIn: string;
  tokenOut: string;
  amount: string;
  chainId: number;
}

export interface QuoteResponse {
  bestRoute: {
    router: string;
    routerType: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    expectedOut: string;
    minReceived: string;
    priceImpactBps: number;
    gasEstimate: string;
    gasPrice: string;
    deadline: number;
    ttl: number;
  };
  rejectedRoutes: Array<{
    router: string;
    routerType: string;
    reason: string;
    errorCode?: string;
  }>;
  totalRoutes: number;
  processingTimeMs: number;
}

export interface SimulationResponse {
  success: boolean;
  gasUsed?: string;
  gasPrice?: string;
  actualOut?: string;
  priceImpact?: number;
  error?: string;
  simulationId?: string;
}

export interface TxParamsResponse {
  to: string;
  data: string;
  value: string;
  gasLimit: string;
  gasPrice: string;
  nonce?: number;
  chainId: number;
  permitData: {
    token: string;
    amount: string;
    deadline: number;
    nonce?: string;
    signature: string;
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Rate limiter instance
const rateLimiter = new ClientRateLimiter(10, 60000); // 10 requests per minute

export function useQuote() {
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [simulation, setSimulation] = useState<SimulationResponse | null>(null);
  const [txParams, setTxParams] = useState<TxParamsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isGettingTxParams, setIsGettingTxParams] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = useCallback(async (request: QuoteRequest) => {
    setIsLoading(true);
    setError(null);
    setQuote(null);
    setSimulation(null);
    setTxParams(null);

    try {
      // Validate input parameters
      const validation = validateQuoteRequest({
        tokenIn: request.tokenIn,
        tokenOut: request.tokenOut,
        amountIn: request.amount,
        chainId: request.chainId,
        slippageTolerance: 0.5,
      });

      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Check rate limiting
      const clientId = 'default'; // In a real app, this would be user-specific
      if (!rateLimiter.isAllowed(clientId)) {
        const remaining = rateLimiter.getRemainingRequests(clientId);
        throw new Error(`Rate limit exceeded. Please wait before making another request. ${remaining} requests remaining.`);
      }

      const response = await fetch(`${API_BASE_URL}/v1/quote/best`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenIn: validation.normalizedParams!.tokenIn,
          tokenOut: validation.normalizedParams!.tokenOut,
          amountIn: validation.normalizedParams!.amountIn,
          chainId: validation.normalizedParams!.chainId,
          slippageTolerance: validation.normalizedParams!.slippageTolerance,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch quote');
      }

      const quoteData: QuoteResponse = await response.json();
      setQuote(quoteData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch quote');
      console.error('Quote error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const simulateSwap = useCallback(async (quote: QuoteResponse, userAddress: string, chainId: number) => {
    if (!quote) return null;

    setIsSimulating(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/v1/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenIn: quote.bestRoute.tokenIn,
          tokenOut: quote.bestRoute.tokenOut,
          amountIn: quote.bestRoute.amountIn,
          expectedOut: quote.bestRoute.expectedOut,
          chainId: chainId,
          router: quote.bestRoute.router,
          routerType: quote.bestRoute.routerType,
          userAddress: userAddress,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Simulation failed');
      }

      const simulationData: SimulationResponse = await response.json();
      setSimulation(simulationData);
      return simulationData;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
      console.error('Simulation error:', err);
      return null;
    } finally {
      setIsSimulating(false);
    }
  }, []);

  const getTxParams = useCallback(async (quote: QuoteResponse, userAddress: string, chainId: number) => {
    if (!quote) return null;

    setIsGettingTxParams(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/v1/tx-params`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenIn: quote.bestRoute.tokenIn,
          tokenOut: quote.bestRoute.tokenOut,
          amountIn: quote.bestRoute.amountIn,
          expectedOut: quote.bestRoute.expectedOut,
          minReceived: quote.bestRoute.minReceived,
          chainId: chainId,
          router: quote.bestRoute.router,
          routerType: quote.bestRoute.routerType,
          userAddress: userAddress,
          deadline: quote.bestRoute.deadline,
          permitType: 'PERMIT2',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get transaction parameters');
      }

      const txParamsData: TxParamsResponse = await response.json();
      setTxParams(txParamsData);
      return txParamsData;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get transaction parameters');
      console.error('TxParams error:', err);
      return null;
    } finally {
      setIsGettingTxParams(false);
    }
  }, []);

  const resetQuote = useCallback(() => {
    setQuote(null);
    setSimulation(null);
    setTxParams(null);
    setError(null);
  }, []);

  return {
    quote,
    simulation,
    txParams,
    isLoading,
    isSimulating,
    isGettingTxParams,
    error,
    fetchQuote,
    simulateSwap,
    getTxParams,
    resetQuote,
  };
}
