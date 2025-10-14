# useLevrRefetch

Manual control over query refetching.

## Usage

```typescript
import { useLevrRefetch } from 'levr-sdk/client'

function RefreshButton() {
  const refetch = useLevrRefetch()

  return (
    <div>
      {/* Core refetches */}
      <button onClick={() => refetch.all()}>Refresh All</button>
      <button onClick={() => refetch.user()}>Refresh User</button>
      <button onClick={() => refetch.project()}>Refresh Project</button>
      <button onClick={() => refetch.pool()}>Refresh Pool</button>
      <button onClick={() => refetch.proposals()}>Refresh Proposals</button>

      {/* Action-based refetches */}
      <button onClick={() => refetch.afterTrade()}>After Trade</button>
      <button onClick={() => refetch.afterStake()}>After Stake</button>
      <button onClick={() => refetch.afterClaim()}>After Claim</button>
      <button onClick={() => refetch.afterAccrue()}>After Accrue</button>
      <button onClick={() => refetch.afterVote()}>After Vote</button>
      <button onClick={() => refetch.afterProposal()}>After Proposal</button>
      <button onClick={() => refetch.afterExecute()}>After Execute</button>
      <button onClick={() => refetch.afterAirdrop()}>After Airdrop</button>
    </div>
  )
}
```

## Core Refetch Methods

- `all()`: Refetch all queries
- `user()`: Refetch user query (balances, staking, voting power)
- `project()`: Refetch project query (token, contracts, treasury, staking stats, governance stats)
- `pool()`: Refetch pool query (state, liquidity)
- `proposals()`: Refetch proposals query

## Action-Based Refetch Methods

Smart refetch methods that only update what changed:

- `afterTrade()`: Refetch user + pool (balances and pool state changed)
- `afterStake()`: Refetch user + project (balances, staking, voting power, treasury changed)
- `afterUnstake()`: Refetch user + project (same as afterStake)
- `afterClaim()`: Refetch user only (balances, claimable rewards changed)
- `afterAccrue()`: Refetch project only (outstanding rewards from LP locker changed)
- `afterVote()`: Refetch user + proposals (vote receipt recorded)
- `afterProposal()`: Refetch proposals + project (new proposal, active count changed)
- `afterExecute()`: Refetch project + proposals + user (treasury, proposal status, rewards may change)
- `afterAirdrop()`: Refetch project (treasury balance, airdrop status changed)
