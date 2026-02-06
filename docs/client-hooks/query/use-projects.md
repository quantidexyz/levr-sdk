# useProjects

Get a list of all registered Levr projects with real-time updates via GraphQL subscriptions.

## Usage

```typescript
import { useProjects } from 'levr-sdk/client'

function ProjectsList() {
  const { data, isLoading, error } = useProjects({
    search: 'token name', // Optional: filter by name/symbol
    sortBy: 'stakerCount', // Optional: default 'stakerCount'
    sortDirection: 'desc', // Optional: default 'desc'
    offset: 0, // Optional: for pagination
    limit: 50, // Optional: max results
  })

  if (isLoading) return <div>Loading projects...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!data) return <div>No projects found</div>

  return (
    <div>
      <h2>Projects ({data.projects.length})</h2>

      {data.projects.map((project) => (
        <div key={project.token.address}>
          <h3>{project.token.name} ({project.token.symbol})</h3>
          {project.token.priceUsd && <p>Price: ${project.token.priceUsd}</p>}
          <p>Stakers: {project.stats.stakerCount.toString()}</p>
          {project.stats.tvlUsd && <p>TVL: ${project.stats.tvlUsd}</p>}
          {project.stats.totalStakedUsd && <p>Staked: ${project.stats.totalStakedUsd}</p>}
          <p>Verified: {project.stats.verified ? 'Yes' : 'No'}</p>
        </div>
      ))}
    </div>
  )
}
```

## Options

- `search` (optional): Search filter by token name/symbol
- `sortBy` (optional): Sort field - `'stakerCount'`, `'tvlUsd'`, `'totalStakedUsd'`, etc. (default: `'stakerCount'`)
- `sortDirection` (optional): Sort direction - `'asc'` or `'desc'` (default: `'desc'`)
- `offset` (optional): Starting index for pagination
- `limit` (optional): Maximum number of projects to return
- `enabled` (optional): Enable/disable query (default: true)

## Returns

```typescript
{
  data: {
    projects: ProjectListItem[]
  } | null
  isLoading: boolean
  error: Error | null
}
```

### ProjectListItem

```typescript
{
  chainId: number
  token: {
    address: `0x${string}`
    decimals: number
    name: string
    symbol: string
    totalSupply: bigint
    priceUsd: string | null
    metadata: Record<string, unknown> | null
    imageUrl?: string
  }
  stats: {
    verified: boolean
    totalStaked: bigint
    totalStakedUsd: string | null
    tvlUsd: string | null
    totalProposals: bigint
    stakerCount: bigint
    currentCycleId: bigint
    activeBoostProposals: bigint
    activeTransferProposals: bigint
  }
}
```

## Notes

- Uses GraphQL subscriptions for real-time updates (no polling)
- Replaces the old `getProjects()` server function
- Does **not** include contract addresses (treasury, governor, staking) per project - use `useProject()` for full data on individual projects
- Supports search filtering by token name or symbol
- Data includes USD pricing and aggregate statistics from the indexer
