# Quote API

The unified quote API provides methods for getting swap quotes from both Uniswap V3 and V4 pools.

## Overview

The `quote` object provides a consistent interface for quoting swaps across different Uniswap versions:

```typescript
import { quote } from 'levr-sdk'

// V3 quotes
const v3Quote = await quote.v3.read({ ... })
const v3Bytecode = quote.v3.bytecode({ ... })

// V4 quotes
const v4Quote = await quote.v4.read({ ... })
const v4Bytecode = quote.v4.bytecode({ ... })
```

Each version provides two methods:

- **`read`**: Performs an async call to get the quote immediately
- **`bytecode`**: Returns encoded call data for use in multicalls or custom execution

## V3 Quote

### `quote.v3.read()`

Get a swap quote from Uniswap V3 by reading from the quoter contract.

**Parameters:**

```typescript
type QuoteV3Params = {
  publicClient: PublicClient // Viem public client
  quoterAddress: `0x${string}` // V3 QuoterV2 contract address
  tokenIn: `0x${string}` // Input token address
  tokenOut: `0x${string}` // Output token address
  amountIn: bigint // Input amount in wei
  fee: number // Fee tier (500, 3000, or 10000)
  sqrtPriceLimitX96?: bigint // Optional price limit (default: 0n)
}
```

**Returns:**

```typescript
type QuoteV3ReadReturnType = {
  amountOut: bigint // Output amount in wei
  fee: number // Fee tier used
}
```

**Example:**

```typescript
import { createPublicClient, http, parseUnits } from 'viem'
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
  amountIn: parseUnits('1', 18), // 1 WETH
  fee: 3000, // 0.3%
})

console.log(`Expected output: ${formatUnits(result.amountOut, 6)} USDC`)
```

### `quote.v3.bytecode()`

Get encoded bytecode for a V3 quote that can be used in multicalls.

**Parameters:** Same as `quote.v3.read()` except `publicClient` is optional.

**Returns:**

```typescript
type QuoteV3BytecodeReturnType = {
  address: `0x${string}` // Quoter contract address
  data: `0x${string}` // Encoded function call data
}
```

**Example:**

```typescript
const bytecode = quote.v3.bytecode({
  quoterAddress: UNISWAP_V3_QUOTER_V2(base.id)!,
  tokenIn: '0x123...',
  tokenOut: '0x456...',
  amountIn: parseUnits('1', 18),
  fee: 3000,
})

// Use in multicall
const results = await publicClient.multicall({
  contracts: [
    {
      address: bytecode.address,
      abi: V3QuoterV2,
      functionName: 'quoteExactInputSingle',
      // Or use the raw data:
      // ...bytecode
    },
  ],
})
```

## V4 Quote

### `quote.v4.read()`

Get a swap quote from Uniswap V4 by reading from the quoter contract. Includes hook fees and price impact calculation.

**Parameters:**

```typescript
type QuoteV4Params = {
  publicClient: PublicClient // Viem public client
  poolKey: PoolKey // Pool key with currencies and fee
  zeroForOne: boolean // Swap direction
  amountIn: bigint // Input amount in wei
  hookData?: `0x${string}` // Optional hook data (default: '0x')
  pricing?: PricingResult // Optional pricing for impact calculation
  currency0Decimals?: number // Decimals for currency0 (default: 18)
  currency1Decimals?: number // Decimals for currency1 (default: 18)
  tokenAddress?: `0x${string}` // Token address for price impact
}
```

**Returns:**

```typescript
type QuoteV4ReadReturnType = {
  amountOut: bigint // Output amount in wei
  gasEstimate: bigint // Estimated gas for the swap
  priceImpactBps?: number // Price impact percentage
  hookFees?: {
    // Hook fee information (if available)
    type: 'static' | 'dynamic'
    clankerFee?: number // For static fees (in basis points)
    pairedFee?: number // For static fees (in basis points)
    baseFee?: number // For dynamic fees (in basis points)
    maxLpFee?: number // For dynamic fees (in basis points)
  }
}
```

**Example:**

```typescript
import { createPublicClient, http, parseEther } from 'viem'
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
  pricing: { wethUsd: '2500', tokenUsd: '1.5' },
  tokenAddress: '0x123...',
})

console.log(`Output: ${formatEther(result.amountOut)}`)
console.log(`Price Impact: ${result.priceImpactBps}%`)
console.log(`Hook Fees:`, result.hookFees)
```

### `quote.v4.bytecode()`

Get encoded bytecode for a V4 quote that can be used in multicalls.

**Parameters:** Same as `quote.v4.read()` but `publicClient` is required for chain ID.

**Returns:**

```typescript
type QuoteV4BytecodeReturnType = {
  address: `0x${string}` // Quoter contract address
  data: `0x${string}` // Encoded function call data
}
```

**Example:**

```typescript
const bytecode = quote.v4.bytecode({
  publicClient, // Required for chain ID
  poolKey,
  zeroForOne: true,
  amountIn: parseEther('1'),
})

// Use in multicall
const results = await publicClient.multicall({
  contracts: [
    {
      address: bytecode.address,
      abi: V4Quoter,
      functionName: 'quoteExactInputSingle',
      // Or use the raw data:
      // ...bytecode
    },
  ],
})
```

## Use Cases

### Simple Quote

For immediate swap quotes:

```typescript
const quote = await quote.v4.read({
  publicClient,
  poolKey,
  zeroForOne: true,
  amountIn: parseEther('1'),
})
```

### Batch Quotes with Multicall

For efficient batch quoting:

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

// Execute all quotes in a single RPC call
const results = await publicClient.multicall({
  contracts: [
    { ...quote1, abi: V4Quoter, functionName: 'quoteExactInputSingle' },
    { ...quote2, abi: V4Quoter, functionName: 'quoteExactInputSingle' },
  ],
})

// Parse results
const [amountOut1] = results[0].result as [bigint, bigint]
const [amountOut2] = results[1].result as [bigint, bigint]
```

### Price Impact Calculation

V4 quotes can calculate price impact when pricing data is provided:

```typescript
const pricing = await getUsdPrice({
  oraclePublicClient: baseClient,
  quotePublicClient: testnetClient,
  tokenAddress: '0x123...',
})

const quote = await quote.v4.read({
  publicClient,
  poolKey,
  zeroForOne: true,
  amountIn: parseEther('100'),
  pricing,
  tokenAddress: '0x123...',
})

if (quote.priceImpactBps && quote.priceImpactBps > 1) {
  console.warn(`High price impact: ${quote.priceImpactBps.toFixed(2)}%`)
}
```

## Related

- [Swap V4](./swap-v4.md) - Execute swaps on Uniswap V4
- [USD Price](../utilities/get-usd-price.md) - Get USD pricing for tokens
- [Constants](../utilities/constants.md) - Exported constants and addresses
