# useStake

Complete staking functionality with mutations and data from context.

## Usage

```typescript
import { useStake } from 'levr-sdk/client'

function StakingInterface() {
  const {
    // Mutations
    approve,
    stake,
    unstake,
    claim,
    accrueRewards,
    accrueAllRewards,

    // Data from context
    user,
    project,

    // Convenience accessors (from user.data)
    tokenBalance,
    stakedBalance,
    allowance,
    rewards,
    apr,
    needsApproval,

    // Loading states
    isLoading,
    isApproving,
    isStaking,
    isUnstaking,
    isClaiming,
    isAccruing,
  } = useStake({
    onStakeSuccess: (receipt) => {
      console.log('Staked!', receipt)
    },
    onUnstakeSuccess: (receipt) => {
      console.log('Unstaked!', receipt)
    },
    onClaimSuccess: (receipt) => {
      console.log('Claimed rewards!', receipt)
    },
  })

  const handleStake = () => {
    const amount = 1000n
    if (needsApproval('1000')) {
      approve.mutate(amount)
    } else {
      stake.mutate(amount)
    }
  }

  return (
    <div>
      <h2>Staking</h2>
      <p>Your Balance: {tokenBalance?.formatted}</p>
      <p>Staked: {stakedBalance?.formatted}</p>
      <p>Token APR: {apr?.token.percentage}%</p>
      {apr?.weth && <p>WETH APR: {apr.weth.percentage}%</p>}

      <h3>Rewards</h3>
      <p>Outstanding: {rewards?.outstanding.staking.available.formatted}</p>
      <p>Claimable: {rewards?.claimable.staking.formatted}</p>

      <button onClick={handleStake} disabled={isStaking}>
        {needsApproval('1000') ? 'Approve' : 'Stake'}
      </button>

      <button onClick={() => unstake.mutate({ amount: 500n })} disabled={isUnstaking}>
        Unstake
      </button>

      <button onClick={() => claim.mutate()} disabled={isClaiming}>
        Claim Rewards
      </button>
    </div>
  )
}
```

## Options

**Callback parameters (optional):**

- `onApproveSuccess`: Callback after successful approval
- `onStakeSuccess`: Callback after successful stake
- `onUnstakeSuccess`: Callback after successful unstake
- `onClaimSuccess`: Callback after successful claim
- `onAccrueSuccess`: Callback after successful reward accrual

## Mutations

- `approve.mutate(amount)`: Approve tokens for staking
- `stake.mutate(amount)`: Stake tokens (protocol fee applies)
- `unstake.mutate({ amount, to? })`: Unstake tokens (protocol fee applies, returns newVotingPower)
- `claim.mutate()`: Claim all rewards
- `accrueRewards.mutate(tokenAddress)`: Manually accrue rewards for a token
- `accrueAllRewards.mutate()`: Manually accrue all rewards

## Data Access

All staking data comes from `user` and `project` context queries:

```typescript
// Access via context queries
user.data?.balances.token // Token balance
user.data?.balances.weth // WETH balance
user.data?.staking.stakedBalance // Staked amount
user.data?.staking.allowance // Current allowance
user.data?.staking.rewards // Reward information
user.data?.staking.apr // APR information

// Or use convenience accessors
tokenBalance // = user.data?.balances.token
stakedBalance // = user.data?.staking.stakedBalance
allowance // = user.data?.staking.allowance
rewards // = user.data?.staking.rewards
apr // = user.data?.staking.apr
```

::: tip Protocol Fees
Levr charges a variable protocol fee (set by Levr team) on stake and unstake operations. The fee is deducted from the amount you stake/unstake.
:::

::: info Voting Power Impact
Unstaking reduces your voting power proportionally. The `unstake` mutation returns your new voting power, which you can use to show the impact in your UI before users confirm. Partial unstakes reduce time accumulation by the same percentage as tokens unstaked.
:::
