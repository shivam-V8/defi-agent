'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Zap, Clock, DollarSign, TrendingDown } from 'lucide-react';
import { QuoteResponse } from '@/hooks/use-quote';

interface RouteResultCardProps {
  quote: QuoteResponse;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function RouteResultCard({ quote, onConfirm, onDismiss }: RouteResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [ttl, setTtl] = useState(120); // 2 minutes

  // Mock calculations
  const expectedOut = parseFloat(quote.expectedOut);
  const gasUSD = 5; // Mock $5 gas
  const netUSD = expectedOut - gasUSD;
  const priceImpact = quote.priceImpactBps / 100;
  const minReceived = expectedOut * 0.995; // 0.5% slippage

  // TTL countdown
  useState(() => {
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
    <Card className="w-full max-w-md mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-white">Best Route</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">Ethereum</Badge>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">Uniswap V3</Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-1 text-sm text-white/70">
              <DollarSign className="w-4 h-4" />
              <span>Expected Out</span>
            </div>
            <div className="text-lg font-semibold text-white">
              {expectedOut.toLocaleString()} USDC
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center space-x-1 text-sm text-white/70">
              <Zap className="w-4 h-4" />
              <span>Gas (USD)</span>
            </div>
            <div className="text-lg font-semibold text-white">${gasUSD}</div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center space-x-1 text-sm text-white/70">
              <DollarSign className="w-4 h-4" />
              <span>Net (USD)</span>
            </div>
            <div className="text-lg font-semibold text-white">${netUSD.toLocaleString()}</div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center space-x-1 text-sm text-white/70">
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
            <span className="text-white/70">Min Received:</span>
            <div className="font-medium text-white">{minReceived.toLocaleString()} USDC</div>
          </div>
          <div>
            <span className="text-white/70">TTL:</span>
            <div className="flex items-center space-x-1 font-medium text-white">
              <Clock className="w-4 h-4" />
              <span>{formatTime(ttl)}</span>
            </div>
          </div>
        </div>

        {/* Collapsible Rejected Routes */}
        {quote.rejectedReasons && quote.rejectedReasons.length > 0 && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full justify-between p-0 h-auto text-white/70 hover:text-white"
            >
              <span className="text-sm">
                Why others were rejected
              </span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            
            {isExpanded && (
              <div className="flex flex-wrap gap-2">
                {quote.rejectedReasons.map((reason, index) => (
                  <Badge key={index} variant="outline" className="text-xs bg-red-500/20 text-red-300 border-red-500/30">
                    {reason}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-3 pt-2">
          <Button
            onClick={onConfirm}
            className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Review & Confirm
          </Button>
          <Button
            variant="outline"
            onClick={onDismiss}
            className="px-6 h-12 rounded-2xl border-white/20 text-white hover:bg-white/10"
          >
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}