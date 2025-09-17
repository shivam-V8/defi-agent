'use client';

import { useState, useCallback } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { SwapCard } from './swap-card';
import { RouteResultCard } from './route-result-card';
import { ConfirmModal } from './confirm-modal';
import { useUrlParams } from '@/hooks/use-url-params';
import { useQuote } from '@/hooks/use-quote';
import { toast } from 'sonner';

export function SwapInterface() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  
  // URL params for deep linking
  const { params, updateParams } = useUrlParams();
  
  // Quote state
  const { quote, isLoading, fetchQuote } = useQuote();
  
  // UI state
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Handle quote fetching
  const handleGetBestRoute = useCallback(async () => {
    if (!params.tokenIn || !params.tokenOut || !params.amount) {
      toast.error('Please select tokens and enter an amount');
      return;
    }

    try {
      await fetchQuote({
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amount: params.amount,
        chainId: chainId || 1,
      });
    } catch {
      toast.error('Failed to fetch quote. Please try again.');
    }
  }, [params, chainId, fetchQuote]);

  // Handle confirm
  const handleConfirm = async () => {
    // In a real app, this would trigger the actual swap transaction
    console.log('Confirming swap:', { params, quote });
    
    // Simulate transaction
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast.success('Swap confirmed! (Demo mode)');
    setShowConfirmModal(false);
  };

  if (!isConnected) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-lg">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">Connect Your Wallet</h2>
          <p className="text-gray-600">
            Connect your wallet to start swapping tokens with the best routes
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Swap Card */}
      <SwapCard
        params={params}
        onParamsChange={updateParams}
        onGetBestRoute={handleGetBestRoute}
        isLoading={isLoading}
        chainId={chainId}
      />

      {/* Route Result Card */}
      {quote && (
        <RouteResultCard
          quote={quote}
          onConfirm={() => setShowConfirmModal(true)}
          onDismiss={() => {
            // Clear quote
            window.location.reload();
          }}
        />
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirm}
        params={params}
        quote={quote}
      />
    </div>
  );
}