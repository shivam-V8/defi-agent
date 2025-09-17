'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TokenInRow } from './token-in-row';
import { TokenOutRow } from './token-out-row';
import { ChainSelect } from './chain-select';
import { Share, ArrowUpDown, Settings } from 'lucide-react';
import { SwapParams } from '@/hooks/use-url-params';
import { toast } from 'sonner';

interface SwapCardProps {
  params: SwapParams;
  onParamsChange: (params: Partial<SwapParams>) => void;
  onGetBestRoute: () => void;
  isLoading: boolean;
  chainId?: number;
}

export function SwapCard({ params, onParamsChange, onGetBestRoute, isLoading, chainId }: SwapCardProps) {
  const swapTokens = () => {
    onParamsChange({
      tokenIn: params.tokenOut,
      tokenOut: params.tokenIn,
    });
  };

  const copyDeepLink = () => {
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        urlParams.set(key, value);
      }
    });
    
    const deepLink = `${window.location.origin}${window.location.pathname}?${urlParams.toString()}`;
    navigator.clipboard.writeText(deepLink);
    toast.success('Deep link copied to clipboard');
  };

  const canGetRoute = params.tokenIn && params.tokenOut && params.amount && parseFloat(params.amount) > 0;

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="bg-white border border-gray-200 rounded-2xl shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Swap</h2>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={copyDeepLink}
                className="w-8 h-8 p-0 hover:bg-gray-100 rounded-lg"
              >
                <Share className="w-4 h-4 text-gray-600" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 p-0 hover:bg-gray-100 rounded-lg"
              >
                <Settings className="w-4 h-4 text-gray-600" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Token In Row */}
          <TokenInRow
            token={params.tokenIn}
            amount={params.amount}
            onTokenChange={(token) => onParamsChange({ tokenIn: token })}
            onAmountChange={(amount) => onParamsChange({ amount })}
          />

          {/* Swap Button */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={swapTokens}
              disabled={!params.tokenIn || !params.tokenOut}
              className="w-12 h-12 p-0 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 border-0"
            >
              <ArrowUpDown className="w-5 h-5" />
            </Button>
          </div>

          {/* Token Out Row */}
          <TokenOutRow
            token={params.tokenOut}
            onTokenChange={(token) => onParamsChange({ tokenOut: token })}
          />

          {/* Chain Select */}
          <ChainSelect
            chain={params.chain}
            onChainChange={(chain) => onParamsChange({ chain })}
            currentChainId={chainId}
          />

          {/* Transaction Details */}
          <div className="space-y-3 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Gas:</span>
              <span className="text-gray-900">= $5</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Waiting time:</span>
              <span className="text-gray-900">~2 min</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Route priority:</span>
              <div className="flex items-center space-x-1">
                <span className="text-gray-900">Uniswap V3</span>
                <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-xs text-white">?</span>
                </div>
              </div>
            </div>
          </div>

          {/* Get Best Route Button */}
          <Button
            onClick={onGetBestRoute}
            disabled={!canGetRoute || isLoading}
            className="w-full h-12 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Finding best route...</span>
              </div>
            ) : (
              'Swap'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}