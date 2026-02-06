# Server API

Complete reference for server-side APIs provided by Levr SDK.

## Categories

### Query Functions

Core data fetching functions:

- [getProject()](./queries/project.md) - Get project data (static + dynamic)
- [getStaticProject()](./queries/static-project.md) - Get static project data only
- [getUser()](./queries/user.md) - Get user data (balances, staking, voting power)
- [proposals()](./queries/proposals.md) - Get governance proposals with vote receipts
- [proposal()](./queries/proposal.md) - Get single proposal by ID
- [getAirdropStatus()](./queries/airdrop-status.md) - Get multi-recipient airdrop status with IPFS integration
- [getFactoryConfig()](./queries/factory.md) - Get factory configuration (governance parameters)
- [fetchVaultData()](./queries/vault.md) - Get vault allocation data
- [getVaultStatus()](./queries/vault.md) - Compute vault status with messages
- [balance()](./queries/balance.md) - Get token balances (used internally by getUser)
- [feeReceivers()](./queries/fee-receivers.md) - Get fee receiver information
- [configureSplits()](./queries/fee-receivers.md#configure-splits-params) - Configure fee splitter splits
- [updateRecipientToSplitter()](./queries/fee-receivers.md#update-recipient-to-splitter-params) - Update fee recipient to splitter

::: info
`getProjects()` has been removed. Use the [`useProjects`](../client-hooks/query/use-projects.md) hook instead for project listing with real-time updates.
:::

### Deployment Functions

Deploy and register tokens:

- [deployV4()](./deployment/deploy-v4.md) - Deploy a new Clanker token and register with Levr (atomic)
- [buildCalldatasV4()](./deployment/build-calldatas-v4.md) - Low-level calldata builder for custom deployment flows

### Class APIs

Class-based APIs for operations:

- [Stake](./classes/stake.md) - Staking operations
- [Governance](./classes/governance.md) - Governance operations

### Swap Functions

Uniswap V3/V4 swap functionality:

- [quote](./swaps/quote.md) - Unified quote API for V3 and V4 (read & bytecode methods)
- [swapV4()](./swaps/swap-v4.md) - Execute V4 swap

### Utilities

Helper functions and constants:

- [getUsdPrice()](./utilities/get-usd-price.md) - Get USD prices
- [updateFeeReceiver()](./utilities/update-fee-receiver.md) - Update fee receiver address
- [Constants](./utilities/constants.md) - Exported constants (includes `GET_VAULT_ADDRESS`, `GET_FEE_SPLITTER_ADDRESS`)

## Quick Example

```typescript
import { getStaticProject, getProject, Stake } from 'levr-sdk'
import { createPublicClient, createWalletClient, http } from 'viem'
import { base } from 'viem/chains'

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

// 1. Get static project data (cache this)
const staticProject = await getStaticProject({
  publicClient,
  clankerToken: '0x...',
})

if (!staticProject?.isRegistered) {
  throw new Error('Project not registered')
}

// 2. Get dynamic project data
const projectData = await getProject({
  publicClient,
  staticProject,
})

if (!projectData) {
  throw new Error('Project not found')
}

// 3. Use staking
const stake = new Stake({
  wallet: walletClient,
  publicClient,
  project: projectData,
})

await stake.approve(1000)
await stake.stake(1000)
```
