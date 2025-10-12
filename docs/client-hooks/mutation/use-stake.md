# useStake

Complete staking functionality with mutations and queries.

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

    // Queries
    allowance,
    poolData,
    userData,
    balances,
    wethRewardRate,
    aprBpsWeth,

    // Convenience accessors
    stakedBalance,
    totalStaked,
    tokenBalance,
    needsApproval,

    // Loading states
    isLoadingPoolData,
    isLoadingUserData,
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
    const amount = 1000n // Amount in wei
    if (needsApproval) {
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
      <p>Total Staked: {totalStaked?.formatted}</p>
      <p>APR: {aprBpsWeth ? (Number(aprBpsWeth) / 100).toFixed(2) : '—'}%</p>

      <button onClick={handleStake} disabled={stake.isPending}>
        {needsApproval ? 'Approve' : 'Stake'}
      </button>

      <button
        onClick={() => unstake.mutate({ amount: 500n })}
        disabled={unstake.isPending}
      >
        Unstake
      </button>

      <button onClick={() => claim.mutate()} disabled={claim.isPending}>
        Claim Rewards
      </button>
    </div>
  )
}
```

## Options

- `onStakeSuccess`: Callback after successful stake
- `onUnstakeSuccess`: Callback after successful unstake
- `onClaimSuccess`: Callback after successful claim

## Mutations

- `approve.mutate(amount)`: Approve tokens for staking
- `stake.mutate(amount)`: Stake tokens (protocol fee applies)
- `unstake.mutate({ amount, to? })`: Unstake tokens (protocol fee applies, returns newVotingPower)
- `claim.mutate()`: Claim all rewards
- `accrueRewards.mutate(tokenAddress)`: Manually accrue rewards for a token
- `accrueAllRewards.mutate()`: Manually accrue all rewards

::: tip Protocol Fees
Levr charges a variable protocol fee (set by Levr team) on stake and unstake operations. The fee is deducted from the amount you stake/unstake.
:::

::: info Voting Power Impact
Unstaking reduces your voting power proportionally. The `unstake` mutation returns your new voting power, which you can use to show the impact in your UI before users confirm. Partial unstakes reduce time accumulation by the same percentage as tokens unstaked.
:::
