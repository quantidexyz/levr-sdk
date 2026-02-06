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
  console.log('Token not found or invalid address')
  return
}

if (!staticProject.isRegistered) {
  console.log('Token detected but not registered yet')
  console.log('Token admin:', staticProject.token.admin)
  return
}

console.log('Token:', staticProject.token.name)
console.log('Treasury:', staticProject.treasury)
console.log('Pool Fee:', staticProject.pool?.feeDisplay)
console.log('Paired Token:', staticProject.pool?.pairedToken.symbol)
console.log('Fee Receivers:', staticProject.feeReceivers?.length)
```

## Parameters

- `publicClient` (required): Viem public client
- `clankerToken` (required): Clanker token address
- `userAddress` (optional): User address for admin status in fee receivers

## Returns

Returns `StaticProject | null`. `null` is only returned when the token address is invalid or metadata calls fail. For unregistered tokens, `isRegistered` will be `false` and only token metadata + shared factory details will be populated.

```typescript
{
  isRegistered: boolean

  // Contract Addresses (only when isRegistered === true)
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
    originalAdmin: `0x${string}`
    admin: `0x${string}`
    context: string
  }

  // Pool Info
  pool?: {
    poolKey: PoolKey
    feeDisplay: string
    numPositions: bigint
    pairedToken: PairedTokenInfo
  }

  // Fee Receivers
  feeReceivers?: Array<{
    areYouAnAdmin: boolean
    admin: `0x${string}`
    recipient: `0x${string}`
    percentage: number
    feePreference?: FeePreference
  }>

  // Fee Splitter (static configuration)
  feeSplitter?: {
    address: `0x${string}`
    isConfigured: boolean
    isActive: boolean
    splits: Array<{ receiver: `0x${string}`, bps: number }>
    totalBps: number
  }
}
```

### PairedTokenInfo

```typescript
{
  address: `0x${string}`
  symbol: string
  decimals: number
  isNative: boolean // true if WETH/WBNB (enables native ETH UX)
}
```

## What's NOT Included

Static data does **not** include:

- :x: `treasuryStats` (balance, utilization)
- :x: `stakingStats` (total staked, APR, rewards)
- :x: `governanceStats` (cycle ID, active proposals)
- :x: `pricing` (USD prices)
- :x: `airdrop` (airdrop status)

For these dynamic values, use `getProject()` with a `staticProject` parameter.

## Use with getProject()

```typescript
// 1. Get static data (changes rarely)
const staticProject = await getStaticProject({
  publicClient,
  clankerToken: '0x...',
})

if (!staticProject?.isRegistered) {
  throw new Error('Project not registered')
}

// 2. Get dynamic data (changes frequently)
const project = await getProject({
  publicClient,
  staticProject,
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
- [useProjects](../../client-hooks/query/use-projects.md) - React hook for project listing
