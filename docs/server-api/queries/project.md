# getProject()

Get complete project data including treasury stats, staking stats, governance stats, and USD pricing. Requires static project data.

## Usage

### With Static Data (Recommended)

```typescript
import { getProject, getStaticProject } from 'levr-sdk'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

// 1. Get static data (cache this!)
const staticProject = await getStaticProject({
  publicClient,
  clankerToken: '0x...',
  userAddress: '0x...', // Optional: for areYouAnAdmin in fee receivers
})

if (!staticProject?.isRegistered) {
  console.log('Project not registered yet')
  return
}

// 2. Get dynamic data (refetch this regularly)
const projectData = await getProject({
  publicClient,
  staticProject,
})

if (!projectData) {
  console.log('Error fetching dynamic data')
  return
}

console.log('Token:', projectData.token.name)
console.log('Treasury Balance:', projectData.treasuryStats?.balance.formatted)
console.log('Token Price:', projectData.pricing?.tokenUsd, 'USD')
console.log('Current Cycle:', projectData.governanceStats?.currentCycleId.toString())
console.log('Total Staked:', projectData.stakingStats?.totalStaked.formatted)

// Check fee splitter status
if (projectData.feeSplitter?.isActive) {
  console.log('Fee splitter active with', projectData.feeSplitter.splits.length, 'recipients')
  console.log('Pending fees:', projectData.feeSplitter.pendingFees)
}
```

## Parameters

- `publicClient` (required): Viem public client
- `staticProject` (required): Static project data from `getStaticProject()`

::: tip
Pricing is now auto-fetched internally using the pool's paired token information. You no longer need to provide an `oraclePublicClient`.
:::

## Returns

Returns `Project | null`. `staticProject.isRegistered` must be `true` before calling this function (otherwise dynamic data won't exist).

```typescript
{
  chainId: number

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

  // Treasury Stats
  treasuryStats?: {
    balance: BalanceResult
    totalAllocated: BalanceResult
    utilization: number
    stakingContractBalance: BalanceResult
    escrowBalance: BalanceResult
    stakingContractPairedBalance?: BalanceResult
  }

  // Staking Stats (pool-level)
  stakingStats?: {
    totalStaked: BalanceResult
    apr: {
      token: { raw: bigint, percentage: number }
      pairedToken: { raw: bigint, percentage: number } | null
    }
    outstandingRewards: {
      staking: {
        available: BalanceResult
        pending: BalanceResult
        streaming: BalanceResult
        claimable: BalanceResult
      }
      pairedToken: {
        available: BalanceResult
        pending: BalanceResult
        streaming: BalanceResult
        claimable: BalanceResult
      } | null
    }
    rewardRates: {
      token: BalanceResult
      pairedToken: BalanceResult | null
    }
    streamParams: {
      windowSeconds: number
      streamStart: bigint
      streamEnd: bigint
      isActive: boolean
    }
  }

  // Governance Stats
  governanceStats?: {
    currentCycleId: bigint
    activeProposalCount: {
      boost: bigint
      transfer: bigint
    }
  }

  // Fee Receivers
  feeReceivers?: Array<{
    areYouAnAdmin: boolean
    admin: `0x${string}`
    recipient: `0x${string}`
    percentage: number
    feePreference?: FeePreference
  }>

  // Fee Splitter
  feeSplitter?: {
    // Static data
    isConfigured: boolean
    isActive: boolean
    splits: Array<{ receiver: `0x${string}`, bps: number }>
    totalBps: number
    // Dynamic data (if active)
    pendingFees?: {
      token: bigint
      pairedToken: bigint | null
    }
  }

  // Pricing (auto-fetched from pool's paired token)
  pricing?: {
    tokenUsd: string
    pairedTokenUsd: string
  }

  // Block timestamp at time of fetch
  blockTimestamp?: bigint
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

## What's Included

`getProject()` returns **static + dynamic** data:

**Static data** (from `staticProject`):

- Contract addresses (treasury, governor, staking, etc.)
- Token info (name, symbol, decimals, total supply)
- Pool info (poolKey, fee display, positions, paired token)
- Fee receivers
- Fee splitter configuration (`isConfigured`, `isActive`, `splits`, `totalBps`)

**Dynamic data** (fetched fresh):

- Treasury stats (balance, utilization, staking contract balance, escrow balance)
- Staking stats (total staked, APR, rewards with streaming/claimable, stream params)
- Governance stats (cycle ID, active proposals) - fetched from GraphQL indexer
- Pricing (USD prices auto-fetched from pool)
- Fee splitter pending fees (if active)
- Block timestamp

**Not included:**

- :x: Airdrop status - Use `getAirdropStatus()` separately

## Related

- [getStaticProject()](./static-project.md) - Get static data only
- [getAirdropStatus()](./airdrop-status.md) - Get airdrop status with multi-recipient support
- [getUser()](./user.md) - Get user data
- [getFactoryConfig()](./factory.md) - Get factory configuration
- [fetchVaultData()](./vault.md) - Get vault allocation data
