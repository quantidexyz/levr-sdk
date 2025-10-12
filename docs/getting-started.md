# Getting Started

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
- ⚙️ **Manual Accrual** - Explicit reward accrual system for security and predictability

## Installation

::: code-group

```bash [bun]
bun add levr-sdk viem @tanstack/react-query wagmi
```

```bash [npm]
npm install levr-sdk viem @tanstack/react-query wagmi
```

:::

## Two Entry Points

### Client Entry (`levr-sdk/client`)

For React applications:

```typescript
import { LevrProvider, useStake, useSwap, useGovernance } from 'levr-sdk/client'
```

### Server Entry (`levr-sdk`)

For server-side operations:

```typescript
import { project, balance, Stake, Governance, quoteV4 } from 'levr-sdk'
```

## Client Usage (React)

### 1. Wrap Your App

```typescript
import { LevrProvider } from 'levr-sdk/client'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'

const queryClient = new QueryClient()

export function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <LevrProvider>
          <YourApp />
        </LevrProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

### 2. Set Active Token

```typescript
import { useSetClankerToken, useProject } from 'levr-sdk/client'
import { useEffect } from 'react'

export function ProjectPage({ clankerToken }: { clankerToken: `0x${string}` }) {
  const setClankerToken = useSetClankerToken()
  const { data: project } = useProject()

  useEffect(() => {
    setClankerToken(clankerToken)
  }, [clankerToken, setClankerToken])

  if (!project) return <div>Loading...</div>

  return (
    <div>
      <h1>{project.token.name}</h1>
      <p>Treasury: {project.treasuryStats.balance.formatted} {project.token.symbol}</p>
    </div>
  )
}
```

### 3. Use Hooks

```typescript
import { useStake } from 'levr-sdk/client'

function StakeComponent() {
  const { stake, stakedBalance, needsApproval } = useStake()

  return (
    <div>
      <p>Staked: {stakedBalance?.formatted}</p>
      <button onClick={() => stake.mutate(1000n)}>
        Stake
      </button>
    </div>
  )
}
```

## Server Usage

```typescript
import { project, Stake } from 'levr-sdk'
import { createPublicClient, createWalletClient, http } from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

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
  clankerToken: '0x...',
})

// Stake tokens
const stake = new Stake({
  wallet: walletClient,
  publicClient,
  stakingAddress: projectData.staking,
  tokenAddress: projectData.token.address,
  tokenDecimals: 18,
})

await stake.approve(1000n)
await stake.stake(1000n)
```

## Key Concepts

### Centralized Provider

All queries created once and shared across components:

- ✅ Zero duplication
- ✅ Automatic refetches after mutations
- ✅ Better performance

### Manual Reward Accrual

Rewards must be manually accrued before claiming:

```typescript
// Accrue rewards first
await stake.accrueAllRewards()

// Then claim
await stake.claimRewards()
```

### Protocol Fees

Staking and unstaking incur a variable protocol fee (set by Levr team) deducted from the amount.

### Time-Weighted Voting

Voting power = Staked amount × Time staked.

**Partial unstakes** reduce your voting power proportionally - if you unstake 30% of your tokens, your time accumulation is reduced by 30%. **Full unstakes** reset the timer to 0.

**Example:** 1000 tokens staked for 100 days → Unstake 300 (30%) → 700 tokens with 70 days of time accumulation

This system prevents gaming while being fair to users who need to withdraw portions of their stake.

## Next Steps

- **[Client Hooks](./client-hooks/)** - Complete React hooks reference
- **[Server API](./server-api/)** - Server-side API reference
- **[Architecture](./architecture.md)** - How the SDK works internally
- **[Advanced Usage](./advanced-usage.md)** - Advanced patterns
