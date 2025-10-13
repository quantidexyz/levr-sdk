# useUser

Get all user-specific data including balances, staking, and governance.

## Usage

```typescript
import { useUser } from 'levr-sdk/client'

function UserDashboard() {
  const { data: user, isLoading } = useUser()

  if (isLoading) return <div>Loading...</div>
  if (!user) return <div>Connect wallet</div>

  return (
    <div>
      <h2>Balances</h2>
      <p>Token: {user.balances.token.formatted}</p>
      <p>WETH: {user.balances.weth.formatted}</p>
      <p>ETH: {user.balances.eth.formatted}</p>

      <h2>Staking</h2>
      <p>Staked: {user.staking.stakedBalance.formatted}</p>
      <p>Allowance: {user.staking.allowance.formatted}</p>
      <p>Token APR: {user.staking.apr.token.percentage}%</p>
      {user.staking.apr.weth && (
        <p>WETH APR: {user.staking.apr.weth.percentage}%</p>
      )}

      <h3>Rewards</h3>
      <p>Available: {user.staking.rewards.outstanding.staking.available.formatted}</p>
      <p>Pending: {user.staking.rewards.outstanding.staking.pending.formatted}</p>
      <p>Claimable: {user.staking.rewards.claimable.staking.formatted}</p>

      <h2>Governance</h2>
      <p>Voting Power: {user.governance.votingPower.formatted}</p>
      {user.governance.airdrop && (
        <div>
          <p>Airdrop: {user.governance.airdrop.availableAmount.formatted}</p>
          <p>Available: {user.governance.airdrop.isAvailable ? 'Yes' : 'No'}</p>
        </div>
      )}
    </div>
  )
}
```

## Data Structure

The user data is hierarchically organized:

```typescript
{
  balances: {
    token: BalanceResult
    weth: BalanceResult
    eth: BalanceResult
  }
  staking: {
    stakedBalance: BalanceResult
    allowance: BalanceResult
    rewards: {
      outstanding: {
        staking: { available: BalanceResult, pending: BalanceResult }
        weth: { available: BalanceResult, pending: BalanceResult } | null
      }
      claimable: {
        staking: BalanceResult
        weth: BalanceResult | null
      }
    }
    apr: {
      token: { raw: bigint, percentage: number }
      weth: { raw: bigint, percentage: number } | null
    }
  }
  governance: {
    votingPower: BalanceResult
    airdrop: {
      availableAmount: BalanceResult
      allocatedAmount: BalanceResult
      isAvailable: boolean
    } | null
  }
}
```

## BalanceResult

All balance values follow this structure:

```typescript
{
  raw: bigint          // Raw value in wei
  formatted: string    // Human-readable value
  usd?: string        // USD value (if pricing available)
}
```

## Returns

- `data`: User data or null if not connected
- `isLoading`: Loading state
- `error`: Error if query failed

## Notes

- All data comes from a single multicall for maximum efficiency
- Automatically refetches when user changes
- USD values included when pricing is available from project
