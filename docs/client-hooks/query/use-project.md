# useProject

Get the current project data including token info, contracts, and pool details.

## Usage

```typescript
import { useProject } from 'levr-sdk/client'

function ProjectInfo() {
  const { data: project, isLoading, error } = useProject()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!project) return <div>No project loaded</div>

  return (
    <div>
      <h2>{project.token.name} ({project.token.symbol})</h2>
      <p>Token: {project.token.address}</p>
      <p>Treasury: {project.treasuryStats.balance.formatted} {project.token.symbol}</p>
      <p>Total Allocated: {project.treasuryStats.totalAllocated.formatted} {project.token.symbol}</p>
      {project.pricing && (
        <p>Token Price: ${project.pricing.tokenUsd}</p>
      )}
    </div>
  )
}
```

## Returns

- `data`: Project data or undefined
- `isLoading`: Loading state
- `error`: Error if query failed
