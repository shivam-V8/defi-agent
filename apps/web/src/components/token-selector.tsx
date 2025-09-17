'use client';

import { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { TOKEN_METADATA, TOKEN_ADDRESSES } from '@/lib/wallet-config';
import { cn } from '@/lib/utils';

interface TokenSelectorProps {
  selectedToken: 'USDC' | 'WETH' | null;
  onTokenSelect: (token: 'USDC' | 'WETH') => void;
  chainId: number;
  disabled?: boolean;
}

export function TokenSelector({ 
  selectedToken, 
  onTokenSelect, 
  chainId, 
  disabled = false 
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const availableTokens = ['USDC', 'WETH'] as const;
  const filteredTokens = availableTokens.filter(token =>
    token.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedTokenData = selectedToken ? TOKEN_METADATA[selectedToken] : null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
          "hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "ring-2 ring-blue-500 ring-offset-2 border-blue-500"
        )}
      >
        <div className="flex items-center space-x-3">
          {selectedTokenData ? (
            <>
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <span className="text-sm font-medium">
                  {selectedTokenData.symbol.charAt(0)}
                </span>
              </div>
              <div className="text-left">
                <div className="font-medium">{selectedTokenData.symbol}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedTokenData.name}
                </div>
              </div>
            </>
          ) : (
            <div className="text-muted-foreground">Select token</div>
          )}
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tokens..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredTokens.map((token) => {
              const tokenData = TOKEN_METADATA[token];
              const tokenAddress = TOKEN_ADDRESSES[chainId]?.[token];
              const isSelected = selectedToken === token;
              
              return (
                <button
                  key={token}
                  type="button"
                  onClick={() => {
                    onTokenSelect(token);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={cn(
                    "w-full flex items-center space-x-3 p-3 hover:bg-accent hover:text-accent-foreground transition-colors",
                    isSelected && "bg-accent text-accent-foreground"
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {tokenData.symbol.charAt(0)}
                    </span>
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-medium">{tokenData.symbol}</div>
                    <div className="text-sm text-muted-foreground">
                      {tokenData.name}
                    </div>
                  </div>
                  {tokenAddress && (
                    <div className="text-xs text-muted-foreground font-mono">
                      {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
