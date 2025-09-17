'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, Shield, Clock } from 'lucide-react';
import { SwapParams } from '@/hooks/use-url-params';
import { QuoteResponse } from '@/hooks/use-quote';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  params: SwapParams;
  quote: QuoteResponse | null;
}

export function ConfirmModal({ isOpen, onClose, onConfirm, params, quote }: ConfirmModalProps) {
  if (!quote) return null;

  const expectedOut = parseFloat(quote.expectedOut);
  const minReceived = expectedOut * 0.995; // 0.5% slippage

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="dex-card max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Confirm Swap</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Summary */}
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {params.amount} {params.tokenIn}
              </div>
              <div className="text-sm text-muted-foreground">for</div>
              <div className="text-2xl font-bold">
                {expectedOut.toLocaleString()} {params.tokenOut}
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Min Received</span>
                <span className="font-medium">{minReceived.toLocaleString()} {params.tokenOut}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Network</span>
                <Badge className="chain-badge">Ethereum</Badge>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Router</span>
                <Badge className="router-badge">Uniswap V3</Badge>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Slippage</span>
                <span className="font-medium">0.5%</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">TTL</span>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">2:00</span>
                </div>
              </div>
            </div>
          </div>

          {/* Guardrails Panel */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-green-500" />
              <span className="font-medium">Guardrails</span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Bounded Approval</span>
                <span className="font-medium">1.02×</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Router Allowlist</span>
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Simulate Before Execute</span>
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={onConfirm}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium soft-hover"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Confirm Swap
            </Button>
            
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full h-12 rounded-2xl"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}