# Quote API

Unified quote API for getting swap quotes from both Uniswap V3 and V4 pools.

## Overview

The `quote` object provides two methods for each version:

- **`read`**: Execute the quote immediately (async)
- **`bytecode`**: Get encoded call data for multicalls

```typescript
import { quote } from 'levr-sdk'

// V3 quote
const v3Quote = await quote.v3.read({ ... })
const v3Bytecode = quote.v3.bytecode({ ... }) // for multicalls

// V4 quote
const v4Quote = await quote.v4.read({ ... })
const v4Bytecode = quote.v4.bytecode({ ... }) // for multicalls
```

## V3 Examples

### Basic Quote

```typescript
import { createPublicClient, http, parseUnits, formatUnits } from 'viem'
import { base } from 'viem/chains'
import { quote, UNISWAP_V3_QUOTER_V2 } from 'levr-sdk'

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

const result = await quote.v3.read({
  publicClient,
  quoterAddress: UNISWAP_V3_QUOTER_V2(base.id)!,
  tokenIn: '0x123...', // WETH
  tokenOut: '0x456...', // USDC
  amountIn: parseUnits('1', 18),
  fee: 3000, // 0.3%
})

console.log(`Output: ${formatUnits(result.amountOut, 6)} USDC`)
```

### Bytecode for Multicall

```typescript
const bytecode = quote.v3.bytecode({
  quoterAddress: UNISWAP_V3_QUOTER_V2(base.id)!,
  tokenIn: '0x123...',
  tokenOut: '0x456...',
  amountIn: parseUnits('1', 18),
  fee: 3000,
})

// Use in multicall - ABI is included, no need to import separately
const results = await publicClient.multicall({
  contracts: [
    { ...bytecode, functionName: 'quoteExactInputSingle' },
    // ... other calls
  ],
})
```

## V4 Examples

### Basic Quote

```typescript
import { createPublicClient, http, parseEther, formatEther } from 'viem'
import { base } from 'viem/chains'
import { quote, createPoolKey } from 'levr-sdk'

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

const poolKey = createPoolKey(
  '0x123...', // token
  '0x456...', // WETH
  3000, // 0.3% fee
  60, // tick spacing
  '0x123...' // hooks
)

const result = await quote.v4.read({
  publicClient,
  poolKey,
  zeroForOne: true,
  amountIn: parseEther('1'),
})

console.log(`Output: ${formatEther(result.amountOut)}`)
console.log(`Gas: ${result.gasEstimate}`)
```

### Quote with Price Impact

```typescript
const result = await quote.v4.read({
  publicClient,
  poolKey,
  zeroForOne: true,
  amountIn: parseEther('100'),
  pricing: { pairedTokenUsd: '2500', tokenUsd: '1.5' },
  tokenAddress: '0x123...',
  currency0Decimals: 18,
  currency1Decimals: 18,
})

console.log(`Price Impact: ${result.priceImpactBps}%`)

if (result.hookFees) {
  console.log('Hook fees:', result.hookFees)
}
```

### Batch Quotes with Multicall

```typescript
// Get bytecode for multiple quotes
const quote1 = quote.v4.bytecode({
  publicClient,
  poolKey,
  zeroForOne: true,
  amountIn: parseEther('1'),
})

const quote2 = quote.v4.bytecode({
  publicClient,
  poolKey,
  zeroForOne: false,
  amountIn: parseEther('100'),
})

// Execute all quotes in a single RPC call - ABI is included in bytecode
const results = await publicClient.multicall({
  contracts: [
    { ...quote1, functionName: 'quoteExactInputSingle' },
    { ...quote2, functionName: 'quoteExactInputSingle' },
  ],
})

const [amountOut1] = results[0].result as [bigint, bigint]
const [amountOut2] = results[1].result as [bigint, bigint]
```

## Use Cases

### Pre-swap Price Check

```typescript
const quote = await quote.v4.read({
  publicClient,
  poolKey,
  zeroForOne: true,
  amountIn: parseEther('1'),
})

if (quote.priceImpactBps && quote.priceImpactBps > 1) {
  console.warn(`High price impact: ${quote.priceImpactBps.toFixed(2)}%`)
}
```

### Calculate Minimum Output

```typescript
const quote = await quote.v4.read({
  publicClient,
  poolKey,
  zeroForOne: true,
  amountIn,
})

// 1% slippage tolerance
const minOutput = (quote.amountOut * 99n) / 100n

await swapV4({
  publicClient,
  wallet,
  chainId,
  poolKey,
  zeroForOne: true,
  amountIn,
  amountOutMinimum: minOutput,
})
```

## Related

- [Swap V4](./swap-v4.md) - Execute swaps on Uniswap V4
- [USD Price](../utilities/get-usd-price.md) - Get USD pricing for tokens
- [Constants](../utilities/constants.md) - Contract addresses and constants
