'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Zap, Clock, DollarSign, TrendingDown } from 'lucide-react';
import { QuoteResponse, SimulationResponse } from '@/hooks/use-quote';

interface RouteResultCardProps {
  quote: QuoteResponse;
  onConfirm: () => void;
  onDismiss: () => void;
  isSimulating?: boolean;
  isGettingTxParams?: boolean;
  simulation?: SimulationResponse | null;
}

export function RouteResultCard({ quote, onConfirm, onDismiss, isSimulating, isGettingTxParams, simulation }: RouteResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [ttl, setTtl] = useState(120); // 2 minutes

  // Real calculations from API response
  const expectedOut = parseFloat(quote.bestRoute.expectedOut);
  const gasEstimate = parseFloat(quote.bestRoute.gasEstimate);
  const gasPrice = parseFloat(quote.bestRoute.gasPrice);
  const gasUSD = (gasEstimate * gasPrice) / 1e18; // Convert wei to ETH, then to USD (simplified)
  const netUSD = expectedOut - gasUSD;
  const priceImpact = quote.bestRoute.priceImpactBps / 100;
  const minReceived = parseFloat(quote.bestRoute.minReceived);

  // TTL countdown
  useState(() => {
    setTtl(quote.bestRoute.ttl);
    const interval = setInterval(() => {
      setTtl(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(interval);
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-black/5 backdrop-blur-xl border border-black/10 rounded-3xl shadow-2xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-black">Best Route</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">Ethereum</Badge>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">{quote.bestRoute.routerType}</Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-1 text-sm text-black/70">
              <DollarSign className="w-4 h-4" />
              <span>Expected Out</span>
            </div>
            <div className="text-lg font-semibold text-black">
              {expectedOut.toLocaleString()} USDC
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center space-x-1 text-sm text-black/70">
              <Zap className="w-4 h-4" />
              <span>Gas (USD)</span>
            </div>
            <div className="text-lg font-semibold text-black">${gasUSD}</div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center space-x-1 text-sm text-black/70">
              <DollarSign className="w-4 h-4" />
              <span>Net (USD)</span>
            </div>
            <div className="text-lg font-semibold text-black">${netUSD.toLocaleString()}</div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center space-x-1 text-sm text-black/70">
              <TrendingDown className="w-4 h-4" />
              <span>Price Impact</span>
            </div>
            <div className={`text-lg font-semibold ${priceImpact > 1 ? 'text-red-400' : 'text-green-400'}`}>
              {priceImpact}%
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-black/70">Min Received:</span>
            <div className="font-medium text-black">{minReceived.toLocaleString()} USDC</div>
          </div>
          <div>
            <span className="text-black/70">TTL:</span>
            <div className="flex items-center space-x-1 font-medium text-black">
              <Clock className="w-4 h-4" />
              <span>{formatTime(ttl)}</span>
            </div>
          </div>
        </div>

        {/* Collapsible Rejected Routes */}
        {quote.rejectedRoutes && quote.rejectedRoutes.length > 0 && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full justify-between p-0 h-auto text-black/70 hover:text-black"
            >
              <span className="text-sm">
                Why others were rejected ({quote.rejectedRoutes.length})
              </span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            
            {isExpanded && (
              <div className="space-y-2">
                {quote.rejectedRoutes.map((route, index) => (
                  <div key={index} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-red-300">{route.routerType}</span>
                      <span className="text-xs text-red-400">{route.router.slice(0, 6)}...{route.router.slice(-4)}</span>
                    </div>
                    <div className="text-xs text-red-300">{route.reason}</div>
                    {route.errorCode && (
                      <div className="text-xs text-red-400 mt-1">Error: {route.errorCode}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-3 pt-2">
          <Button
            onClick={onConfirm}
            disabled={isSimulating || isGettingTxParams}
            className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
          >
            {isSimulating ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Simulating...</span>
              </div>
            ) : isGettingTxParams ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Preparing...</span>
              </div>
            ) : (
              'Review & Confirm'
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onDismiss}
            disabled={isSimulating || isGettingTxParams}
            className="px-6 h-12 rounded-2xl border-black/20 text-black hover:bg-black/10 disabled:opacity-50"
          >
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}