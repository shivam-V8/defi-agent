// Contract artifacts and types for DeFi Agent

export interface ContractArtifact {
  name: string;
  abi: readonly any[];
  bytecode: string;
  deployedBytecode: string;
}

// DeFiAgent contract ABI (simplified)
export const DEFI_AGENT_ABI = [
  {
    "type": "function",
    "name": "evaluateQuote",
    "inputs": [
      { "name": "tokenIn", "type": "address" },
      { "name": "tokenOut", "type": "address" },
      { "name": "amountIn", "type": "uint256" },
      { "name": "expectedOut", "type": "uint256" },
      { "name": "priceImpactBps", "type": "uint256" },
      { "name": "notionalInUSD", "type": "uint256" },
      { "name": "poolLiquidityUSD", "type": "uint256" }
    ],
    "outputs": [
      { "name": "passed", "type": "bool" },
      { "name": "violations", "type": "string[]" }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "executeSwap",
    "inputs": [
      { "name": "tokenIn", "type": "address" },
      { "name": "tokenOut", "type": "address" },
      { "name": "amountIn", "type": "uint256" },
      { "name": "routerType", "type": "uint256" },
      { "name": "swapCalldata", "type": "bytes" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "maxNotionalPerTxUSD",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view"
  }
] as const;

// Contract artifacts
export const CONTRACT_ARTIFACTS: Record<string, ContractArtifact> = {
  DeFiAgent: {
    name: "DeFiAgent",
    abi: DEFI_AGENT_ABI,
    bytecode: "0x608060405234801561001057600080fd5b50600436106100a95760003560e01c80638da5cb5b116100715780638da5cb5b1461013c578063a6f9dae11461015a578063b3f0067414610176578063c4d66de814610194578063f2fde38b146101b0578063f851a440146101cc576100a9",
    deployedBytecode: "0x608060405234801561001057600080fd5b50600436106100a95760003560e01c80638da5cb5b116100715780638da5cb5b1461013c578063a6f9dae11461015a578063b3f0067414610176578063c4d66de814610194578063f2fde38b146101b0578063f851a440146101cc576100a9"
  }
};

export const DeFiAgentArtifact = CONTRACT_ARTIFACTS.DeFiAgent;
