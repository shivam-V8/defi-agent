'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TOKENS = [
  { symbol: 'WETH', name: 'Wrapped Ether', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', color: 'blue' },
  { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C', color: 'blue' },
  { symbol: 'SAND', name: 'Sandbox', address: '0x3845badAde8e6dDD04FcF80A4423B8B1C292c9bA', color: 'blue' },
  { symbol: 'SNX', name: 'Synthetix', address: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F', color: 'blue' },
];

const getTokenColor = (symbol: string) => {
  const token = TOKENS.find(t => t.symbol === symbol);
  return token?.color || 'blue';
};

interface TokenSelectProps {
  selectedToken: string | null;
  onTokenSelect: (token: string) => void;
  placeholder?: string;
}

export function TokenSelect({ selectedToken, onTokenSelect, placeholder = "Select token" }: TokenSelectProps) {
  const selectedTokenData = TOKENS.find(t => t.symbol === selectedToken);
  const color = getTokenColor(selectedToken || '');

  return (
    <Select value={selectedToken || ''} onValueChange={onTokenSelect}>
      <SelectTrigger className="h-12 px-3 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 focus:border-blue-500 text-gray-900">
        <SelectValue placeholder={placeholder}>
          {selectedTokenData && (
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full bg-${color}-500 flex items-center justify-center`}>
                <span className="text-sm font-bold text-white">
                  {selectedTokenData.symbol.charAt(0)}
                </span>
              </div>
              <span className="font-medium text-gray-900">{selectedTokenData.symbol}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-white border border-gray-200 rounded-xl shadow-lg">
        {TOKENS.map((token) => (
          <SelectItem key={token.symbol} value={token.symbol} className="text-gray-900 hover:bg-gray-100">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full bg-${token.color}-500 flex items-center justify-center`}>
                <span className="text-sm font-bold text-white">
                  {token.symbol.charAt(0)}
                </span>
              </div>
              <div>
                <div className="font-medium text-gray-900">{token.symbol}</div>
                <div className="text-xs text-gray-600">{token.name}</div>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}