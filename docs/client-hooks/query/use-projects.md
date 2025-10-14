# useProjects

Get a list of all registered Levr projects from the factory.

## Usage

```typescript
import { useProjects } from 'levr-sdk/client'

function ProjectsList() {
  const { data, isLoading } = useProjects({
    fromBlock: 0n, // Optional
    toBlock: 'latest', // Optional
    pageSize: 50, // Optional: default 100
  })

  if (isLoading) return <div>Loading projects...</div>
  if (!data) return <div>No projects found</div>

  return (
    <div>
      <h2>Projects</h2>
      <p>Found {data.projects.length} projects</p>
      <p>Block range: {data.fromBlock.toString()} - {data.toBlock.toString()}</p>

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

- `fromBlock` (optional): Start block (default: last 10,000 blocks)
- `toBlock` (optional): End block (default: 'latest')
- `pageSize` (optional): Maximum projects to return (default: 100)
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
  fromBlock: bigint
  toBlock: bigint
}
```

## Notes

- Queries `Registered` events from LevrFactory
- Returns projects sorted by most recent first
- Filters out unregistered projects (zero addresses)
- Does not include pool, pricing, staking stats, or governance stats (use `useProject()` for full data)
- Useful for project discovery and listing pages

