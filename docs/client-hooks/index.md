# Client Hooks

Complete reference for all React hooks provided by Levr SDK.

## Categories

### Query Hooks

Read-only data access hooks:

- [useProject](./query/use-project.md) - Project data (static + dynamic: token, contracts, pool, treasury, staking stats, governance stats, pricing)
- [useProjects](./query/use-projects.md) - List of all registered projects
- [useUser](./query/use-user.md) - User data (balances, staking, voting power)
- [usePool](./query/use-pool.md) - Pool state (liquidity, price, fees)
- [useProposals](./query/use-proposals.md) - Governance proposals with vote receipts
- [useProposal](./query/use-proposal.md) - Single proposal by ID
- [useAirdropStatus](./query/use-airdrop-status.md) - Treasury airdrop status (separate query)

### Mutation Hooks

Hooks with both queries and mutations:

- [useStake](./mutation/use-stake.md) - Staking operations (approve, stake, unstake, claim, accrue)
- [useSwap](./mutation/use-swap.md) - Swap operations with quotes
- [useGovernance](./mutation/use-governance.md) - Governance operations (propose, vote, execute, airdrop)
- [useFeeReceivers](./mutation/use-fee-receivers.md) - Fee receiver management
- [useDeploy](./mutation/use-deploy.md) - Deploy and register Clanker tokens
- [usePrepare](./mutation/use-prepare.md) - Prepare contracts for deployment
- [useRegister](./mutation/use-register.md) - Register existing tokens

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
      <p>Voting Power: {user?.votingPower} Token Days</p>
      <button onClick={() => stake.mutate(1000)}>Stake</button>
    </div>
  )
}
```
