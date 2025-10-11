# quoteV4()

Get a swap quote on Uniswap V4 with price impact and hook fees.

## Usage

```typescript
import { quoteV4 } from 'levr-sdk'

const quote = await quoteV4({
  publicClient,
  poolKey: {
    currency0: '0x...',
    currency1: '0x...',
    fee: 500,
    tickSpacing: 10,
    hooks: '0x...',
  },
  zeroForOne: true, // true = token -> WETH, false = WETH -> token
  amountIn: parseUnits('100', 18),
  pricing: {
    // Optional: for price impact calculation
    wethUsd: '2543.21',
    tokenUsd: '0.05',
  },
  tokenAddress: '0x...',
  currency0Decimals: 18,
  currency1Decimals: 18,
})

console.log('Amount Out:', formatUnits(quote.amountOut, 18))
console.log('Price Impact:', quote.priceImpactBps, 'bps')
console.log('Hook Fees:', quote.hookFees)
console.log('Gas Estimate:', quote.gasEstimate.toString())
```

## Parameters

- `publicClient` (required): Viem public client
- `poolKey` (required): Uniswap V4 pool key
- `zeroForOne` (required): Swap direction
- `amountIn` (required): Amount to swap (as bigint)
- `pricing` (optional): USD pricing for price impact
- `tokenAddress` (optional): Token address for fee calculation
- `currency0Decimals` (optional): Currency 0 decimals (default: 18)
- `currency1Decimals` (optional): Currency 1 decimals (default: 18)

## Returns

```typescript
{
  amountOut: bigint
  priceImpactBps: number // e.g., 0.5 for 0.5%
  hookFees: {
    type: 'static' | 'dynamic'
    clankerFee: number // In basis points
    pairedFee: number
  } | null
  gasEstimate: bigint
}
```
