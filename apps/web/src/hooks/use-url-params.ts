'use client';

import { useState, useEffect, useCallback } from 'react';

export interface SwapParams {
  tokenIn: string | null;
  tokenOut: string | null;
  amount: string | null;
  chain: string | null;
}

export function useUrlParams() {
  const [params, setParams] = useState<SwapParams>({
    tokenIn: null,
    tokenOut: null,
    amount: null,
    chain: null,
  });

  // Initialize from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setParams({
      tokenIn: urlParams.get('tokenIn'),
      tokenOut: urlParams.get('tokenOut'),
      amount: urlParams.get('amount'),
      chain: urlParams.get('chain'),
    });
  }, []);

  // Update URL when params change
  const updateParams = useCallback((newParams: Partial<SwapParams>) => {
    setParams(prev => {
      const updated = { ...prev, ...newParams };
      
      // Update URL
      const urlParams = new URLSearchParams();
      Object.entries(updated).forEach(([key, value]) => {
        if (value) {
          urlParams.set(key, value);
        }
      });
      
      const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ''}`;
      window.history.replaceState({}, '', newUrl);
      
      return updated;
    });
  }, []);

  // Copy deep link to clipboard
  const copyDeepLink = useCallback(() => {
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        urlParams.set(key, value);
      }
    });
    
    const deepLink = `${window.location.origin}${window.location.pathname}?${urlParams.toString()}`;
    navigator.clipboard.writeText(deepLink);
  }, [params]);

  return {
    params,
    updateParams,
    copyDeepLink,
  };
}
