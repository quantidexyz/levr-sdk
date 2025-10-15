# getStaticProject()

Get static project data that doesn't change frequently (contract addresses, token metadata, pool info, fee receivers).

## Usage

```typescript
import { getStaticProject } from 'levr-sdk'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

const staticProject = await getStaticProject({
  publicClient,
  clankerToken: '0x...',
  userAddress: '0x...', // Optional: for areYouAnAdmin in fee receivers
})

if (!staticProject) {
  console.log('Project not found or not registered')
  return
}

console.log('Token:', staticProject.token.name)
console.log('Treasury:', staticProject.treasury)
console.log('Pool Fee:', staticProject.pool?.feeDisplay)
console.log('Fee Receivers:', staticProject.feeReceivers?.length)
```

## Parameters

- `publicClient` (required): Viem public client
- `clankerToken` (required): Clanker token address
- `userAddress` (optional): User address for admin status in fee receivers

## Returns

Returns `StaticProject | null` (null if project not registered)

```typescript
{
  // Contract Addresses
  treasury: `0x${string}`
  governor: `0x${string}`
  staking: `0x${string}`
  stakedToken: `0x${string}`
  forwarder: `0x${string}`
  factory: `0x${string}`

  // Token Info
  token: {
    address: `0x${string}`
    name: string
    symbol: string
    decimals: number
    totalSupply: bigint
    metadata: ProjectMetadata | null
    imageUrl?: string
  }

  // Pool Info
  pool?: {
    poolKey: PoolKey
    feeDisplay: string
    numPositions: bigint
  }

  // Fee Receivers
  feeReceivers?: Array<{
    areYouAnAdmin: boolean
    admin: `0x${string}`
    recipient: `0x${string}`
    percentage: number
  }>
}
```

## What's NOT Included

Static data does **not** include:

- ❌ `treasuryStats` (balance, utilization)
- ❌ `stakingStats` (total staked, APR, rewards)
- ❌ `governanceStats` (cycle ID, active proposals)
- ❌ `pricing` (USD prices)
- ❌ `airdrop` (airdrop status)

For these dynamic values, use `getProject()` with a `staticProject` parameter.

## Use with getProject()

```typescript
// 1. Get static data (changes rarely)
const staticProject = await getStaticProject({
  publicClient,
  clankerToken: '0x...',
})

if (!staticProject) {
  throw new Error('Project not found')
}

// 2. Get dynamic data (changes frequently)
const project = await getProject({
  publicClient,
  staticProject,
  oraclePublicClient, // Optional: for USD pricing
})

console.log('Static - Token:', staticProject.token.name)
console.log('Dynamic - Treasury Balance:', project.treasuryStats?.balance.formatted)
console.log('Dynamic - Token Price:', project.pricing?.tokenUsd)
```

## Why Separate Static Data?

Static data is separated to:

1. **Optimize caching** - Static data can be cached indefinitely
2. **Reduce API calls** - No need to refetch contract addresses on every update
3. **Improve performance** - Fetch only what changes (dynamic data)
4. **Better UX** - Instant UI rendering with cached static data

## Related

- [getProject()](./project.md) - Get full project data (static + dynamic)
- [getProjects()](./projects.md) - Get multiple projects
