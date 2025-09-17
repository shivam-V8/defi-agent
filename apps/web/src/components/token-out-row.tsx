'use client';

import { TokenSelect } from './token-select';

interface TokenOutRowProps {
  token: string | null;
  onTokenChange: (token: string) => void;
}

export function TokenOutRow({ token, onTokenChange }: TokenOutRowProps) {
  // Mock expected output calculation
  const expectedAmount = '2000'; // Mock: 1 ETH = 2000 USDC
  const usdValue = (parseFloat(expectedAmount) * 1).toLocaleString(); // Mock: 1 USDC = $1
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">And receive to</span>
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
          <div className="px-3 py-2 rounded-xl bg-red-100 border border-red-200 flex items-center space-x-2">
            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
              <span className="text-xs text-white font-bold">OP</span>
            </div>
            <span className="text-gray-900 text-sm font-medium">Optimism</span>
          </div>
        </div>
        
        {/* Expected Output Display */}
        <div className="relative">
          <div className="w-full h-16 text-2xl font-semibold bg-gray-50 border border-gray-200 rounded-2xl px-4 flex items-center text-gray-900">
            {expectedAmount}
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