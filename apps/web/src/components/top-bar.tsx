'use client';

import { ConnectButton, Chain } from '@rainbow-me/rainbowkit';
import { useChainId, useSwitchChain } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Zap, ChevronDown } from 'lucide-react';
import { useState } from 'react';

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  42161: 'Arbitrum',
  10: 'Optimism',
  11155111: 'Sepolia',
  421614: 'Arbitrum Sepolia',
  11155420: 'Optimism Sepolia',
  31337: 'Local Testnet',
};

export function TopBar() {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    // In a real app, you'd update the theme here
  };

  const handleSwitchToLocalTestnet = () => {
    try {
      switchChain({ chainId: 31337 });
    } catch (error) {
      console.error('Failed to switch to Local Testnet:', error);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900">DeFi Agent</span>
              {chainId && (
                <div className="text-sm text-gray-600">
                  {CHAIN_NAMES[chainId] || `Chain ${chainId}`}
                </div>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-3">
            {/* Chain Selector */}
            {chainId && chainId !== 31337 && (
              <Button
                onClick={handleSwitchToLocalTestnet}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Switch to Local Testnet
              </Button>
            )}

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="w-9 h-9 p-0 hover:bg-gray-100 rounded-full"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-gray-600" />
              ) : (
                <Moon className="w-4 h-4 text-gray-600" />
              )}
            </Button>

            {/* Connect Button */}
            <ConnectButton />
          </div>
        </div>
      </div>
    </div>
  );
}