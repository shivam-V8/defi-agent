export type Policy = {
  chains: Array<'ethereum' | 'arbitrum' | 'optimism'>;
  routers: Record<string, Array<'uniswap' | '1inch'>>;
  maxNotionalPerTxUSD: number;
  maxSlippageBps: number;
  maxPriceImpactBps: number;
  minPoolLiquidityUSD: number;
  approvalMultiplier: number;
  ttlSeconds: number;
};

export const defaultPolicy: Policy = {
  chains: ['ethereum', 'arbitrum', 'optimism'],
  routers: {
    ethereum: ['uniswap', '1inch'],
    arbitrum: ['uniswap', '1inch'],
    optimism: ['uniswap', '1inch'],
  },
  maxNotionalPerTxUSD: 1000,
  maxSlippageBps: 50,
  maxPriceImpactBps: 150,
  minPoolLiquidityUSD: 250000,
  approvalMultiplier: 1.02,
  ttlSeconds: 120,
};

export type NormalizedQuote = {
  chain: 'ethereum' | 'arbitrum' | 'optimism';
  router: 'uniswap' | '1inch';
  tokenIn: string;
  tokenOut: string;
  amountInWei: bigint;
  expectedOutWei: bigint;
  priceImpactBps: number;
  gasUSD: number;
  notionalInUSD: number;
  poolLiquidityUSD?: number;
  calldata: string;
  to: string;
};

export function evaluateQuote(q: NormalizedQuote, p: Policy) {
  const v: string[] = [];
  if (!p.chains.includes(q.chain)) v.push('ChainNotAllowed');
  if (!(p.routers[q.chain] || []).includes(q.router)) v.push('RouterNotAllowed');
  if (q.notionalInUSD > p.maxNotionalPerTxUSD) v.push('NotionalTooLarge');
  if (q.priceImpactBps > p.maxPriceImpactBps) v.push('PriceImpactHigh');
  if ((q.poolLiquidityUSD ?? Infinity) < p.minPoolLiquidityUSD) v.push('LiquidityTooLow');
  return { pass: v.length === 0, violations: v };
}
