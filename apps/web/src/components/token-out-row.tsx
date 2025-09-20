'use client';

import { TokenSelect } from '@/components/token-select';
import { CHAIN_METADATA } from '@/lib/wallet-config';

interface TokenOutRowProps {
  token: string | null;
  chainId?: number;
  onTokenChange: (token: string) => void;
}

export function TokenOutRow({ token, chainId, onTokenChange }: TokenOutRowProps) {
  // Mock expected output calculation
  const expectedAmount = '2000'; // Mock: 1 ETH = 2000 USDC
  const usdValue = (parseFloat(expectedAmount) * 1).toLocaleString(); // Mock: 1 USDC = $1
  
  // Get chain info
  const chainInfo = chainId ? CHAIN_METADATA[chainId as keyof typeof CHAIN_METADATA] : null;
  const chainName = chainInfo?.name || 'Unknown';
  const chainSymbol = chainInfo?.symbol || 'ETH';
  
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
          <div className="px-3 py-2 rounded-xl bg-green-100 border border-green-200 flex items-center space-x-2">
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-xs text-white font-bold">{chainSymbol.charAt(0)}</span>
            </div>
            <span className="text-gray-900 text-sm font-medium">{chainName}</span>
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