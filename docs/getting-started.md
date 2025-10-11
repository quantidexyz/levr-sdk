# Getting Started

This guide will help you get started with Levr SDK in both React and server-side environments.

## Prerequisites

Before you begin, make sure you have:

- Node.js 18+ or Bun installed
- A basic understanding of:
  - TypeScript
  - React (for client-side usage)
  - Viem (for blockchain interactions)
  - TanStack Query (for client-side usage)

## Installation

::: code-group

```bash [bun]
bun add levr-sdk viem @tanstack/react-query wagmi
```

```bash [npm]
npm install levr-sdk viem @tanstack/react-query wagmi
```

:::

## Client-Side Usage (React)

For React applications, use the centralized provider pattern:

### Step 1: Wrap Your App with LevrProvider

```typescript
import { LevrProvider } from 'levr-sdk/client'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { config } from './wagmi-config'

const queryClient = new QueryClient()

export function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <LevrProvider>
          <YourApp />
        </LevrProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

### Step 2: Set the Active Token

In your project pages, set the active Clanker token:

```typescript
import { useSetClankerToken, useProject } from 'levr-sdk/client'
import { useEffect } from 'react'

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
      <p>Treasury: {project.treasuryStats.balance.formatted} WETH</p>
      <StakeComponent />
      <SwapComponent />
      <GovernanceComponent />
    </div>
  )
}
```

### Step 3: Use Hooks in Components

Child components automatically share queries - no prop drilling needed!

```typescript
import { useStake, useBalance } from 'levr-sdk/client'

function StakeComponent() {
  const { data: balances } = useBalance()
  const {
    stake,
    stakedBalance,
    needsApproval,
  } = useStake({
    onStakeSuccess: () => {
      console.log('Staked successfully!')
      // All related data automatically refetches
    },
  })

  return (
    <div>
      <p>Balance: {balances?.token?.formatted}</p>
      <p>Staked: {stakedBalance?.formatted}</p>
      <button
        onClick={() => stake.mutate(1000n)}
        disabled={needsApproval}
      >
        Stake
      </button>
    </div>
  )
}
```

## Server-Side Usage

For server-side operations, use the core APIs directly:

```typescript
import { project, balance, Stake, Governance } from 'levr-sdk'
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
const projectData = await project({
  publicClient,
  factoryAddress: '0x...',
  clankerToken: '0x...',
})

console.log('Project:', projectData.token.name)
console.log('Treasury:', projectData.treasuryStats.balance.formatted, 'WETH')

// Get balances
const balances = await balance({
  publicClient,
  address: walletClient.account.address,
  tokens: [
    { address: projectData.token.address, decimals: 18, key: 'token' },
    { address: projectData.weth, decimals: 18, key: 'weth' },
  ],
})

console.log('Token Balance:', balances.token?.formatted)
console.log('WETH Balance:', balances.weth?.formatted)

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
await stake.approve(1000n)
const receipt = await stake.stake(1000n)
console.log('Staked! Transaction:', receipt.transactionHash)
```

## Key Concepts

### Centralized Provider Pattern

The SDK uses a centralized provider pattern that:

- ✅ Creates each query once and shares it across all components
- ✅ Automatically refetches related data after mutations
- ✅ Eliminates duplicate network requests
- ✅ Provides 100% refetch coverage

### Automatic Refetch

All mutations automatically trigger appropriate refetches:

| Action                   | Auto-Refetches                                                    |
| ------------------------ | ----------------------------------------------------------------- |
| **Stake/Unstake/Claim**  | Balances, All Staking Data, Project (treasury), WETH Rewards      |
| **Swap**                 | Balances, Project (pool data)                                     |
| **Propose/Vote/Execute** | Governance, Proposals, Project (treasury), Staking (voting power) |
| **Wallet/Chain Change**  | All Queries                                                       |

### USD Pricing

The SDK provides integrated USD pricing for:

- Token prices
- Balance values
- APR calculations
- Treasury balances

Simply provide an `oraclePublicClient` (mainnet) to enable USD pricing:

```typescript
const projectData = await project({
  publicClient,
  factoryAddress: '0x...',
  clankerToken: '0x...',
  oraclePublicClient: mainnetClient, // For WETH/USD pricing
})

console.log('Token Price:', projectData.pricing?.tokenUsd, 'USD')
console.log('Treasury Value:', projectData.treasuryStats.balance.usd, 'USD')
```

## Next Steps

- Learn about all available [Client Hooks](./client-hooks.md)
- Explore the [Server API](./server-api.md) reference
- Understand the [Architecture](./architecture.md) in depth
- Check out [Advanced Usage](./advanced-usage.md) patterns
