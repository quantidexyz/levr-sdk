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

    // Helpers
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

  // Get data from context
  const { data: user } = useUser()
  const { data: project } = useProject()

  return (
    <div>
      <h2>Staking</h2>
      <p>Your Balance: {user?.balances.token.formatted}</p>
      <p>Staked: {user?.staking.stakedBalance.formatted}</p>
      <p>Token APR: {project?.stakingStats?.apr.token.percentage}%</p>
      {project?.stakingStats?.apr.weth && (
        <p>WETH APR: {project.stakingStats.apr.weth.percentage}%</p>
      )}

      <h3>Rewards</h3>
      <p>Outstanding: {project?.stakingStats?.outstandingRewards.staking.available.formatted}</p>
      <p>Claimable: {user?.staking.claimableRewards.staking.formatted}</p>

      <button onClick={handleStake} disabled={isStaking}>
        {needsApproval('1000') ? 'Approve' : 'Stake'}
      </button>

      <button onClick={() => unstake.mutate({ amount: 500 })} disabled={isUnstaking}>
        Unstake
      </button>

      <button onClick={() => claim.mutate()} disabled={isClaiming}>
        Claim Rewards
      </button>

      <button onClick={() => accrueAllRewards.mutate()} disabled={isAccruing}>
        Accrue Rewards
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
import { useUser, useProject } from 'levr-sdk/client'

const { data: user } = useUser()
const { data: project } = useProject()

// User-specific data
user?.balances.token // Token balance
user?.balances.weth // WETH balance
user?.staking.stakedBalance // User's staked amount
user?.staking.allowance // User's spending allowance
user?.staking.claimableRewards.staking // User's claimable token rewards
user?.staking.claimableRewards.weth // User's claimable WETH rewards
user?.votingPower // User's voting power

// Pool-level stats (from project)
project?.stakingStats?.totalStaked // Total tokens staked by all users
project?.stakingStats?.apr.token // Token APR
project?.stakingStats?.apr.weth // WETH APR
project?.stakingStats?.outstandingRewards.staking.available // Available pool rewards
project?.stakingStats?.outstandingRewards.staking.pending // Pending pool rewards
project?.stakingStats?.rewardRates.token // Token reward rate per second
```

::: tip Protocol Fees
Levr charges a variable protocol fee (set by Levr team) on stake and unstake operations. The fee is deducted from the amount you stake/unstake.
:::

::: info Voting Power Impact
Unstaking reduces your voting power proportionally. The `unstake` mutation returns your new voting power, which you can use to show the impact in your UI before users confirm. Partial unstakes reduce time accumulation by the same percentage as tokens unstaked.
:::
