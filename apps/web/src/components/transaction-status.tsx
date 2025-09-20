'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, ExternalLink, Copy, Clock, Loader2 } from 'lucide-react';
import { ExecutionState } from '@/hooks/use-execution';
import { getExplorerUrl } from '@/hooks/use-execution';
import { toast } from 'sonner';

interface TransactionStatusProps {
  executionState: ExecutionState;
  chainId?: number;
  onClose?: () => void;
}

export function TransactionStatus({ executionState, chainId = 1, onClose }: TransactionStatusProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (executionState.transactionHash || executionState.error) {
      setIsVisible(true);
    }
  }, [executionState.transactionHash, executionState.error]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const openExplorer = () => {
    if (executionState.transactionHash) {
      const url = getExplorerUrl(chainId, executionState.transactionHash);
      window.open(url, '_blank');
    }
  };

  if (!isVisible) return null;

  const getStatusIcon = () => {
    if (executionState.isSigning || executionState.isExecuting || executionState.isWaiting) {
      return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
    }
    if (executionState.success) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    if (executionState.error) {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
    return <Clock className="w-5 h-5 text-yellow-500" />;
  };

  const getStatusText = () => {
    if (executionState.isSigning) return 'Signing Permit...';
    if (executionState.isExecuting) return 'Executing Swap...';
    if (executionState.isWaiting) return 'Waiting for Confirmation...';
    if (executionState.success) return 'Swap Successful!';
    if (executionState.error) return 'Swap Failed';
    return 'Processing...';
  };

  const getStatusColor = () => {
    if (executionState.isSigning || executionState.isExecuting || executionState.isWaiting) {
      return 'bg-blue-50 border-blue-200';
    }
    if (executionState.success) {
      return 'bg-green-50 border-green-200';
    }
    if (executionState.error) {
      return 'bg-red-50 border-red-200';
    }
    return 'bg-yellow-50 border-yellow-200';
  };

  return (
    <Card className={`w-full max-w-md mx-auto ${getStatusColor()} border-2`}>
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          {getStatusIcon()}
          
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {getStatusText()}
              </h3>
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              )}
            </div>

            {/* Transaction Hash */}
            {executionState.transactionHash && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Transaction Hash:</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {executionState.transactionHash.slice(0, 8)}...{executionState.transactionHash.slice(-6)}
                  </Badge>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(executionState.transactionHash!)}
                    className="flex items-center space-x-1"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openExplorer}
                    className="flex items-center space-x-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>View on Explorer</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {executionState.error && (
              <div className="p-3 bg-red-100 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{executionState.error}</p>
              </div>
            )}

            {/* Success Message */}
            {executionState.success && (
              <div className="p-3 bg-green-100 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">
                  Your swap has been executed successfully! You can view the transaction on the explorer.
                </p>
              </div>
            )}

            {/* Progress Steps */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Progress:</div>
              <div className="flex space-x-2">
                <div className={`flex-1 h-2 rounded-full ${
                  executionState.isSigning || executionState.isExecuting || executionState.isWaiting || executionState.success
                    ? 'bg-blue-500' : 'bg-gray-200'
                }`} />
                <div className={`flex-1 h-2 rounded-full ${
                  executionState.isExecuting || executionState.isWaiting || executionState.success
                    ? 'bg-blue-500' : 'bg-gray-200'
                }`} />
                <div className={`flex-1 h-2 rounded-full ${
                  executionState.isWaiting || executionState.success
                    ? 'bg-blue-500' : 'bg-gray-200'
                }`} />
                <div className={`flex-1 h-2 rounded-full ${
                  executionState.success
                    ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Sign</span>
                <span>Execute</span>
                <span>Confirm</span>
                <span>Complete</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
