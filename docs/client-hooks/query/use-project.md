# useProject

Get complete project data including token, contracts, pool, fee receivers, treasury, and governance.

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

      <h3>Token Info</h3>
      <p>Address: {project.token.address}</p>
      <p>Total Supply: {project.token.totalSupply.toString()}</p>

      <h3>Contracts</h3>
      <p>Treasury: {project.treasury}</p>
      <p>Governor: {project.governor}</p>
      <p>Staking: {project.staking}</p>
      <p>Factory: {project.factory}</p>

      <h3>Treasury</h3>
      <p>Balance: {project.treasuryStats?.balance.formatted} {project.token.symbol}</p>
      <p>Total Allocated: {project.treasuryStats?.totalAllocated.formatted}</p>
      <p>Utilization: {project.treasuryStats?.utilization.toFixed(2)}%</p>

      <h3>Governance</h3>
      <p>Current Cycle: {project.governanceStats?.currentCycleId.toString()}</p>
      <p>Active Transfers: {project.governanceStats?.activeProposalCount.transfer.toString()}</p>
      <p>Active Boosts: {project.governanceStats?.activeProposalCount.boost.toString()}</p>

      <h3>Staking Stats</h3>
      <p>Total Staked: {project.stakingStats?.totalStaked.formatted}</p>
      <p>Token APR: {project.stakingStats?.apr.token.percentage}%</p>
      {project.stakingStats?.apr.weth && (
        <p>WETH APR: {project.stakingStats.apr.weth.percentage}%</p>
      )}

      {project.pool && (
        <div>
          <h3>Pool</h3>
          <p>Fee: {project.pool.feeDisplay}</p>
          <p>Positions: {project.pool.numPositions.toString()}</p>
        </div>
      )}

      {project.pricing && (
        <div>
          <h3>Pricing</h3>
          <p>Token Price: ${project.pricing.tokenUsd}</p>
          <p>WETH Price: ${project.pricing.wethUsd}</p>
        </div>
      )}

      {project.feeReceivers && (
        <div>
          <h3>Fee Receivers</h3>
          {project.feeReceivers.map((receiver, i) => (
            <div key={i}>
              <p>Recipient: {receiver.recipient}</p>
              <p>Percentage: {receiver.percentage}%</p>
              {receiver.areYouAnAdmin && <span>👑 You're admin</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

## Data Structure

Project data contains ALL project-level information:

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

  // Pricing (dynamic data, if oraclePublicClient provided to LevrProvider)
  pricing?: {
    wethUsd: string
    tokenUsd: string
  }
}
```

## Returns

- `data`: Complete project data or null
- `isLoading`: Loading state
- `error`: Error if query failed

## What's Included

`useProject()` returns **static + dynamic** data:

**Static data** (cached indefinitely):
- Contract addresses
- Token info
- Pool info
- Fee receivers

**Dynamic data** (refetches every 30s):
- Treasury stats
- Staking stats
- Governance stats
- Pricing (if oracle provided)

**Not included:**
- ❌ Airdrop status - Use `useAirdropStatus()` hook separately

## Notes

- Internally uses `useStaticProjectQuery()` + `useProjectQuery()`
- Static data cached with `staleTime: Infinity` (only refetches on token change)
- Dynamic data refetches every 30 seconds
- Includes fee receivers with `areYouAnAdmin` calculated automatically
- Pricing requires `oraclePublicClient` in LevrProvider
- Automatically refetches when token or chain changes

## Related

- [useAirdropStatus](./use-airdrop-status.md) - Get airdrop status separately
- [useUser](./use-user.md) - Get user-specific data
- [usePool](./use-pool.md) - Get real-time pool state
