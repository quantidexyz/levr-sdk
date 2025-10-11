# Architecture

Understanding the centralized provider pattern and how Levr SDK achieves zero duplication with 100% refetch coverage.

## Overview

Levr SDK uses a **centralized provider pattern** that fundamentally changes how React applications manage blockchain data. Instead of each component creating its own queries, all queries are created once in a central provider and shared across the application.

## The Problem It Solves

Traditional React + TanStack Query applications often suffer from:

❌ **Query Duplication** - Multiple components create the same query  
❌ **Manual Coordination** - Developers must manually invalidate related queries  
❌ **Incomplete Refetches** - Easy to forget to update related data after mutations  
❌ **Performance Issues** - Duplicate network requests and wasted resources

## The Solution: Centralized Provider

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

## How It Works

### 1. Single Source of Truth

All queries are created in `LevrProvider`:

```typescript
// Inside LevrProvider
const projectQuery = useQuery({
  queryKey: queryKeys.project(factoryAddress, clankerToken, chainId),
  queryFn: () => project({ publicClient, factoryAddress, clankerToken }),
  enabled: !!clankerToken && !!publicClient,
})

const balanceQuery = useQuery({
  queryKey: queryKeys.balance(address, tokens),
  queryFn: () => balance({ publicClient, address, tokens }),
  enabled: !!address && !!tokens,
})
```

### 2. Context Distribution

Queries are distributed via React Context:

```typescript
const LevrContext = createContext({
  queries: {
    project: projectQuery,
    balance: balanceQuery,
    // ... all other queries
  },
  refetch: {
    all: () => Promise.all([...]),
    staking: () => Promise.all([...]),
    afterStake: () => Promise.all([...]),
    // ... smart refetch methods
  },
})
```

### 3. Simple Hook Consumption

Components access shared queries without duplication:

```typescript
export function useProject() {
  const context = useContext(LevrContext)
  return context.queries.project
}

export function useBalance() {
  const context = useContext(LevrContext)
  return context.queries.balance
}
```

## Benefits

### ✅ Zero Duplication

Each query is created **exactly once**, no matter how many components use it:

```typescript
// ❌ Old way: Each component creates its own query
function ComponentA() {
  const { data } = useQuery(['project'], fetchProject)
}

function ComponentB() {
  const { data } = useQuery(['project'], fetchProject) // Duplicate!
}

// ✅ New way: Single shared query
function ComponentA() {
  const { data } = useProject() // Shared
}

function ComponentB() {
  const { data } = useProject() // Same query!
}
```

### ✅ 100% Refetch Coverage

All mutations automatically trigger appropriate refetches:

| Action                   | Auto-Refetches                                                    |
| ------------------------ | ----------------------------------------------------------------- |
| **Stake/Unstake/Claim**  | Balances, All Staking Data, Project (treasury), WETH Rewards      |
| **Swap**                 | Balances, Project (pool data)                                     |
| **Propose/Vote/Execute** | Governance, Proposals, Project (treasury), Staking (voting power) |
| **Wallet/Chain Change**  | All Queries                                                       |

### ✅ Smart Cross-Domain Refetches

Mutations in one domain intelligently refetch data in related domains:

```typescript
// After staking, automatically refetch:
// - Balances (spent tokens)
// - Staking data (new staked amount)
// - Project (treasury balance may have changed from fees)
// - WETH rewards (reward rate may have changed)
await refetch.afterStake()
```

### ✅ Better Performance

- Fewer network requests (no duplication)
- Better caching (single query instance)
- Optimized refetches (only what's needed)

### ✅ Type Safety

Full TypeScript support throughout:

```typescript
const { data: project } = useProject()
//    ^? Project | undefined

const { data: balances } = useBalance()
//    ^? BalanceResult | undefined
```

## Implementation Details

### Query Keys

All query keys are centralized and exported:

```typescript
export const queryKeys = {
  project: (factoryAddress: `0x${string}`, clankerToken: `0x${string}`, chainId: number) =>
    ['levr', 'project', factoryAddress, clankerToken, chainId] as const,

  balance: (address: `0x${string}`, tokens: readonly TokenConfig[]) =>
    ['levr', 'balance', address, tokens] as const,

  // ... all other keys
}
```

### Refetch Methods

Smart refetch methods coordinate cross-domain updates:

```typescript
const refetch = {
  // Refetch everything
  all: async () => {
    await Promise.all([
      queries.project.refetch(),
      queries.balance.refetch(),
      queries.stakingPool.refetch(),
      // ... all queries
    ])
  },

  // After staking operations
  afterStake: async () => {
    await Promise.all([
      queries.balance.refetch(), // Spent tokens
      queries.stakingPool.refetch(), // New pool state
      queries.stakingUser.refetch(), // New user state
      queries.project.refetch(), // Treasury may have changed
      queries.wethRewardRate.refetch(), // Reward rate may have changed
    ])
  },

  // After swap operations
  afterSwap: async () => {
    await Promise.all([
      queries.balance.refetch(), // Swapped tokens
      queries.project.refetch(), // Pool data changed
    ])
  },

  // After governance operations
  afterGovernance: async () => {
    await Promise.all([
      queries.proposals.refetch(), // New/updated proposals
      queries.governanceAddresses.refetch(), // Treasury balance
      queries.project.refetch(), // Treasury stats
      queries.stakingUser.refetch(), // Voting power may have changed
    ])
  },
}
```

### Automatic Invalidation

Mutations automatically trigger refetches:

```typescript
const stakeMutation = useMutation({
  mutationFn: async (amount: bigint) => {
    // Execute stake transaction
    return await stakeInstance.stake(amount)
  },
  onSuccess: async (receipt) => {
    // Automatically refetch all related data
    await refetch.afterStake()

    // Call user's callback
    onStakeSuccess?.(receipt)
  },
})
```

## Advanced Patterns

### Dynamic Token Switching

Update the global token context and all queries automatically update:

```typescript
const setClankerToken = useSetClankerToken()

// Switch to new token
setClankerToken('0xNEW_TOKEN')
// All queries automatically refetch with new token!
```

### Manual Refetch Control

Access granular refetch methods when needed:

```typescript
const refetch = useLevrRefetch()

// Refetch specific domains
await refetch.staking()
await refetch.governance()

// Refetch everything
await refetch.all()

// Smart refetch after custom operations
await refetch.afterStake()
```

### Custom Query Invalidation

Use query keys for custom invalidations:

```typescript
import { queryKeys } from 'levr-sdk/client'
import { useQueryClient } from '@tanstack/react-query'

const queryClient = useQueryClient()

// Invalidate specific query
queryClient.invalidateQueries({
  queryKey: queryKeys.project(factoryAddress, clankerToken, chainId),
})
```

## Comparison with Traditional Approach

### Traditional Approach ❌

```typescript
// Each component creates its own queries
function StakeComponent() {
  const { data: project } = useQuery(['project'], fetchProject)
  const { data: balance } = useQuery(['balance'], fetchBalance)
  const { data: staking } = useQuery(['staking'], fetchStaking)

  const stake = useMutation({
    onSuccess: () => {
      // Manual invalidation - easy to miss something!
      queryClient.invalidateQueries(['balance'])
      queryClient.invalidateQueries(['staking'])
      // Forgot to invalidate ['project']!
    },
  })
}

function SwapComponent() {
  // Duplicates the same queries!
  const { data: project } = useQuery(['project'], fetchProject) // Duplicate
  const { data: balance } = useQuery(['balance'], fetchBalance) // Duplicate
}
```

### Levr SDK Approach ✅

```typescript
// Queries created once in provider
function StakeComponent() {
  const { data: project } = useProject() // Shared
  const { data: balance } = useBalance() // Shared
  const { stake } = useStake({
    onStakeSuccess: () => {
      // Automatic refetch - nothing to forget!
    },
  })
}

function SwapComponent() {
  const { data: project } = useProject() // Same instance
  const { data: balance } = useBalance() // Same instance
}
```

## Best Practices

### 1. Always Use LevrProvider

Wrap your app with `LevrProvider` at the root:

```typescript
<QueryClientProvider client={queryClient}>
  <WagmiProvider config={wagmiConfig}>
    <LevrProvider>
      <App />
    </LevrProvider>
  </WagmiProvider>
</QueryClientProvider>
```

### 2. Set Token Early

Set the Clanker token as early as possible:

```typescript
function ProjectPage({ address }: { address: `0x${string}` }) {
  const setClankerToken = useSetClankerToken()

  useEffect(() => {
    setClankerToken(address)
  }, [address, setClankerToken])

  // Rest of component
}
```

### 3. Use Provided Hooks

Always use the provided hooks instead of creating custom queries:

```typescript
// ✅ Good
const { data: project } = useProject()

// ❌ Bad - creates duplicate query
const { data: project } = useQuery(['project'], fetchProject)
```

### 4. Trust Automatic Refetches

Don't manually refetch after mutations - it's automatic:

```typescript
// ✅ Good
const { stake } = useStake({
  onStakeSuccess: () => {
    toast.success('Staked!')
    // Everything automatically refetches
  },
})

// ❌ Bad - unnecessary manual refetch
const { stake } = useStake()
const refetch = useLevrRefetch()

stake.mutate(amount)
await refetch.all() // Not needed!
```

### 5. Use Smart Refetch Methods

For custom operations, use smart refetch methods:

```typescript
const refetch = useLevrRefetch()

// ✅ Good - refetches related data
await refetch.afterStake()

// ❌ Bad - refetches too much
await refetch.all()
```

## Conclusion

The centralized provider pattern provides:

- **Zero Duplication** - Single query instances
- **100% Coverage** - Complete automatic refetching
- **Better Performance** - Fewer requests, better caching
- **Type Safety** - Full TypeScript support
- **Easy to Use** - Simple hook API

This architecture makes it impossible to have stale data or incomplete refetches, while providing the best possible performance.
