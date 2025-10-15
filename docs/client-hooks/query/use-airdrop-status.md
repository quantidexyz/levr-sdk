# useAirdropStatus

Get airdrop status for a treasury (fetched separately from project data).

## Usage

```typescript
import { useAirdropStatus, useProject } from 'levr-sdk/client'

function AirdropSection() {
  const { data: project } = useProject()

  const { data: airdrop, isLoading } = useAirdropStatus({
    clankerToken: project?.token.address ?? null,
    treasury: project?.treasury ?? null,
    tokenDecimals: project?.token.decimals ?? null,
    tokenUsdPrice: project?.pricing ? parseFloat(project.pricing.tokenUsd) : null,
  })

  if (isLoading) return <div>Loading airdrop...</div>
  if (!airdrop) return <div>No airdrop data</div>

  return (
    <div>
      <h2>Treasury Airdrop</h2>
      {airdrop.isAvailable ? (
        <div>
          <p>Available: {airdrop.availableAmount.formatted}</p>
          {airdrop.availableAmount.usd && <p>USD: ${airdrop.availableAmount.usd}</p>}
          <p>Allocated: {airdrop.allocatedAmount.formatted}</p>
          <button>Claim Airdrop</button>
        </div>
      ) : (
        <p>No airdrop available</p>
      )}
    </div>
  )
}
```

## Parameters

- `clankerToken` (required): Clanker token address or null
- `treasury` (required): Treasury contract address or null
- `tokenDecimals` (required): Token decimals or null
- `tokenUsdPrice` (optional): Token USD price for USD value calculations
- `enabled` (optional): Enable/disable query (default: true)

## Data Structure

```typescript
{
  availableAmount: BalanceResult
  allocatedAmount: BalanceResult
  isAvailable: boolean
  error?: string
} | null
```

## Returns

- `data`: Airdrop status or null
- `isLoading`: Loading state
- `error`: Error if query failed

## Notes

- Airdrop data is **no longer** part of `project` query
- This is a separate query that should be called when needed
- Refetches every 30 seconds automatically
- Returns null if no airdrop configured
- Useful for showing airdrop UI only when available
- Requires all parameters to be non-null for query to execute

## Why Separate?

Airdrop status is fetched separately to:

1. Reduce initial load time (most projects won't have airdrops)
2. Allow conditional fetching (only fetch when UI needs it)
3. Keep project query focused on core data
