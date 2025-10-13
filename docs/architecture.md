# Architecture

Understanding the centralized provider pattern and how Levr SDK achieves zero duplication with 100% refetch coverage.

## The Problem

Traditional React + TanStack Query applications suffer from:

❌ **Query Duplication** - Multiple components create the same query  
❌ **Manual Coordination** - Developers must manually invalidate related queries  
❌ **Incomplete Refetches** - Easy to forget to update related data  
❌ **Performance Issues** - Duplicate network requests

## The Solution

Levr SDK uses a centralized provider pattern:

```
LevrProvider
  ↓
  Creates all queries once
  ↓
  Shares via React Context
  ↓
  Components consume without duplication
```

### How It Works

**1. Single Source of Truth**

All queries created in `LevrProvider`:

```typescript
const projectQuery = useQuery({
  queryKey: queryKeys.project(clankerToken, chainId),
  queryFn: () => project({ publicClient, clankerToken }),
})
```

**2. Context Distribution**

Queries shared via context:

```typescript
const LevrContext = createContext({
  queries: { project: projectQuery, balance: balanceQuery, ... },
  refetch: { all, staking, afterStake, ... },
})
```

**3. Simple Consumption**

Components access shared queries:

```typescript
export function useProject() {
  const context = useContext(LevrContext)
  return context.queries.project
}
```

## Benefits

### Zero Duplication

Each query created exactly once:

```typescript
// ❌ Old way: Duplicate queries
function ComponentA() {
  const { data } = useQuery(['project'], fetchProject)
}
function ComponentB() {
  const { data } = useQuery(['project'], fetchProject) // Duplicate!
}

// ✅ New way: Shared query
function ComponentA() {
  const { data } = useProject() // Shared
}
function ComponentB() {
  const { data } = useProject() // Same instance
}
```

### 100% Refetch Coverage

Mutations automatically trigger appropriate refetches:

| Action                   | Auto-Refetches                           |
| ------------------------ | ---------------------------------------- |
| **Stake/Unstake/Claim**  | Balances, Staking Data, Project, Rewards |
| **Swap**                 | Balances, Project                        |
| **Propose/Vote/Execute** | Governance, Proposals, Project, Staking  |
| **Wallet/Chain Change**  | All Queries                              |

### Smart Cross-Domain Refetches

```typescript
// After staking:
await refetch.afterStake()
// Refetches: balances, staking data, project (treasury), rewards

// After swap:
await refetch.afterSwap()
// Refetches: balances, project (pool data)
```

### Better Performance

- Fewer network requests (no duplication)
- Better caching (single query instance)
- Optimized refetches (only what's needed)

## Query Keys

Centralized and exported:

```typescript
export const queryKeys = {
  project: (factoryAddress: `0x${string}`, clankerToken: `0x${string}`, chainId: number) =>
    ['levr', 'project', factoryAddress, clankerToken, chainId] as const,

  balance: (address: `0x${string}`, tokens: readonly TokenConfig[]) =>
    ['levr', 'balance', address, tokens] as const,

  // ... all other keys
}
```

## Refetch Methods

```typescript
const refetch = {
  all: async () => {
    // Refetch all queries
  },

  staking: async () => {
    // Refetch all staking queries
  },

  afterStake: async () => {
    // Smart refetch after stake operations
    // Includes: balances, staking, project, rewards
  },

  afterSwap: async () => {
    // Smart refetch after swap operations
    // Includes: balances, project
  },

  afterGovernance: async () => {
    // Smart refetch after governance operations
    // Includes: governance, proposals, project, staking
  },
}
```

## Best Practices

### 1. Always Use LevrProvider

```typescript
<LevrProvider>
  <App />
</LevrProvider>
```

### 2. Use Provided Hooks

```typescript
// ✅ Good
const { data: project } = useProject()

// ❌ Bad - creates duplicate
const { data: project } = useQuery(['project'], fetchProject)
```

### 3. Trust Automatic Refetches

```typescript
// ✅ Good
const { stake } = useStake({
  onStakeSuccess: () => {
    toast.success('Staked!')
    // Everything automatically refetches
  },
})

// ❌ Bad - unnecessary
stake.mutate(amount)
await refetch.all() // Not needed!
```

### 4. Use Smart Refetch Methods

```typescript
// ✅ Good - refetches related data
await refetch.afterStake()

// ❌ Bad - refetches too much
await refetch.all()
```

## Summary

The centralized provider pattern provides:

- **Zero Duplication** - Single query instances
- **100% Coverage** - Complete automatic refetching
- **Better Performance** - Fewer requests, better caching
- **Type Safety** - Full TypeScript support
- **Easy to Use** - Simple hook API
