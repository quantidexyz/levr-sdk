# useSwap

Swap functionality with quotes and price impact. All data comes from context.

## Usage

```typescript
import { useSwap } from 'levr-sdk/client'
import { useState } from 'react'

function SwapInterface() {
  const [amountIn, setAmountIn] = useState('100')
  const [zeroForOne, setZeroForOne] = useState(true) // true = token -> paired token

  const {
    // Mutations
    swap,

    // Quote query
    quote,

    // Helpers
    buildSwapConfig,

    // Loading states
    isLoading,
    isSwapping,
  } = useSwap({
    quoteParams: {
      zeroForOne,
      amountIn,
      amountInDecimals: 18,
      amountOutDecimals: 18,
    },
    onSwapSuccess: (receipt) => {
      console.log('Swapped!', receipt)
    },
  })

  const handleSwap = () => {
    if (!quote.data) return

    const config = buildSwapConfig({
      zeroForOne,
      amountIn: parseUnits(amountIn, 18),
      amountInDecimals: 18,
      minAmountOut: quote.data.amountOut * 99n / 100n, // 1% slippage
    })

    swap.mutate(config)
  }

  return (
    <div>
      <h2>Swap</h2>

      <select onChange={(e) => setZeroForOne(e.target.value === 'sell')}>
        <option value="sell">Token → Paired Token</option>
        <option value="buy">Paired Token → Token</option>
      </select>

      <input
        type="text"
        value={amountIn}
        onChange={(e) => setAmountIn(e.target.value)}
        placeholder="Amount"
      />

      {quote.data && (
        <div>
          <p>You'll receive: {formatUnits(quote.data.amountOut, 18)}</p>
          <p>Price Impact: {quote.data.priceImpactBps}%</p>
          {quote.data.hookFees && (
            <p>Hook Fees: {JSON.stringify(quote.data.hookFees)}</p>
          )}
        </div>
      )}

      <button onClick={handleSwap} disabled={swap.isPending || !quote.data}>
        Swap
      </button>
    </div>
  )
}
```

## Options

- `quoteParams`: Parameters for quote calculation
  - `zeroForOne`: Swap direction (true = token → paired token)
  - `amountIn`: Amount to swap (as string)
  - `amountInDecimals`: Input token decimals
  - `amountOutDecimals`: Output token decimals
- `onSwapSuccess`: Callback after successful swap

## Data Access

Get balances and pool data from context:

```typescript
import { useUser, useProject } from 'levr-sdk/client'

const { data: user } = useUser()
const { data: project } = useProject()

// Balances
user?.balances.token // Token balance
user?.balances.pairedToken // Paired token balance (e.g., WETH, USDC)
user?.balances.nativeEth // Native ETH balance (only when pairedToken.isNative)

// Pool info
project?.pool?.poolKey // Pool key for swaps
project?.pool?.feeDisplay // Fee display (e.g., "3.00%")
project?.pool?.pairedToken // { address, symbol, decimals, isNative }
```

## Quote Query

- `quote.data`: Quote with price impact and hook fees
- `quote.isLoading`: Quote loading state
- `quote.error`: Quote error state
