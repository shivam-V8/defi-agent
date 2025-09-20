'use client';

import { useState, useCallback } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { SwapCard } from './swap-card';
import { RouteResultCard } from './route-result-card';
import { ConfirmModal } from './confirm-modal';
import { useUrlParams } from '@/hooks/use-url-params';
import { useQuote } from '@/hooks/use-quote';
import { useExecution } from '@/hooks/use-execution';
import { TransactionStatus } from '@/components/transaction-status';
import { toast } from 'sonner';

export function SwapInterface() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  
  // URL params for deep linking
  const { params, updateParams } = useUrlParams();
  
  // Quote state
  const { 
    quote, 
    simulation, 
    txParams, 
    isLoading, 
    isSimulating, 
    isGettingTxParams, 
    error, 
    fetchQuote, 
    simulateSwap, 
    getTxParams, 
    resetQuote 
  } = useQuote();
  
  // Execution state
  const { 
    executionState, 
    executeSwap, 
    resetExecution, 
    receipt 
  } = useExecution();
  
  // UI state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [currentStep, setCurrentStep] = useState<'quote' | 'simulate' | 'txParams'>('quote');
  const [showTransactionStatus, setShowTransactionStatus] = useState(false);

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

  // Handle confirm - trigger simulation and tx params
  const handleConfirm = useCallback(async () => {
    if (!quote || !chainId) return;

    try {
      setCurrentStep('simulate');
      
      // First simulate the swap
      const simulationResult = await simulateSwap(quote, '0x1234567890123456789012345678901234567890', chainId);
      
      if (!simulationResult || !simulationResult.success) {
        toast.error('Simulation failed. Please try again.');
        setCurrentStep('quote');
        return;
      }

      setCurrentStep('txParams');
      
      // Then get transaction parameters
      const txParamsResult = await getTxParams(quote, '0x1234567890123456789012345678901234567890', chainId);
      
      if (!txParamsResult) {
        toast.error('Failed to get transaction parameters. Please try again.');
        setCurrentStep('quote');
        return;
      }

      // Show confirmation modal with all data
      setShowConfirmModal(true);
      setCurrentStep('quote');
      
    } catch (err) {
      toast.error('Failed to prepare transaction. Please try again.');
      setCurrentStep('quote');
      console.error('Confirm error:', err);
    }
  }, [quote, chainId, simulateSwap, getTxParams]);

  // Handle final confirmation - execute the swap
  const handleFinalConfirm = async () => {
    if (!quote || !txParams || !chainId) {
      toast.error('Missing required data for execution');
      return;
    }

    try {
      setShowConfirmModal(false);
      setShowTransactionStatus(true);
      
      // Execute the swap via AgentExecutor
      await executeSwap(quote, txParams, chainId);
      
    } catch (error) {
      console.error('Final confirmation error:', error);
      toast.error('Failed to execute swap');
    }
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

  // Handle switching to Local Testnet
  const handleSwitchToLocalTestnet = () => {
    try {
      switchChain({ chainId: 31337 });
    } catch (error) {
      console.error('Failed to switch to Local Testnet:', error);
      toast.error('Failed to switch to Local Testnet. Please switch manually in your wallet.');
    }
  };

  // Check if AgentExecutor is deployed on current chain
  const isSupportedChain = chainId === 31337; // Only local testnet is supported for now

  if (!isSupportedChain) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white border border-red-200 rounded-2xl p-8 text-center shadow-lg">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-red-500 to-pink-500 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-gray-900">Unsupported Chain</h2>
          <p className="text-gray-600 mb-4">
            AgentExecutor is not deployed on this chain yet. Please switch to Local Testnet (Chain ID: 31337) for testing.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left mb-4">
            <h3 className="font-semibold text-blue-900 mb-2">How to switch to Local Testnet:</h3>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Click the "Switch to Local Testnet" button below</li>
              <li>2. Or click on the chain selector in the top bar</li>
              <li>3. Make sure your local Anvil node is running on port 8545</li>
            </ol>
          </div>
          <button
            onClick={handleSwitchToLocalTestnet}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Switch to Local Testnet
          </button>
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
        isLoading={isLoading || isSimulating || isGettingTxParams}
        chainId={chainId}
        currentStep={currentStep}
      />

      {/* Route Result Card */}
      {quote && (
        <RouteResultCard
          quote={quote}
          onConfirm={handleConfirm}
          onDismiss={resetQuote}
          isSimulating={isSimulating}
          isGettingTxParams={isGettingTxParams}
          simulation={simulation}
        />
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleFinalConfirm}
        params={params}
        quote={quote}
        simulation={simulation}
        txParams={txParams}
      />

      {/* Transaction Status */}
      {showTransactionStatus && (
        <TransactionStatus
          executionState={executionState}
          chainId={chainId}
          onClose={() => {
            setShowTransactionStatus(false);
            if (executionState.success) {
              resetQuote();
              resetExecution();
            }
          }}
        />
      )}
    </div>
  );
}