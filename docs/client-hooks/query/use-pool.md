# usePool

Get real-time pool state including liquidity, price, and fees.

## Usage

```typescript
import { usePool } from 'levr-sdk/client'

function PoolStats() {
  const { data: pool, isLoading } = usePool()

  if (isLoading) return <div>Loading pool...</div>
  if (!pool) return <div>No pool data</div>

  return (
    <div>
      <h2>Pool State</h2>
      <p>Current Tick: {pool.tick}</p>
      <p>Liquidity: {pool.liquidity.formatted}</p>
      <p>Protocol Fee: {pool.protocolFee}</p>
      <p>LP Fee: {pool.lpFee}</p>
      <p>Fee Display: {pool.feeDisplay}</p>
    </div>
  )
}
```

## Data Structure

```typescript
{
  poolKey: PoolKey
  sqrtPriceX96: bigint
  tick: number
  liquidity: BalanceResult
  protocolFee: number
  lpFee: number
  feeDisplay: string
}
```

## Returns

- `data`: Pool state data or null
- `isLoading`: Loading state
- `error`: Error if query failed

## Notes

- Pool query uses `project.pool.poolKey` from project data
- Refreshes every 30 seconds automatically
- Only fetches real-time state (price, liquidity, fees)
- Static pool info (poolKey, feeDisplay) comes from project
