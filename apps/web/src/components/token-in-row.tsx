'use client';

import { useState, useEffect } from 'react';
import { TokenSelect } from '@/components/token-select';
import { AmountInput } from '@/components/amount-input';
import { Button } from '@/components/ui/button';
import { CHAIN_METADATA } from '@/lib/wallet-config';
import { validateTokenAmount, validateTokenAddress, sanitizeInput } from '@/lib/validation';

interface TokenInRowProps {
  token: string | null;
  amount: string | null;
  chainId?: number;
  onTokenChange: (token: string) => void;
  onAmountChange: (amount: string) => void;
}

export function TokenInRow({ token, amount, chainId, onTokenChange, onAmountChange }: TokenInRowProps) {
  const [amountError, setAmountError] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Validate amount input
  useEffect(() => {
    if (amount && amount.trim() !== '') {
      const validation = validateTokenAmount(amount);
      if (!validation.isValid) {
        setAmountError(validation.error || 'Invalid amount');
      } else {
        setAmountError(null);
      }
    } else {
      setAmountError(null);
    }
  }, [amount]);

  // Validate token selection
  useEffect(() => {
    if (token) {
      const validation = validateTokenAddress(token);
      if (!validation.isValid) {
        setTokenError(validation.error || 'Invalid token address');
      } else {
        setTokenError(null);
      }
    } else {
      setTokenError(null);
    }
  }, [token]);

  // Calculate USD value (mock: 1 ETH = $2000)
  const usdValue = amount ? (parseFloat(amount) * 2000).toLocaleString() : '0';
  
  // Get chain info
  const chainInfo = chainId ? CHAIN_METADATA[chainId as keyof typeof CHAIN_METADATA] : null;
  const chainName = chainInfo?.name || 'Unknown';
  const chainSymbol = chainInfo?.symbol || 'ETH';

  // Handle amount change with sanitization
  const handleAmountChange = (newAmount: string) => {
    const sanitized = sanitizeInput(newAmount);
    onAmountChange(sanitized);
  };

  // Handle token change with validation
  const handleTokenChange = (newToken: string) => {
    const sanitized = sanitizeInput(newToken);
    onTokenChange(sanitized);
  };
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">Send</span>
        <div className="text-sm text-gray-600">
          Balance: ~1.0 {token || chainSymbol}
        </div>
      </div>
      
      <div className="space-y-2">
        {/* Token and Network Selection */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <TokenSelect
              selectedToken={token}
              onTokenSelect={handleTokenChange}
              placeholder="Select token"
            />
            <span className="text-gray-600">on</span>
            <div className="px-3 py-2 rounded-xl bg-blue-100 border border-blue-200 flex items-center space-x-2">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-xs text-white font-bold">∞</span>
              </div>
              <span className="text-gray-900 text-sm font-medium">{chainName}</span>
            </div>
          </div>
          {tokenError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {tokenError}
            </div>
          )}
        </div>
        
        {/* Amount Input */}
        <div className="space-y-2">
          <div className="relative">
            <AmountInput
              value={amount || ''}
              onChange={handleAmountChange}
              placeholder="0"
              className={`w-full h-16 text-2xl font-semibold bg-gray-50 border rounded-2xl px-4 text-gray-900 placeholder:text-gray-400 focus:bg-white ${
                amountError 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-200 focus:border-blue-500'
              }`}
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleAmountChange('1.0')}
                className="h-8 px-3 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
              >
                Max
              </Button>
            </div>
          </div>
          {amountError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {amountError}
            </div>
          )}
        </div>
        
        {/* USD Value */}
        <div className="text-sm text-gray-600">
          = ${usdValue}
        </div>
      </div>
    </div>
  );
}