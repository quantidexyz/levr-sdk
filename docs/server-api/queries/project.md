# getProject()

Get complete project data including token info, contracts, pool details, treasury stats, staking stats, governance stats, and optional USD pricing.

## Usage

```typescript
import { getProject } from 'levr-sdk'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

const oracleClient = createPublicClient({
  chain: base, // Can use same chain or different for oracle
  transport: http(),
})

const projectData = await getProject({
  publicClient,
  clankerToken: '0x...',
  oraclePublicClient: oracleClient, // Optional: for USD pricing
  userAddress: '0x...', // Optional: for areYouAnAdmin in fee receivers
})

if (!projectData) {
  console.log('Project not found or not registered')
  return
}

console.log('Token:', projectData.token.name)
console.log('Treasury Balance:', projectData.treasuryStats?.balance.formatted)
console.log('Token Price:', projectData.pricing?.tokenUsd, 'USD')
console.log('Current Cycle:', projectData.governanceStats?.currentCycleId.toString())
console.log('Total Staked:', projectData.stakingStats?.totalStaked.formatted)
```

## Parameters

- `publicClient` (required): Viem public client
- `clankerToken` (required): Clanker token address
- `oraclePublicClient` (optional): Client for USD pricing oracle
- `userAddress` (optional): User address for admin status in fee receivers

## Returns

Returns `Project | null` (null if project not registered)

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
  }

  // Pool Info
  pool?: {
    poolKey: PoolKey
    feeDisplay: string
    numPositions: bigint
  }

  // Treasury Stats
  treasuryStats?: {
    balance: BalanceResult
    totalAllocated: BalanceResult
    utilization: number
  }

  // Staking Stats (pool-level)
  stakingStats?: {
    totalStaked: BalanceResult
    apr: {
      token: { raw: bigint, percentage: number }
      weth: { raw: bigint, percentage: number } | null
    }
    outstandingRewards: {
      staking: { available: BalanceResult, pending: BalanceResult }
      weth: { available: BalanceResult, pending: BalanceResult } | null
    }
    rewardRates: {
      token: BalanceResult
      weth: BalanceResult | null
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
  }>

  // Pricing (if oraclePublicClient provided)
  pricing?: {
    wethUsd: string
    tokenUsd: string
  }

  // Airdrop Status (treasury)
  airdrop?: {
    availableAmount: BalanceResult
    allocatedAmount: BalanceResult
    isAvailable: boolean
    error?: string
  } | null
}
```
