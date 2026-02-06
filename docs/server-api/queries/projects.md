# getProjects()

::: warning Removed
`getProjects()` has been removed as a server function. Project listing is now powered by GraphQL subscriptions for real-time updates.
:::

## Migration

Use the [`useProjects`](../../client-hooks/query/use-projects.md) hook instead for React applications:

```typescript
import { useProjects } from 'levr-sdk/client'

function ProjectsList() {
  const { data, isLoading } = useProjects({
    search: 'token name',
    sortBy: 'stakerCount',
    sortDirection: 'desc',
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      {data?.projects.map((project) => (
        <div key={project.token.address}>
          <h3>{project.token.name} ({project.token.symbol})</h3>
          <p>Stakers: {project.stats.stakerCount.toString()}</p>
          <p>TVL: ${project.stats.tvlUsd}</p>
        </div>
      ))}
    </div>
  )
}
```

The `useProjects` hook provides:

- Real-time updates via GraphQL subscriptions
- Search, sort, and pagination support
- Richer data including `priceUsd`, `tvlUsd`, `stakerCount`, and more

## Related

- [useProjects](../../client-hooks/query/use-projects.md) - React hook for project listing
- [getProject()](./project.md) - Get individual project data (server-side)
