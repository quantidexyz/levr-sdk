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
- 🔄 **Centralized Refetch** - 100% coverage with smart cross-domain awareness
- ⚡ **Zero Duplication** - Optimized query management via React Context
- 🪝 **React Hooks** - Easy integration with React applications
- 🔌 **Server & Client** - Works in both server and client environments
- 📦 **Tree-Shakeable** - Import only what you need
- 💰 **USD Pricing** - Integrated USD price calculations for tokens, balances, and APR
- 📊 **Price Impact** - Real-time price impact calculation for swaps
- ⚙️ **Hook Fees** - Automatic extraction of Clanker hook fees (static and dynamic)

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
  const setClankerToken = useSetClankerToken()
  const { data: project, isLoading } = useProject()

  useEffect(() => {
    setClankerToken(clankerToken) // Updates global context
  }, [clankerToken, setClankerToken])

  if (isLoading) return <div>Loading...</div>
  if (!project) return <div>Project not found</div>

  return (
    <div>
      <h1>{project.token.name}</h1>
      <StakeComponent />
      <SwapComponent />
      <GovernanceComponent />
    </div>
  )
}

// 3. Use hooks in child components - they automatically share queries!
import { useStake, useBalance } from 'levr-sdk/client'

function StakeComponent() {
  const { data: balances } = useBalance()
  const {
    stake,
    stakedBalance,
    needsApproval,
  } = useStake({
    onStakeSuccess: () => {
      toast.success('Staked successfully!')
      // All related data automatically refetches
    },
  })

  return (
    <div>
      <p>Balance: {balances?.token?.formatted}</p>
      <p>Staked: {stakedBalance?.formatted}</p>
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
import { project, balance, Stake, Governance } from 'levr-sdk'
import { createPublicClient, createWalletClient, http } from 'viem'
import { base } from 'viem/chains'

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
const projectData = await project({
  publicClient,
  factoryAddress: '0x...',
  chainId: base.id,
  clankerToken: '0x...',
})

// Get balances
const balances = await balance({
  publicClient,
  address: '0x...',
  tokens: [
    { address: projectData.token.address, decimals: 18, key: 'token' },
    { address: '0x...', decimals: 18, key: 'weth' },
  ],
})

// Stake tokens
const stake = new Stake({
  wallet: walletClient,
  publicClient,
  stakingAddress: projectData.staking,
  tokenAddress: projectData.token.address,
  tokenDecimals: 18,
  trustedForwarder: projectData.forwarder,
})

// Approve and stake
await stake.approve(1000)
const receipt = await stake.stake(1000)

// Governance operations
const governance = new Governance({
  wallet: walletClient,
  publicClient,
  governorAddress: projectData.governor,
  tokenDecimals: 18,
  clankerToken: projectData.token.address,
})

// Propose a transfer
const { receipt, proposalId } = await governance.proposeTransfer(
  '0x...', // recipient
  parseUnits('1000', 18), // amount
  'Fund development' // description
)
```

## Available Hooks (Client)

### Simple Query Hooks

Direct context accessors for read-only data:

```typescript
import {
  useProject, // Project data (token, contracts, pool info)
  useBalance, // Token balances (token, WETH, ETH)
  useProposals, // Proposals list
  useClankerToken, // Token metadata (admin, image, etc.)
} from 'levr-sdk/client'

const { data: project } = useProject()
const { data: balances } = useBalance()
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
  onStakeSuccess: (receipt) => console.log('Staked!', receipt),
  onUnstakeSuccess: (receipt) => console.log('Unstaked!', receipt),
  onClaimSuccess: (receipt) => console.log('Claimed!', receipt),
})

// Use mutations
stake.mutate(1000) // Automatically refetches balances, staking data, project
```

#### `useSwap()`

```typescript
const {
  // Mutations
  swap,

  // Queries
  quote,
  balances,
  poolKey,
  pricing, // USD pricing data

  // Convenience
  tokenBalance,
  wethBalance,
  buildSwapConfig,
} = useSwap({
  quoteParams: {
    zeroForOne: true, // true = token -> WETH, false = WETH -> token
    amountIn: '100',
    amountInDecimals: 18,
    amountOutDecimals: 18,
  },
  onSwapSuccess: (receipt) => console.log('Swapped!', receipt),
})

// Access quote with price impact
console.log(quote.data?.priceImpactBps) // 0.5 (0.5% impact)
console.log(quote.data?.hookFees) // { type: 'static', clankerFee: 500, ... }

// Build swap config (poolKey from context)
const config = buildSwapConfig({
  zeroForOne: true,
  amountIn: 100,
  amountInDecimals: 18,
  minAmountOut: '95',
})
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

  // Queries
  currentCycleId,
  addresses,
  airdropStatus,
  proposal,

  // Convenience accessors
  treasuryAddress,
  isAirdropAvailable,

  // Loading states
  isProposing,
  isVoting,
  isExecuting,
} = useGovernance({
  governorAddress: project.governor,
  clankerToken: project.token.address,
  onVoteSuccess: (receipt) => console.log('Voted!', receipt),
  onExecuteProposalSuccess: (receipt) => console.log('Executed!', receipt),
})
```

#### `useFeeReceivers()`

```typescript
const {
  query, // Fee receivers data
  mutate, // Update mutation
} = useFeeReceivers({
  onSuccess: (hash) => console.log('Updated fee receiver', hash),
})

// Use mutation
mutate.mutate({
  clankerToken: '0x...',
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

// Update active token
const setClankerToken = useSetClankerToken()
setClankerToken('0x...')

// Manual refetch control
const refetch = useLevrRefetch()
await refetch.all() // Refetch everything
await refetch.staking() // Refetch staking data
await refetch.afterStake() // Smart cross-domain refetch after stake

// Get Clanker SDK instance
const clanker = useClanker()
```

## Centralized Refetch Coverage

The SDK provides **100% refetch coverage** with smart cross-domain awareness:

| Action                   | Auto-Refetches                                                    |
| ------------------------ | ----------------------------------------------------------------- |
| **Stake/Unstake/Claim**  | Balances, All Staking Data, Project (treasury), WETH Rewards      |
| **Swap**                 | Balances, Project (pool data)                                     |
| **Propose/Vote/Execute** | Governance, Proposals, Project (treasury), Staking (voting power) |
| **Wallet/Chain Change**  | All Queries                                                       |

All mutations automatically trigger appropriate refetches - no manual coordination needed!

## API Reference

### Server-Side APIs

#### `project()`

Get project data including token, contracts, pool information, and optional USD pricing:

```typescript
import { project } from 'levr-sdk'

const projectData = await project({
  publicClient,
  factoryAddress: '0x...',
  clankerToken: '0x...',
  // Optional: Provide oracle client for USD pricing
  oraclePublicClient: mainnetClient, // For WETH/USD and token/USD prices
})

// Access USD-denominated values
console.log(projectData.pricing) // { wethUsd: "2543.21", tokenUsd: "0.05" }
console.log(projectData.treasuryStats.balance.usd) // "50000.00"
console.log(projectData.treasuryStats.totalAllocated.usd) // "150000.00"
```

**Note**: `chainId` parameter is no longer required - it's automatically derived from `publicClient.chain.id`.

#### `balance()`

Get token balances for multiple tokens:

```typescript
import { balance } from 'levr-sdk'

const balances = await balance({
  publicClient,
  address: '0x...',
  tokens: [
    { address: '0x...', decimals: 18, key: 'token' },
    { address: '0x...', decimals: 18, key: 'weth' },
    { address: zeroAddress, decimals: 18, key: 'eth' }, // Native ETH
  ],
})

console.log(balances.token?.formatted) // "1000.0"
console.log(balances.weth?.formatted) // "5.5"
console.log(balances.eth?.formatted) // "0.1"
```

#### `Stake` Class

Manage staking operations with optional USD pricing:

```typescript
import { Stake } from 'levr-sdk'

const stake = new Stake({
  wallet: walletClient,
  publicClient,
  stakingAddress: '0x...',
  tokenAddress: '0x...',
  tokenDecimals: 18,
  trustedForwarder: '0x...',
})

// Get staking data
const poolData = await stake.getPoolData()
const userData = await stake.getUserData()
const allowance = await stake.getAllowance()

// Get APR with USD pricing
const aprData = await stake.getWethRewardRate({
  totalStaked: poolData.totalStaked,
  pricing: { wethUsd: '2543.21', tokenUsd: '0.05' }, // Optional USD prices
})
console.log(aprData.aprBps) // 1500 (15% APR)

// Perform operations
await stake.approve(amount)
await stake.stake(amount)
await stake.unstake({ amount, to: '0x...' })
await stake.claimRewards()
await stake.accrueRewards(tokenAddress)
```

#### `Governance` Class

Manage governance operations with optional USD pricing:

```typescript
import { Governance } from 'levr-sdk'

const governance = new Governance({
  wallet: walletClient,
  publicClient,
  governorAddress: '0x...',
  tokenDecimals: 18,
  clankerToken: '0x...',
})

// Get governance data
const cycleId = await governance.getCurrentCycleId()
const treasury = await governance.getTreasury()

// Get addresses with USD values
const addresses = await governance.getAddresses({
  pricing: { wethUsd: '2543.21', tokenUsd: '0.05' },
})
console.log(addresses.treasury.balance.usd) // "50000.00"

// Get airdrop status
const airdropStatus = await governance.getAirdropStatus()

// Propose actions
const { receipt, proposalId } = await governance.proposeTransfer(
  '0x...', // recipient
  parseUnits('1000', 18), // amount
  'Fund development' // description
)

// Vote on proposals
await governance.vote(proposalId, true) // true = support

// Execute proposals
await governance.executeProposal(proposalId)
```

#### `quoteV3()`

Quote swaps on Uniswap V3:

```typescript
import { quoteV3, UNISWAP_V3_QUOTER_V2, WETH, GET_USDC_ADDRESS } from 'levr-sdk'

const chainId = 8453 // Base
const quoterAddress = UNISWAP_V3_QUOTER_V2(chainId)
const wethData = WETH(chainId)
const usdcAddress = GET_USDC_ADDRESS(chainId)

// Get V3 quote
const quote = await quoteV3({
  publicClient,
  quoterAddress,
  tokenIn: wethData.address,
  tokenOut: usdcAddress,
  amountIn: parseUnits('1', 18),
  fee: 3000, // 0.3%
})

console.log(formatUnits(quote.amountOut, 6)) // "2543.21"
```

#### `quoteV4()`

Get swap quotes on Uniswap V4 with price impact and hook fees:

```typescript
import { quoteV4 } from 'levr-sdk'

// Get V4 quote with price impact
const quote = await quoteV4({
  publicClient,
  poolKey: {
    currency0: '0x...',
    currency1: '0x...',
    fee: 500,
    tickSpacing: 10,
    hooks: '0x...',
  },
  zeroForOne: true,
  amountIn: parseUnits('100', 18),
  // Optional: Provide pricing data for price impact calculation
  pricing: {
    wethUsd: '2543.21',
    tokenUsd: '0.05',
  },
  tokenAddress: '0x...', // Project token address
  currency0Decimals: 18,
  currency1Decimals: 18,
})

console.log(formatUnits(quote.amountOut, 18)) // "95.5"
console.log(quote.priceImpactBps) // 0.5 (0.5% price impact)
console.log(quote.hookFees) // { type: 'static', clankerFee: 500, pairedFee: 100 }
console.log(quote.gasEstimate) // 150000n
```

**Note**: `chainId` parameter is no longer required - it's automatically derived from `publicClient.chain.id`.

#### `swapV4()`

Execute swaps on Uniswap V4:

```typescript
import { swapV4 } from 'levr-sdk'

// Execute swap
const receipt = await swapV4({
  publicClient,
  wallet: walletClient,
  poolKey,
  zeroForOne: true,
  amountIn: parseUnits('100', 18),
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
│  │ • Project data                            │ │
│  │ • Token balances (token + WETH + ETH)     │ │
│  │ • Staking (all queries)                   │ │
│  │ • Governance (global queries)             │ │
│  │ • Proposals                               │ │
│  │ • Fee receivers                           │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ Smart Refetch Methods                     │ │
│  │ • afterStake()  → Balances, Staking, etc. │ │
│  │ • afterSwap()   → Balances, Project       │ │
│  │ • afterGovernance() → Gov, Proposals, etc.│ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
            ↓ Context shared via hooks
┌─────────────────────────────────────────────────┐
│  Components consume without duplication         │
│  • useProject()  → Shared query                 │
│  • useBalance()  → Shared query                 │
│  • useStake()    → Shared queries + mutations   │
└─────────────────────────────────────────────────┘
```

### Benefits

✅ **Zero Duplication** - Each query created once, shared across all components  
✅ **100% Refetch Coverage** - Smart cross-domain refetches after mutations  
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
      <button onClick={() => refetch.all()}>Refresh All</button>
      <button onClick={() => refetch.staking()}>Refresh Staking</button>
      <button onClick={() => refetch.governance()}>Refresh Governance</button>
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

## Architecture

```
levr-sdk/
├── src/
│   ├── index.ts              # Server-safe exports
│   ├── project.ts            # Project queries
│   ├── balance.ts            # Balance queries
│   ├── stake.ts              # Stake class
│   ├── governance.ts         # Governance class
│   ├── swap-v4.ts            # V4 swap functions
│   ├── quote-v3.ts           # V3 quote functions
│   ├── quote-v4.ts           # V4 quote functions with price impact
│   ├── usd-price.ts          # USD pricing utilities
│   └── client/
│       ├── index.ts          # Client-only exports
│       ├── levr-provider.tsx # Centralized provider
│       ├── query-keys.ts     # Query key registry
│       └── hook/
│           ├── index.ts      # Public hook exports
│           ├── use-project.ts
│           ├── use-balance.ts
│           ├── use-stake.ts
│           ├── use-swap.ts
│           ├── use-governance.ts
│           └── ... (other hooks)
```

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
