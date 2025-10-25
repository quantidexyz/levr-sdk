# Getting Started

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
import { getProject, getUser, Stake, Governance, quote } from 'levr-sdk'
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
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <LevrProvider
          ipfsSearchUrl="/api/ipfs-search"  // Required for airdrop proof generation
          ipfsJsonUrl="/api/ipfs-json"      // Required for airdrop merkle trees
        >
          <YourApp />
        </LevrProvider>
      </WagmiProvider>
    </QueryClientProvider>
  )
}
```

**LevrProvider Props:**

- `ipfsSearchUrl` (optional): Full URL to IPFS search endpoint (required for airdrop functionality)
- `ipfsJsonUrl` (optional): Full URL to IPFS JSON endpoint (required for airdrop functionality)
- `oracleChainId` (optional): Chain ID for price oracle (default: 8453 - Base mainnet)
- `oracleRpcUrl` (optional): RPC URL for oracle client (uses public RPC if not provided)
- `enabled` (optional): Enable/disable all queries (default: true)

### 2. Set Active Token

```typescript
import { useSetClankerToken, useProject } from 'levr-sdk/client'

export function ProjectPage({ clankerToken }: { clankerToken: `0x${string}` }) {
  const { data: project } = useProject()

  // Automatically sets and updates when clankerToken prop changes
  useSetClankerToken(clankerToken)

  if (!project) return <div>Loading...</div>

  return (
    <div>
      <h1>{project.token.name}</h1>
      <p>Treasury: {project.treasuryStats?.balance.formatted} {project.token.symbol}</p>
      {project.pricing && <p>Price: ${project.pricing.tokenUsd}</p>}
      <p>Current Cycle: {project.governanceStats?.currentCycleId.toString()}</p>
    </div>
  )
}
```

### 3. Use Hooks

```typescript
import { useStake, useUser } from 'levr-sdk/client'

function StakeComponent() {
  const { stake, needsApproval } = useStake()
  const { data: user } = useUser()

  return (
    <div>
      <p>Balance: {user?.balances.token.formatted}</p>
      <p>Staked: {user?.staking.stakedBalance.formatted}</p>
      <p>Voting Power: {user?.votingPower} Token Days</p>
      <button onClick={() => stake.mutate(1000)}>
        Stake
      </button>
    </div>
  )
}
```

## Server Usage

```typescript
import { getProject, Stake } from 'levr-sdk'
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
const projectData = await getProject({
  publicClient,
  clankerToken: '0x...',
  userAddress: '0x...', // Optional: for areYouAnAdmin in fee receivers
})

// Stake tokens
const stake = new Stake({
  wallet: walletClient,
  publicClient,
  project: projectData,
})

await stake.approve(1000) // Accepts number, string, or parseUnits() bigint
await stake.stake(1000)
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

- **[Getting Started](./getting-started.md)** - Complete setup guide
- **[Quick Reference](./QUICK-REFERENCE.md)** - Fast lookup for common patterns
- **[Client Hooks](./client-hooks/)** - Complete React hooks reference
- **[Server API](./server-api/)** - Server-side API reference
- **[Architecture](./architecture.md)** - How the SDK works internally
- **[Advanced Usage](./advanced-usage.md)** - Advanced patterns
- **[Migration Guide](./MIGRATION-GUIDE.md)** - Upgrade from older versions
