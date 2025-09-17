'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const CHAINS = [
  { id: 'ethereum', name: 'Ethereum', chainId: 1, color: 'blue' },
  { id: 'arbitrum', name: 'Arbitrum', chainId: 42161, color: 'purple' },
  { id: 'optimism', name: 'Optimism', chainId: 10, color: 'red' },
];

interface ChainSelectProps {
  chain: string | null;
  onChainChange: (chain: string) => void;
  currentChainId?: number;
}

export function ChainSelect({ chain, onChainChange, currentChainId }: ChainSelectProps) {
  const currentChain = CHAINS.find(c => c.chainId === currentChainId);
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">Network</span>
        {currentChain && (
          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
            Connected: {currentChain.name}
          </Badge>
        )}
      </div>
      
      <Select value={chain || ''} onValueChange={onChainChange}>
        <SelectTrigger className="h-12 px-3 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 focus:border-blue-500 text-gray-900">
          <SelectValue placeholder="Select network" />
        </SelectTrigger>
        <SelectContent className="bg-white border border-gray-200 rounded-xl shadow-lg">
          {CHAINS.map((chainOption) => (
            <SelectItem key={chainOption.id} value={chainOption.id} className="text-gray-900 hover:bg-gray-100">
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-full bg-${chainOption.color}-500 flex items-center justify-center`}>
                  <span className="text-xs text-white font-bold">
                    {chainOption.name.charAt(0)}
                  </span>
                </div>
                <span className="text-gray-900">{chainOption.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}