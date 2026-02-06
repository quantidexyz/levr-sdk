# useMetrics

Get global Levr protocol metrics with real-time updates via GraphQL subscription. Aggregates metrics across all chains.

## Usage

```typescript
import { useMetrics } from 'levr-sdk/client'

function ProtocolStats() {
  const { data: metrics, isLoading, error } = useMetrics()

  if (isLoading) return <div>Loading metrics...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!metrics) return <div>No metrics available</div>

  return (
    <div>
      <h2>Protocol Overview</h2>
      <p>Projects: {metrics.projectCount}</p>
      <p>Total Stakers: {metrics.totalStakers}</p>
      {metrics.totalStakedUsd && <p>Total Staked: ${metrics.totalStakedUsd}</p>}
      {metrics.tvlUsd && <p>TVL: ${metrics.tvlUsd}</p>}
    </div>
  )
}
```

## Options

- `enabled` (optional): Enable/disable the subscription (default: true)

## Returns

```typescript
{
  data: GlobalMetrics | null
  isLoading: boolean
  error: Error | null
}
```

### GlobalMetrics

```typescript
{
  projectCount: number
  totalStakers: number
  totalStakedUsd: string | null // Formatted USD value (e.g., "1234567.89")
  tvlUsd: string | null // Formatted USD value
}
```

## Notes

- Uses GraphQL subscription for real-time updates (no polling)
- Aggregates metrics from all supported chains
- `totalStakedUsd` and `tvlUsd` are null if USD data is not yet available
- Useful for protocol-level dashboards and landing pages
