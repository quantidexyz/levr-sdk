# useLevrRefetch

Manual control over query refetching.

## Usage

```typescript
import { useLevrRefetch } from 'levr-sdk/client'

function RefreshButton() {
  const refetch = useLevrRefetch()

  return (
    <div>
      <button onClick={() => refetch.all()}>Refresh All</button>
      <button onClick={() => refetch.staking()}>Refresh Staking</button>
      <button onClick={() => refetch.governance()}>Refresh Governance</button>
      <button onClick={() => refetch.afterStake()}>After Stake Refetch</button>
    </div>
  )
}
```

## Methods

- `all()`: Refetch all queries
- `staking()`: Refetch all staking-related queries
- `governance()`: Refetch all governance-related queries
- `afterStake()`: Smart refetch after staking operations
- `afterSwap()`: Smart refetch after swap operations
- `afterGovernance()`: Smart refetch after governance operations
