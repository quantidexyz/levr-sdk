# useSwap

Swap functionality with quotes and price impact.

## Usage

```typescript
import { useSwap } from 'levr-sdk/client'
import { useState } from 'react'

function SwapInterface() {
  const [amountIn, setAmountIn] = useState('100')
  const [zeroForOne, setZeroForOne] = useState(true) // true = token -> WETH

  const {
    // Mutations
    swap,

    // Queries
    quote,
    balances,
    poolKey,
    pricing,

    // Convenience
    tokenBalance,
    wethBalance,
    buildSwapConfig,
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
        <option value="sell">Token → WETH</option>
        <option value="buy">WETH → Token</option>
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
  - `zeroForOne`: Swap direction (true = token → WETH)
  - `amountIn`: Amount to swap (as string)
  - `amountInDecimals`: Input token decimals
  - `amountOutDecimals`: Output token decimals
- `onSwapSuccess`: Callback after successful swap

## Queries

- `quote.data`: Quote with price impact and hook fees
- `balances`: Token and WETH balances
- `pricing`: USD pricing data
- `poolKey`: Uniswap V4 pool key
