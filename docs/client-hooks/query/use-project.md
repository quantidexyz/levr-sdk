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
      <p>Current Cycle: {project.currentCycleId.toString()}</p>

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

  // Contract Addresses
  treasury: `0x${string}`
  governor: `0x${string}`
  staking: `0x${string}`
  stakedToken: `0x${string}`
  forwarder: `0x${string}`
  factory: `0x${string}`

  // Governance
  currentCycleId: bigint

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

  // Fee Receivers
  feeReceivers?: Array<{
    areYouAnAdmin: boolean
    admin: `0x${string}`
    recipient: `0x${string}`
    percentage: number
  }>

  // Pricing (if oracle provided)
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

## Notes

- All data comes from a single optimized multicall
- Includes fee receivers with `areYouAnAdmin` calculated automatically
- Pricing requires `oraclePublicClient` in LevrProvider
- Automatically refetches when token changes
