'use client';

import { useState, useCallback } from 'react';

export interface QuoteRequest {
  tokenIn: string;
  tokenOut: string;
  amount: string;
  chainId: number;
}

export interface QuoteResponse {
  chainId: number;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  expectedOut: string;
  priceImpactBps: number;
  notionalInUSD: string;
  poolLiquidityUSD: string;
  routerType: number;
  routerAddress: string;
  gasEstimate: string;
  gasPrice: string;
  route: Array<{
    tokenIn: string;
    tokenOut: string;
    pool: string;
    fee: number;
  }>;
  rejectedReasons?: string[];
}

export function useQuote() {
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = useCallback(async (request: QuoteRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      // For now, use mock data. In production, this would call the API
      const mockQuote: QuoteResponse = {
        chainId: request.chainId,
        tokenIn: request.tokenIn,
        tokenOut: request.tokenOut,
        amountIn: request.amount,
        expectedOut: (parseFloat(request.amount) * 2000).toString(), // Mock 1 ETH = 2000 USDC
        priceImpactBps: 50, // 0.5%
        notionalInUSD: (parseFloat(request.amount) * 2000).toString(),
        poolLiquidityUSD: '500000', // $500k
        routerType: 0, // Uniswap
        routerAddress: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        gasEstimate: '150000',
        gasPrice: '20000000000', // 20 gwei
        route: [
          {
            tokenIn: request.tokenIn,
            tokenOut: request.tokenOut,
            pool: '0x1234567890123456789012345678901234567890',
            fee: 3000,
          },
        ],
        rejectedReasons: ['LiquidityTooLow', 'PriceImpactHigh'],
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setQuote(mockQuote);
    } catch (err) {
      setError('Failed to fetch quote');
      console.error('Quote error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    quote,
    isLoading,
    error,
    fetchQuote,
  };
}
