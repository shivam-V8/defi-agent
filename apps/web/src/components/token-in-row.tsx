'use client';

import { TokenSelect } from './token-select';
import { AmountInput } from './amount-input';
import { Button } from '@/components/ui/button';

interface TokenInRowProps {
  token: string | null;
  amount: string | null;
  onTokenChange: (token: string) => void;
  onAmountChange: (amount: string) => void;
}

export function TokenInRow({ token, amount, onTokenChange, onAmountChange }: TokenInRowProps) {
  // Calculate USD value (mock: 1 ETH = $2000)
  const usdValue = amount ? (parseFloat(amount) * 2000).toLocaleString() : '0';
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">Send</span>
        <div className="text-sm text-gray-600">
          Balance: ~1.0 {token || 'ETH'}
        </div>
      </div>
      
      <div className="space-y-2">
        {/* Token and Network Selection */}
        <div className="flex items-center space-x-2">
          <TokenSelect
            selectedToken={token}
            onTokenSelect={onTokenChange}
            placeholder="Select token"
          />
          <span className="text-gray-600">on</span>
          <div className="px-3 py-2 rounded-xl bg-purple-100 border border-purple-200 flex items-center space-x-2">
            <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
              <span className="text-xs text-white font-bold">∞</span>
            </div>
            <span className="text-gray-900 text-sm font-medium">MATIC</span>
          </div>
        </div>
        
        {/* Amount Input */}
        <div className="relative">
          <AmountInput
            value={amount || ''}
            onChange={onAmountChange}
            placeholder="0"
            className="w-full h-16 text-2xl font-semibold bg-gray-50 border border-gray-200 rounded-2xl px-4 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white"
          />
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onAmountChange('1.0')}
              className="h-8 px-3 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
            >
              Max
            </Button>
          </div>
        </div>
        
        {/* USD Value */}
        <div className="text-sm text-gray-600">
          = ${usdValue}
        </div>
      </div>
    </div>
  );
}