# getProjects()

Get multiple projects data using the Levr factory's paginated view function.

## Usage

```typescript
import { getProjects } from 'levr-sdk'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

const { projects, total } = await getProjects({
  publicClient,
  offset: 0, // Optional: default 0
  limit: 50, // Optional: default 50
})

console.log(`Found ${projects.length} of ${total} total projects`)

for (const project of projects) {
  console.log(`${project.token.name} (${project.token.symbol})`)
  console.log(`Treasury: ${project.treasuryStats.balance.formatted} tokens`)
  console.log(`Utilization: ${project.treasuryStats.utilization}%`)
}
```

## Parameters

- `publicClient` (required): Viem public client (chain ID is derived from client)
- `offset` (optional): Starting index for pagination (default: 0)
- `limit` (optional): Maximum number of projects to return (default: 50)

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
      balance: {
        raw: bigint
        formatted: string
      }
      totalAllocated: {
        raw: bigint
        formatted: string
      }
      utilization: number
    }
  }>
  total: number
}
```

## Notes

- Uses factory's `getProjects(offset, limit)` for efficient pagination
- Filters out unregistered projects (where contracts are zero addresses)
- Uses multicall for efficient batch fetching of token and treasury data
- Treasury stats include balance and total allocated (treasury + staking)
- Does **not** include: `forwarder`, `pool`, `pricing`, `stakingStats`, `governanceStats`, `feeReceivers`, `airdrop`
- For full project data, use `getProject()` for individual projects
