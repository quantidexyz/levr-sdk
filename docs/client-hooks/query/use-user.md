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
      <p>Claimable Token Rewards: {user.staking.claimableRewards.staking.formatted}</p>
      {user.staking.claimableRewards.weth && (
        <p>Claimable WETH Rewards: {user.staking.claimableRewards.weth.formatted}</p>
      )}

      <h2>Voting</h2>
      <p>Voting Power: {user.votingPower.formatted}</p>
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
    claimableRewards: {
      staking: BalanceResult
      weth: BalanceResult | null
    }
  }
  votingPower: BalanceResult
}
```

**Note:** Pool-level staking stats (totalStaked, apr, outstandingRewards, rewardRates) are in `project.stakingStats`. Airdrop status is in `project.airdrop`.

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
- Pool-level stats (APR, outstanding rewards) are in `project.stakingStats`
- Airdrop status is in `project.airdrop`
- User query only contains user-specific data (balances, staking, voting power)
