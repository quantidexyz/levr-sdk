# useProjects

Get a list of all registered Levr projects using paginated factory query.

## Usage

```typescript
import { useProjects } from 'levr-sdk/client'

function ProjectsList() {
  const { data, isLoading } = useProjects({
    offset: 0, // Optional: default 0
    limit: 50, // Optional: default 50
  })

  if (isLoading) return <div>Loading projects...</div>
  if (!data) return <div>No projects found</div>

  return (
    <div>
      <h2>Projects</h2>
      <p>Showing {data.projects.length} of {data.total} total projects</p>

      {data.projects.map((project) => (
        <div key={project.token.address}>
          <h3>{project.token.name} ({project.token.symbol})</h3>
          <p>Treasury: {project.treasuryStats.balance.formatted}</p>
          <p>Total Supply: {project.token.totalSupply.toString()}</p>
          <p>Utilization: {project.treasuryStats.utilization.toFixed(2)}%</p>
        </div>
      ))}
    </div>
  )
}
```

## Options

- `offset` (optional): Starting index for pagination (default: 0)
- `limit` (optional): Maximum number of projects to return (default: 50)
- `enabled` (optional): Enable/disable query (default: true)

## Returns

```typescript
{
  projects: Array<{
    chainId: number
    treasury: `0x${string}`
    governor: `0x${string}`
    staking: `0x${string}`
    stakedToken: `0x${string}`
    factory: `0x${string}`
    token: {
      address: `0x${string}`
      decimals: number
      name: string
      symbol: string
      totalSupply: bigint
      metadata: ProjectMetadata | null
      imageUrl?: string
    }
    treasuryStats: {
      balance: BalanceResult
      totalAllocated: BalanceResult
      utilization: number
    }
  }>
  total: number
}
```

## Notes

- Uses factory's `getProjects(offset, limit)` for efficient pagination
- Filters out unregistered projects (zero addresses)
- Does **not** include: `forwarder`, `pool`, `pricing`, `stakingStats`, `governanceStats`, `feeReceivers`, `airdrop`
- For full project data, use `useProject()` for individual projects
- Useful for project discovery and listing pages
