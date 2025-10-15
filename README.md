# Levr SDK

<div align="center">

[![npm latest package][npm-latest-image]][npm-url]
[![Build Status][ci-image]][ci-url]
[![License][license-image]][license-url]
[![npm downloads][npm-downloads-image]][npm-url]
[![Follow on Twitter][twitter-image]][twitter-url]

</div>

TypeScript SDK for interacting with Levr protocol - a decentralized governance, staking, and liquidity management system built on Uniswap v4.

## Features

- 🎯 **Type-Safe** - Full TypeScript support with comprehensive types
- 🔄 **Zero Duplication** - Single multicalls per data group (37-53% fewer RPC calls)
- ⚡ **Centralized Provider** - All queries in one place with smart refetch management
- 🪝 **React Hooks** - Easy integration with React applications
- 🔌 **Server & Client** - Works in both server and client environments
- 📦 **Tree-Shakeable** - Import only what you need
- 💰 **USD Pricing** - Integrated USD price calculations for tokens, balances, and APR
- 📊 **Price Impact** - Real-time price impact calculation for swaps
- ⚙️ **Manual Accrual** - Explicit reward accrual system for security and predictability

## Installation

```bash
npm install levr-sdk
# or
bun add levr-sdk
# or
yarn add levr-sdk
```

## Quick Start

### Client-Side (React) Usage

For React applications, use the centralized provider pattern:

```typescript
// 1. Wrap your app with LevrProvider
import { LevrProvider } from 'levr-sdk/client'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={wagmiConfig}>
        <LevrProvider>
          <YourApp />
        </LevrProvider>
      </WagmiConfig>
    </QueryClientProvider>
  )
}

// 2. Set the active token in your pages
import { useSetClankerToken, useProject } from 'levr-sdk/client'

export function ProjectPage({ clankerToken }: { clankerToken: `0x${string}` }) {
  const { data: project, isLoading } = useProject()

  // Automatically sets and updates when clankerToken prop changes
  useSetClankerToken(clankerToken)

  if (isLoading) return <div>Loading...</div>
  if (!project) return <div>Project not found</div>

  return (
    <div>
      <h1>{project.token.name}</h1>
      <p>Treasury: {project.treasuryStats?.balance.formatted}</p>
      <StakeComponent />
      <SwapComponent />
      <GovernanceComponent />
    </div>
  )
}

// 3. Use hooks in child components - they automatically share queries!
import { useStake, useUser } from 'levr-sdk/client'

function StakeComponent() {
  const { data: user } = useUser()
  const { stake, needsApproval } = useStake({
    onStakeSuccess: () => {
      toast.success('Staked successfully!')
      // All related data automatically refetches
    },
  })

  return (
    <div>
      <p>Balance: {user?.balances.token.formatted}</p>
      <p>Staked: {user?.staking.stakedBalance.formatted}</p>
      <button onClick={() => stake.mutate(amount)}>
        Stake
      </button>
    </div>
  )
}
```

### Server-Side Usage

For server-side operations or scripts:

```typescript
import { getProject, getUser, Stake, Governance } from 'levr-sdk'
import { createPublicClient, createWalletClient, http } from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

// Initialize clients
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

const walletClient = createWalletClient({
  chain: base,
  transport: http(),
  account: privateKeyToAccount('0x...'),
})

// Get project data
const projectData = await getProject({
  publicClient,
  clankerToken: '0x...',
})

// Get user data (includes balances, staking, voting power)
const userData = await getUser({
  publicClient,
  userAddress: '0x...',
  project: projectData,
})

console.log('Balance:', userData.balances.token.formatted)
console.log('Staked:', userData.staking.stakedBalance.formatted)

// Stake tokens
const stake = new Stake({
  wallet: walletClient,
  publicClient,
  project: projectData,
})

// Approve and stake
await stake.approve(1000) // Or '1000' or 1000n
await stake.stake(1000)

// Governance operations
const governance = new Governance({
  wallet: walletClient,
  publicClient,
  project: projectData,
})

// Propose a transfer
const { receipt, proposalId } = await governance.proposeTransfer(
  '0x...', // recipient
  parseUnits('1000', 18), // amount
  'Fund development' // description
)
```

## Available Hooks (Client)

### Query Hooks

Direct context accessors for read-only data:

```typescript
import {
  useProject, // Project data (token, contracts, treasury, staking stats, governance stats)
  useUser, // User data (balances, staking, voting power)
  usePool, // Pool state (liquidity, price, fees)
  useProposals, // Proposals with vote receipts
  useClankerToken, // Token metadata (admin, image, etc.)
} from 'levr-sdk/client'

const { data: project } = useProject()
const { data: user } = useUser()
const { data: pool } = usePool()
const { data: proposals } = useProposals()
const { data: tokenData } = useClankerToken()
```

### Mutation Hooks

Hooks with both queries and mutations:

```typescript
import {
  useStake, // Staking operations
  useSwap, // Swap operations
  useGovernance, // Governance operations
  useFeeReceivers, // Fee receiver management
} from 'levr-sdk/client'
```

#### `useStake()`

```typescript
const {
  // Mutations
  approve,
  stake,
  unstake,
  claim,
  accrueRewards,
  accrueAllRewards,

  // Helper
  needsApproval,

  // Loading states
  isApproving,
  isStaking,
  isUnstaking,
  isClaiming,
} = useStake({
  onStakeSuccess: (receipt) => console.log('Staked!', receipt),
  onUnstakeSuccess: (receipt) => console.log('Unstaked!', receipt),
  onClaimSuccess: (receipt) => console.log('Claimed!', receipt),
})

// Get data from context
const { data: user } = useUser()
const { data: project } = useProject()

// Access staking data
user?.balances.token // Token balance
user?.staking.stakedBalance // User's staked amount
user?.staking.claimableRewards // User's claimable rewards
project?.stakingStats?.totalStaked // Total staked by all users
project?.stakingStats?.apr // APR percentages

// Use mutations - automatically refetches related data
stake.mutate(1000) // Or '1000' or 1000n
```

#### `useSwap()`

```typescript
const {
  // Mutation
  swap,

  // Quote query
  quote,

  // Helper
  buildSwapConfig,

  // Loading
  isSwapping,
} = useSwap({
  quoteParams: {
    zeroForOne: true, // true = token -> WETH, false = WETH -> token
    amountIn: '100',
    amountInDecimals: 18,
    amountOutDecimals: 18,
  },
  onSwapSuccess: (receipt) => console.log('Swapped!', receipt),
})

// Get data from context
const { data: user } = useUser()
const { data: project } = useProject()

// Access balances and pool
user?.balances.token // Token balance
user?.balances.weth // WETH balance
project?.pool?.poolKey // Pool key for swaps

// Access quote with price impact and hook fees
console.log(quote.data?.priceImpactBps) // 0.5 (0.5% impact)
console.log(quote.data?.hookFees) // { type: 'static', clankerFee: 500, ... }

// Build and execute swap
const config = buildSwapConfig({
  zeroForOne: true,
  amountIn: 100, // Accepts number, string, or bigint
  amountInDecimals: 18,
  minAmountOut: ((quote.data.amountOut * 99n) / 100n).toString(), // 1% slippage
})
swap.mutate(config)
```

#### `useGovernance()`

```typescript
const {
  // Mutations
  proposeTransfer,
  proposeBoost,
  vote,
  executeProposal,
  claimAirdrop,

  // Helpers
  buildProposeTransferConfig,
  buildProposeBoostConfig,

  // Loading states
  isProposing,
  isVoting,
  isExecuting,
  isClaiming,
} = useGovernance({
  onVoteSuccess: (receipt) => console.log('Voted!', receipt),
  onExecuteProposalSuccess: (receipt) => console.log('Executed!', receipt),
})

// Get data from context
const { data: user } = useUser()
const { data: project } = useProject()
const { data: proposals } = useProposals()

// Access governance data
project?.governanceStats?.currentCycleId // Current cycle
project?.treasury // Treasury address
project?.governor // Governor address
project?.airdrop // Airdrop status
user?.votingPower // User's voting power in Token Days (string)
proposals?.proposals // List of proposals with vote receipts

// Use mutations
const config = buildProposeTransferConfig({
  recipient: '0x...',
  amount: '1000',
  description: 'Fund development',
})
proposeTransfer.mutate(config)
```

#### `useFeeReceivers()`

```typescript
const { mutate } = useFeeReceivers({
  onSuccess: (hash) => console.log('Updated fee receiver', hash),
})

// Get fee receiver data from project context
const { data: project } = useProject()
const feeReceivers = project?.feeReceivers

// Update a fee receiver
mutate.mutate({
  clankerToken: project.token.address,
  rewardIndex: 0,
  newRecipient: '0x...',
})
```

### Utility Hooks

```typescript
import {
  useSetClankerToken, // Update global token context
  useLevrRefetch, // Manual refetch control
  useClanker, // Clanker SDK instance
} from 'levr-sdk/client'

// Automatically update active token (in page/route components)
useSetClankerToken('0x...')

// Manual refetch control
const refetch = useLevrRefetch()
await refetch.all() // Refetch everything
await refetch.user() // Refetch user data
await refetch.project() // Refetch project data
await refetch.afterStake() // Smart refetch after stake
await refetch.afterTrade() // Smart refetch after swap

// Get Clanker SDK instance
const clanker = useClanker()
```

## Centralized Refetch Coverage

The SDK provides **100% refetch coverage** with smart cross-domain awareness:

| Action                  | Auto-Refetches                                    |
| ----------------------- | ------------------------------------------------- |
| **Trade (Swap)**        | User (balances), Pool (state)                     |
| **Stake/Unstake**       | User (balances, staking, voting), Project (stats) |
| **Claim**               | User only (balances, claimable rewards)           |
| **Accrue**              | Project only (outstanding rewards)                |
| **Vote**                | User, Proposals (vote receipts)                   |
| **Propose**             | Proposals, Project (active count)                 |
| **Execute**             | Project, Proposals, User (all may change)         |
| **Airdrop**             | Project (treasury, airdrop status)                |
| **Wallet/Chain Change** | All Queries                                       |

All mutations automatically trigger appropriate refetches - no manual coordination needed!

## API Reference

### Server-Side APIs

#### `getProject()`

Get complete project data including token, contracts, pool, treasury, staking stats, governance stats, and optional USD pricing:

```typescript
import { getProject } from 'levr-sdk'

const projectData = await getProject({
  publicClient,
  clankerToken: '0x...',
  // Optional: Provide oracle client for USD pricing
  oraclePublicClient: mainnetClient, // For WETH/USD and token/USD prices
  userAddress: '0x...', // Optional: for areYouAnAdmin in fee receivers
})

// Access project data
console.log(projectData.token.name) // "MyToken"
console.log(projectData.treasuryStats?.balance.formatted) // "50000.00"
console.log(projectData.stakingStats?.apr.token.percentage) // 15.5
console.log(projectData.governanceStats?.currentCycleId) // 5n

// Access USD pricing (if oracle provided)
console.log(projectData.pricing?.tokenUsd) // "0.05"
console.log(projectData.treasuryStats?.balance.usd) // "$2500.00"
```

#### `getUser()`

Get user-specific data including balances, staking, and voting power:

```typescript
import { getUser, getProject } from 'levr-sdk'

// First get project data (user query needs it)
const projectData = await getProject({
  publicClient,
  clankerToken: '0x...',
})

// Then get user data
const userData = await getUser({
  publicClient,
  userAddress: '0x...',
  project: projectData,
})

// Access user data
console.log(userData.balances.token.formatted) // "1000.0"
console.log(userData.balances.weth.formatted) // "5.5"
console.log(userData.staking.stakedBalance.formatted) // "500.0"
console.log(userData.staking.claimableRewards.staking.formatted) // "10.5"
console.log(userData.votingPower) // "15000" (Token Days as string)
```

#### `Stake` Class

Manage staking operations:

```typescript
import { Stake, getProject } from 'levr-sdk'

// Get project data first
const projectData = await getProject({
  publicClient,
  clankerToken: '0x...',
})

// Create stake instance with project data
const stake = new Stake({
  wallet: walletClient,
  publicClient,
  project: projectData, // All fields from project
})

// Perform operations
await stake.approve(1000) // Accepts number, string, or bigint
await stake.stake(1000)

// Unstake (returns new voting power)
const { receipt, newVotingPower } = await stake.unstake({
  amount: 500, // Accepts number, string, or bigint
  to: '0x...', // Optional
})

// Accrue rewards before claiming
await stake.accrueAllRewards([
  projectData.token.address,
  wethAddress, // Optional: if WETH rewards exist
])

// Claim rewards
await stake.claimRewards()
```

#### `Governance` Class

Manage governance operations:

```typescript
import { Governance, getProject } from 'levr-sdk'

// Get project data first
const projectData = await getProject({
  publicClient,
  clankerToken: '0x...',
})

// Create governance instance with project data
const governance = new Governance({
  wallet: walletClient,
  publicClient,
  project: projectData, // All fields from project
})

// Propose actions
const { receipt, proposalId } = await governance.proposeTransfer(
  '0x...', // recipient
  1000, // amount (accepts number, string, or bigint)
  'Fund development' // description
)

// Or with parseUnits for precise amounts
await governance.proposeTransfer('0x...', parseUnits('1000', 18), 'Fund development')

// Propose boost
await governance.proposeBoost(500) // Accepts number, string, or bigint

// Vote on proposals
await governance.vote(proposalId, true) // true = yes, false = no

// Execute proposals
await governance.executeProposal(proposalId)

// Claim airdrop (if available)
await governance.claimAirdrop()

// Get vote receipt
const receipt = await governance.getVoteReceipt(proposalId, '0x...')
console.log(receipt.hasVoted) // true/false
```

#### `quote` API

Unified quote API for V3 and V4 swaps:

```typescript
import { quote, UNISWAP_V3_QUOTER_V2, WETH } from 'levr-sdk'

const chainId = publicClient.chain.id
const quoterAddress = UNISWAP_V3_QUOTER_V2(chainId)
const wethData = WETH(chainId)

// V3 quote
const v3Quote = await quote.v3.read({
  publicClient,
  quoterAddress,
  tokenIn: wethData.address,
  tokenOut: '0x...', // USDC
  amountIn: parseUnits('1', 18),
  fee: 3000, // 0.3%
})

// V4 quote with price impact and hook fees
const v4Quote = await quote.v4.read({
  publicClient,
  poolKey: {
    currency0: '0x...',
    currency1: '0x...',
    fee: 500,
    tickSpacing: 10,
    hooks: '0x...',
  },
  zeroForOne: true,
  amountIn: parseUnits('100', 18), // Or use bigint directly
  // Optional: Provide pricing for price impact calculation
  pricing: { wethUsd: '2543.21', tokenUsd: '0.05' },
  tokenAddress: '0x...',
  currency0Decimals: 18,
  currency1Decimals: 18,
})

console.log(v4Quote.priceImpactBps) // 0.5 (0.5% impact)
console.log(v4Quote.hookFees) // { type: 'static', clankerFee: 500 }
```

#### `swapV4()`

Execute swaps on Uniswap V4:

```typescript
import { swapV4 } from 'levr-sdk'

const receipt = await swapV4({
  publicClient,
  wallet: walletClient,
  poolKey,
  zeroForOne: true,
  amountIn: parseUnits('100', 18), // Or use number/string
  amountOutMinimum: parseUnits('95', 18),
})
```

#### `getUsdPrice()`

Get USD price for any token paired with WETH:

```typescript
import { getUsdPrice } from 'levr-sdk'

// Get token price in USD
// Uses mainnet for accurate WETH/USDC oracle, testnet for token quote
const { priceUsd, tokenPerWeth, wethPerUsdc } = await getUsdPrice({
  oraclePublicClient: mainnetClient, // For WETH/USDC price (auto-discovers best V3 pool)
  quotePublicClient: testnetClient, // For token/WETH price (your chain)
  tokenAddress: '0x...', // Token to price
  tokenDecimals: 18, // Token decimals (required)
  quoteFee: 3000, // Optional: Pool fee tier (default: 3000 = 0.3%)
})

console.log(`Token price: $${priceUsd}`) // "0.05"
```

## Architecture: Centralized Provider Pattern

The SDK uses a centralized provider pattern that eliminates query duplication and provides 100% refetch coverage:

```
┌─────────────────────────────────────────────────┐
│           LevrProvider (Global)                 │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ Centralized Queries (created once)        │ │
│  │ • Project (token, contracts, treasury,    │ │
│  │   staking stats, governance stats)        │ │
│  │ • User (balances, staking, voting power)  │ │
│  │ • Pool (real-time state)                  │ │
│  │ • Proposals (with vote receipts)          │ │
│  │ • Token Data (metadata)                   │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ Smart Refetch Methods                     │ │
│  │ • afterTrade()   → User + Pool            │ │
│  │ • afterStake()   → User + Project         │ │
│  │ • afterClaim()   → User only              │ │
│  │ • afterAccrue()  → Project only           │ │
│  │ • afterVote()    → User + Proposals       │ │
│  │ • afterProposal() → Proposals + Project   │ │
│  │ • afterExecute() → Project + Proposals +  │ │
│  │                    User                   │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
            ↓ Context shared via hooks
┌─────────────────────────────────────────────────┐
│  Components consume without duplication         │
│  • useProject()  → Shared query                 │
│  • useUser()     → Shared query                 │
│  • usePool()     → Shared query                 │
│  • useProposals() → Shared query                │
│  • useStake()    → Mutations only               │
└─────────────────────────────────────────────────┘
```

### Benefits

✅ **Zero Duplication** - Each query created once, shared across all components  
✅ **37-53% Fewer RPC Calls** - Single multicalls per data group  
✅ **100% Refetch Coverage** - Smart action-based refetches after mutations  
✅ **Better Performance** - Fewer network requests, better caching  
✅ **Type Safety** - Full TypeScript throughout  
✅ **Easy to Use** - Simple hook API, automatic coordination

## Advanced Usage

### Dynamic Token Updates

```typescript
import { useSetClankerToken } from 'levr-sdk/client'

function TokenSwitcher() {
  const setClankerToken = useSetClankerToken()

  const switchToToken = (tokenAddress: `0x${string}`) => {
    setClankerToken(tokenAddress)
    // All queries automatically update!
  }

  return (
    <select onChange={(e) => switchToToken(e.target.value as `0x${string}`)}>
      <option value="0x...">Token A</option>
      <option value="0x...">Token B</option>
    </select>
  )
}
```

### Manual Refetch Control

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

      {/* Action-based smart refetches */}
      <button onClick={() => refetch.afterStake()}>After Stake</button>
      <button onClick={() => refetch.afterTrade()}>After Trade</button>
      <button onClick={() => refetch.afterClaim()}>After Claim</button>
      <button onClick={() => refetch.afterVote()}>After Vote</button>
    </div>
  )
}
```

### Deploying New Tokens

```typescript
import { useDeploy } from 'levr-sdk/client'

function DeployToken() {
  const deploy = useDeploy({
    onSuccess: ({ receipt, address }) => {
      console.log('Deployed to:', address)
    },
  })

  const handleDeploy = () => {
    deploy.mutate({
      name: 'My Token',
      ticker: 'TKN',
      imageUrl: 'ipfs://...',
      description: 'Token description',
      // ... other params
    })
  }

  return <button onClick={handleDeploy}>Deploy</button>
}
```

## Query Keys

All query keys are centralized and exported:

```typescript
import { queryKeys } from 'levr-sdk/client'

// Use in custom queries or invalidations
queryClient.invalidateQueries({
  queryKey: queryKeys.project(clankerToken, chainId),
})
```

## TypeScript Support

Full TypeScript support with comprehensive types:

```typescript
import type {
  Project,
  PoolKey,
  ProposalsResult,
  BalanceResult,
  ClaimParams,
  ProposeTransferConfig,
  // ... many more
} from 'levr-sdk'
```

## Development

```bash
# Install dependencies
bun install

# Type check
bun run type-check

# Run tests
bun test

# Build
bun run build
```

## Documentation

For comprehensive documentation:

- **[Getting Started](./docs/getting-started.md)** - Installation and setup
- **[Quick Reference](./docs/QUICK-REFERENCE.md)** - Fast lookup for common patterns
- **[Architecture](./docs/architecture.md)** - Understanding the design
- **[Client Hooks](./docs/client-hooks/)** - Complete React hooks reference
- **[Server API](./docs/server-api/)** - Server-side API reference
- **[Migration Guide](./docs/MIGRATION-GUIDE.md)** - Upgrade guide

## License

Apache v2 - see [LICENSE.md](./LICENSE.md) for details.

## Links

- [Documentation](https://github.com/quantidexyz/levr)
- [Twitter](https://twitter.com/levrworld)
- [npm](https://npmjs.org/package/levr-sdk)

[ci-image]: https://badgen.net/github/checks/quantidexyz/levr/main?label=ci
[ci-url]: https://github.com/quantidexyz/levr/actions/workflows/ci.yaml
[npm-url]: https://npmjs.org/package/levr-sdk
[twitter-url]: https://twitter.com/levrworld
[twitter-image]: https://img.shields.io/twitter/follow/levrworld.svg?label=follow+levr
[license-image]: https://img.shields.io/badge/License-Apache%20v2-blue
[license-url]: ./LICENSE.md
[npm-latest-image]: https://img.shields.io/npm/v/levr-sdk/latest.svg
[npm-downloads-image]: https://img.shields.io/npm/dm/levr-sdk.svg
