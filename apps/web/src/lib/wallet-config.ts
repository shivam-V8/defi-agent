import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, arbitrum, optimism, sepolia, arbitrumSepolia, optimismSepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'DeFi Agent',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'f327e20551427b8671f11671f2e8e358',
  chains: [mainnet, arbitrum, optimism, sepolia, arbitrumSepolia, optimismSepolia],
  ssr: true,
});

// Token addresses for different chains
export const TOKEN_ADDRESSES: Record<number, Record<string, string>> = {
  // Ethereum Mainnet
  [mainnet.id]: {
    USDC: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C', // Placeholder - replace with actual USDC address
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
  // Arbitrum
  [arbitrum.id]: {
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Placeholder - replace with actual USDC address
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  },
  // Optimism
  [optimism.id]: {
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // Placeholder - replace with actual USDC address
    WETH: '0x4200000000000000000000000000000000000006',
  },
  // Sepolia Testnet
  [sepolia.id]: {
    USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Placeholder - replace with actual USDC address
    WETH: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
  },
  // Arbitrum Sepolia
  [arbitrumSepolia.id]: {
    USDC: '0x75faf114eafb1BDbe2F0316DF893fd58cE46AA4d', // Placeholder - replace with actual USDC address
    WETH: '0xE591bf0A0CF924A0674d7792db046B23CEbF5f7F',
  },
  // Optimism Sepolia
  [optimismSepolia.id]: {
    USDC: '0x5fd84259d66Cd46123540766Be93DFE2F8e64564', // Placeholder - replace with actual USDC address
    WETH: '0x4200000000000000000000000000000000000006',
  },
} as const;

// Token metadata
export const TOKEN_METADATA = {
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
  },
  WETH: {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
  },
} as const;

// Chain metadata
export const CHAIN_METADATA = {
  [mainnet.id]: {
    name: 'Ethereum',
    symbol: 'ETH',
    logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
  },
  [arbitrum.id]: {
    name: 'Arbitrum',
    symbol: 'ETH',
    logo: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
  },
  [optimism.id]: {
    name: 'Optimism',
    symbol: 'ETH',
    logo: 'https://cryptologos.cc/logos/optimism-op-logo.png',
  },
  [sepolia.id]: {
    name: 'Sepolia',
    symbol: 'ETH',
    logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
  },
  [arbitrumSepolia.id]: {
    name: 'Arbitrum Sepolia',
    symbol: 'ETH',
    logo: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
  },
  [optimismSepolia.id]: {
    name: 'Optimism Sepolia',
    symbol: 'ETH',
    logo: 'https://cryptologos.cc/logos/optimism-op-logo.png',
  },
} as const;
