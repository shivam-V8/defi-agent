# DeFi Agent Web App

A modern Next.js web application for DeFi token swapping with wallet integration.

## Features

- 🔗 **Wallet Integration**: Connect with MetaMask, WalletConnect, and other popular wallets
- 🌐 **Multi-Chain Support**: Ethereum, Arbitrum, Optimism (mainnet + testnets)
- 💱 **Token Swapping**: USDC and WETH token selection and swapping
- 🎯 **Best Route Finding**: Automatic quote fetching with route optimization
- 📱 **Responsive Design**: Mobile-friendly interface with dark/light mode
- 🔒 **Demo Mode**: Try the interface without connecting a wallet

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
# Create .env.local file
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your-project-id-here
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

3. Get a WalletConnect Project ID:
   - Visit [WalletConnect Cloud](https://cloud.walletconnect.com/)
   - Create a new project
   - Copy your Project ID to the environment variable

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Usage

### Demo Mode
- Click "Try Demo Mode" to explore the interface without connecting a wallet
- Pre-filled with sample data (1 WETH → USDC)
- All features work except actual transactions

### Wallet Connection
- Click the wallet connection button in the top right
- Select your preferred wallet
- Choose your network (Ethereum, Arbitrum, Optimism)
- Start swapping tokens

### Token Swapping
1. Select input token (USDC or WETH)
2. Enter amount to swap
3. Select output token
4. Review the best route and quote
5. Confirm the swap

## Architecture

- **Next.js 15**: App Router with TypeScript
- **Wagmi + RainbowKit**: Wallet connection and blockchain interactions
- **Tailwind CSS**: Styling with design system
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library

## Project Structure

```
src/
├── app/                 # Next.js app router
├── components/          # React components
│   ├── swap-interface.tsx
│   ├── token-selector.tsx
│   ├── amount-input.tsx
│   ├── results-card.tsx
│   └── confirm-modal.tsx
├── lib/                 # Utilities and configuration
│   ├── wallet-config.ts
│   └── utils.ts
└── providers/           # React context providers
    └── wallet-provider.tsx
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | WalletConnect Project ID | Yes |
| `NEXT_PUBLIC_API_BASE_URL` | API base URL for quotes | No |

## Troubleshooting

### WalletConnect 403 Error
This is expected when using the placeholder project ID. Get a real project ID from [WalletConnect Cloud](https://cloud.walletconnect.com/).

### Build Issues
Make sure you're using Node.js 18+ and have installed all dependencies:
```bash
npm install
```

## License

MIT