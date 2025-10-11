# Server API

Complete reference for server-side APIs provided by Levr SDK.

## Categories

### Query Functions

Core data fetching functions:

- [project()](./queries/project.md) - Get complete project data
- [projects()](./queries/projects.md) - Get multiple projects data
- [balance()](./queries/balance.md) - Get token balances
- [proposals()](./queries/proposals.md) - Get governance proposals
- [feeReceivers()](./queries/fee-receivers.md) - Get fee receiver information

### Class APIs

Class-based APIs for operations:

- [Stake](./classes/stake.md) - Staking operations
- [Governance](./classes/governance.md) - Governance operations

### Swap Functions

Uniswap V4 swap functionality:

- [quoteV4()](./swaps/quote-v4.md) - Get V4 quote with price impact
- [swapV4()](./swaps/swap-v4.md) - Execute V4 swap
- [quoteV3()](./swaps/quote-v3.md) - Get V3 quote

### Utilities

Helper functions and constants:

- [getUsdPrice()](./utilities/get-usd-price.md) - Get USD prices
- [updateFeeReceiver()](./utilities/update-fee-receiver.md) - Update fee receiver address
- [Constants](./utilities/constants.md) - Exported constants

## Quick Example

```typescript
import { project, Stake } from 'levr-sdk'
import { createPublicClient, createWalletClient, http } from 'viem'
import { base } from 'viem/chains'

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

// Get project data
const projectData = await project({
  publicClient,
  factoryAddress: '0x...',
  clankerToken: '0x...',
})

// Use staking
const stake = new Stake({
  wallet: walletClient,
  publicClient,
  stakingAddress: projectData.staking,
  tokenAddress: projectData.token.address,
  tokenDecimals: 18,
})

await stake.stake(1000n)
```
