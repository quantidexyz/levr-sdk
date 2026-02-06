# Levr SDK Documentation

Complete documentation for the Levr SDK - a TypeScript SDK for building governance, staking, and liquidity management applications on Uniswap V4.

## 📚 Documentation Structure

### Core Guides

- **[Getting Started](./getting-started.md)** - Installation, setup, and basic usage
- **[Quick Reference](./QUICK-REFERENCE.md)** - Fast lookup for common patterns and data access
- **[Architecture](./architecture.md)** - Understanding the zero-duplicate design
- **[Advanced Usage](./advanced-usage.md)** - Advanced patterns and techniques
- **[Migration Guide](./MIGRATION-GUIDE.md)** - Upgrading from older versions

### Client Hooks (React)

Complete reference for all React hooks:

**Query Hooks:**

- [useProject](./client-hooks/query/use-project.md) - Project data (dynamic + static)
- [useProjects](./client-hooks/query/use-projects.md) - List of projects
- [useUser](./client-hooks/query/use-user.md) - User data
- [useMetrics](./client-hooks/query/use-metrics.md) - Global protocol metrics
- [useProposals](./client-hooks/query/use-proposals.md) - Proposals list
- [useProposal](./client-hooks/query/use-proposal.md) - Single proposal
- [useAirdropStatus](./client-hooks/query/use-airdrop-status.md) - Multi-recipient airdrop status
- [useVault](./client-hooks/query/use-vault.md) - Vault allocation status
- [useFactory](./client-hooks/query/use-factory.md) - Factory configuration

**Mutation Hooks:**

- [useStake](./client-hooks/mutation/use-stake.md) - Staking operations
- [useSwap](./client-hooks/mutation/use-swap.md) - Swap operations
- [useGovernance](./client-hooks/mutation/use-governance.md) - Governance operations
- [useTokenAdmin](./client-hooks/mutation/use-token-admin.md) - Token admin operations
- [useFeeReceivers](./client-hooks/mutation/use-fee-receivers.md) - Fee receiver management
- [useConfigureSplits](./client-hooks/mutation/use-configure-splits.md) - Fee splitting configuration
- [useVaultClaim](./client-hooks/mutation/use-vault-claim.md) - Claim vaulted tokens
- [useDeploy](./client-hooks/mutation/use-deploy.md) - Deploy tokens
- [usePrepare](./client-hooks/mutation/use-prepare.md) - Prepare deployment
- [useRegister](./client-hooks/mutation/use-register.md) - Register tokens

**Utility Hooks:**

- [useClanker](./client-hooks/utility/use-clanker.md) - Clanker SDK instance
- [useSetClankerToken](./client-hooks/utility/use-set-clanker-token.md) - Set active token
- [useLevrRefetch](./client-hooks/utility/use-levr-refetch.md) - Manual refetch control
- [useGovernanceCycle](./client-hooks/utility/use-governance-cycle.md) - Manage cycle selection

### Server API

Server-side functions and classes:

**Query Functions:**

- [getProject()](./server-api/queries/project.md) - Get project data (dynamic + static)
- [getStaticProject()](./server-api/queries/static-project.md) - Get static project data only
- [getProjects()](./server-api/queries/projects.md) - _(Removed - use `useProjects` hook)_
- [getUser()](./server-api/queries/user.md) - Get user data
- [proposals()](./server-api/queries/proposals.md) - Get proposals
- [proposal()](./server-api/queries/proposal.md) - Get single proposal
- [balance()](./server-api/queries/balance.md) - Get token balances
- [feeReceivers()](./server-api/queries/fee-receivers.md) - Get fee receivers
- [configureSplits()](./server-api/queries/fee-receivers.md#configure-splits-params) - Configure fee splitter
- [updateRecipientToSplitter()](./server-api/queries/fee-receivers.md#update-recipient-to-splitter-params) - Update to splitter
- [getAirdropStatus()](./server-api/queries/airdrop-status.md) - Get multi-recipient airdrop status
- [getFactoryConfig()](./server-api/queries/factory.md) - Get factory configuration
- [fetchVaultData()](./server-api/queries/vault.md) - Get vault data
- [getVaultStatus()](./server-api/queries/vault.md) - Compute vault status

**Classes:**

- [Stake](./server-api/classes/stake.md) - Staking class
- [Governance](./server-api/classes/governance.md) - Governance class

**Swap Functions:**

- [quote](./server-api/swaps/quote.md) - V3/V4 quote API
- [swapV4()](./server-api/swaps/swap-v4.md) - Execute V4 swap

**Utilities:**

- [getUsdPrice()](./server-api/utilities/get-usd-price.md) - Get USD prices
- [updateFeeReceiver()](./server-api/utilities/update-fee-receiver.md) - Update fee receiver
- [Constants](./server-api/utilities/constants.md) - Contract addresses and constants

## 🏗️ Architecture Overview

### Zero-Duplicate Design

The SDK uses a hierarchical data flow to eliminate duplicate RPC calls:

```
PROJECT (Single Multicall)
  ↓ (provides data to)
  ├→ USER (Single Multicall)
  ├→ POOL (Single Multicall)
  └→ PROPOSALS (Efficient Query)
```

**Result:** 37-53% fewer RPC calls compared to naive approach.

### Data Sources

| Data Type            | Source          | Where to Access                              |
| -------------------- | --------------- | -------------------------------------------- |
| Token info           | `project`       | `project.data.token`                         |
| Contract addresses   | `project`       | `project.data.{treasury, governor, staking}` |
| Pool info            | `project`       | `project.data.pool`                          |
| Treasury stats       | `project`       | `project.data.treasuryStats`                 |
| Staking stats (pool) | `project`       | `project.data.stakingStats`                  |
| Governance stats     | `project`       | `project.data.governanceStats`               |
| Fee receivers        | `project`       | `project.data.feeReceivers`                  |
| Fee splitter         | `project`       | `project.data.feeSplitter`                   |
| Pricing (USD)        | `project`       | `project.data.pricing` (dynamic)             |
| User balances        | `user`          | `user.data.balances`                         |
| User staking         | `user`          | `user.data.staking`                          |
| User voting power    | `user`          | `user.data.votingPower`                      |
| Pool state           | `pool`          | `pool.data`                                  |
| Proposals            | `proposals`     | `proposals.data`                             |
| Airdrop status       | `airdropStatus` | `airdropStatus.data.recipients`              |
| Factory config       | `factoryConfig` | `factoryConfig.data`                         |
| Vault status         | N/A (separate)  | `useVault(token).data`                       |

### Refetch Strategy

Action-based refetch methods update only what changed:

| Action        | Refetches                  | Reason                                      |
| ------------- | -------------------------- | ------------------------------------------- |
| Trade         | user + pool                | Balances and pool state changed             |
| Stake/Unstake | user + project             | User staking and pool stats changed         |
| Claim         | user only                  | User balances and claimable rewards changed |
| Accrue        | project only               | Outstanding rewards from LP locker changed  |
| Vote          | user + proposals           | Vote receipt recorded                       |
| Propose       | proposals + project        | New proposal, active count changed          |
| Execute       | project + proposals + user | Everything may change                       |
| Airdrop       | project                    | Treasury balance and airdrop status changed |

## 🚀 Quick Start

```typescript
import { LevrProvider, useProject, useUser, useStake } from 'levr-sdk/client'

function App() {
  return (
    <LevrProvider>
      <ProjectPage clankerToken="0x..." />
    </LevrProvider>
  )
}

function ProjectPage({ clankerToken }) {
  const setClankerToken = useSetClankerToken()
  const { data: project } = useProject()
  const { data: user } = useUser()
  const { stake } = useStake()

  useEffect(() => {
    setClankerToken(clankerToken)
  }, [clankerToken])

  return (
    <div>
      <h1>{project?.token.name}</h1>
      <p>Your Balance: {user?.balances.token.formatted}</p>
      <p>Staked: {user?.staking.stakedBalance.formatted}</p>
      <button onClick={() => stake.mutate(1000)}>Stake</button>
    </div>
  )
}
```

## 📖 Documentation Status

**Last Updated:** February 6, 2026
**Version:** Reflects current zero-duplicate architecture with paired token generalization
**Status:** ✅ Production Ready

All documentation has been updated to match the current codebase implementation.

## 🔗 External Resources

- [GitHub Repository](https://github.com/levr-protocol/levr-sdk)
- [Levr Protocol](https://levr.xyz)
- [Uniswap V4 Docs](https://docs.uniswap.org/contracts/v4/overview)
