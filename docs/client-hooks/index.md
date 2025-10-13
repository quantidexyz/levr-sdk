# Client Hooks

Complete reference for all React hooks provided by Levr SDK.

## Categories

### Query Hooks

Read-only data access hooks:

- [useProject](./query/use-project.md) - Project data (token, contracts, pool, fee receivers, treasury, governance)
- [useUser](./query/use-user.md) - User data (balances, staking, governance)
- [useProposals](./query/use-proposals.md) - Governance proposals
- [useClankerToken](./query/use-clanker-token.md) - Token metadata

### Mutation Hooks

Hooks with both queries and mutations:

- [useStake](./mutation/use-stake.md) - Staking operations
- [useSwap](./mutation/use-swap.md) - Swap operations
- [useGovernance](./mutation/use-governance.md) - Governance operations
- [useFeeReceivers](./mutation/use-fee-receivers.md) - Fee receiver management

### Utility Hooks

Helper hooks:

- [useSetClankerToken](./utility/use-set-clanker-token.md) - Update global token
- [useLevrRefetch](./utility/use-levr-refetch.md) - Manual refetch control
- [useClanker](./utility/use-clanker.md) - Clanker SDK instance

## Quick Example

```typescript
import { useProject, useUser, useStake } from 'levr-sdk/client'

function Component() {
  const { data: project } = useProject()
  const { data: user } = useUser()
  const { stake } = useStake()

  return (
    <div>
      <h1>{project?.token.name}</h1>
      <p>Balance: {user?.balances.token.formatted}</p>
      <p>Staked: {user?.staking.stakedBalance.formatted}</p>
      <p>Voting Power: {user?.governance.votingPower.formatted}</p>
      <button onClick={() => stake.mutate(1000n)}>Stake</button>
    </div>
  )
}
```
