# useBalance

Get token balances for the connected wallet.

## Usage

```typescript
import { useBalance } from 'levr-sdk/client'

function WalletBalances() {
  const { data: balances, isLoading } = useBalance()

  if (isLoading) return <div>Loading balances...</div>

  return (
    <div>
      <p>Token: {balances?.token?.formatted}</p>
      <p>WETH: {balances?.weth?.formatted}</p>
      <p>ETH: {balances?.eth?.formatted}</p>
    </div>
  )
}
```

## Returns

- `token`: Token balance with formatted/raw values
- `weth`: WETH balance
- `eth`: Native ETH balance
