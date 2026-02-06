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
// Static data (cached indefinitely, only refetches on token change)
const staticProject = useStaticProjectQuery({
  clankerToken,
  enabled,
})

// Dynamic data (refetches every 30s, includes pricing)
const project = useProjectQuery({
  clankerToken,
  enabled,
})

const user = useUserQuery({
  project: project.data,
  enabled,
})
```

**2. Context Distribution**

Queries shared via context:

```typescript
const LevrContext = createContext<LevrContextValue>({
  // Core data
  clankerToken,
  setClankerToken,
  chainId,
  userAddress,

  // Governance cycle management
  selectedCycleId,
  setSelectedCycleId,

  // Data queries (hierarchical)
  user: userQuery,
  project,
  pool: poolQuery,
  proposals: proposalsQuery,
  airdropStatus,
  factoryConfig,

  // Action-based refetch methods
  refetch: {
    all,
    user,
    project,
    pool,
    proposals,
    afterTrade,
    afterStake,
    afterUnstake,
    afterClaim,
    afterAccrue,
    afterVote,
    afterProposal,
    afterExecute,
    afterAirdrop,
  },
})
```

**IPFS Integration:**

Airdrop functionality requires IPFS endpoints in LevrProvider:

```typescript
<LevrProvider
  ipfsSearchUrl="/api/ipfs-search"
  ipfsJsonUrl="/api/ipfs-json"
>
  {children}
</LevrProvider>
```

These endpoints enable:

- Merkle tree retrieval for multi-recipient airdrops
- Proof generation for each recipient
- Single-recipient optimization (empty proof when merkleRoot = leaf hash)

**3. Simple Consumption**

Components access shared queries:

```typescript
// Simple one-liner hooks
export const useProject = () => useLevrContext().project
export const useUser = () => useLevrContext().user
export const useProposals = () => useLevrContext().proposals
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

| Action                  | Auto-Refetches                                                      |
| ----------------------- | ------------------------------------------------------------------- |
| **Trade**               | User (balances), Pool (state)                                       |
| **Stake/Unstake**       | User (balances, staking, voting), Project (treasury, staking stats) |
| **Claim**               | User only (balances, claimable rewards)                             |
| **Accrue**              | Project only (outstanding rewards)                                  |
| **Vote**                | User, Proposals (vote receipts)                                     |
| **Propose**             | Proposals, Project (active count)                                   |
| **Execute**             | Project, Proposals, User (all may change)                           |
| **Airdrop**             | Project (treasury balance, airdrop status)                          |
| **Wallet/Chain Change** | All Queries                                                         |

### Smart Cross-Domain Refetches

```typescript
// After staking:
await refetch.afterStake()
// Refetches: user (balances, staking, voting power), project (treasury stats, staking stats)

// After trade:
await refetch.afterTrade()
// Refetches: user (balances), pool (price, liquidity)

// After claim:
await refetch.afterClaim()
// Refetches: user only (balances, claimable rewards)

// After accrue:
await refetch.afterAccrue()
// Refetches: project only (outstanding rewards from LP locker)
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
  // Core refetches
  all: async () => {
    // Refetch all queries
  },
  user: async () => {
    // Refetch user query only
  },
  project: async () => {
    // Refetch project query only
  },
  pool: async () => {
    // Refetch pool query only
  },
  proposals: async () => {
    // Refetch proposals query only
  },

  // Action-based refetches
  afterTrade: async () => {
    // Refetches: user (balances), pool (state)
  },
  afterStake: async () => {
    // Refetches: user (balances, staking, voting), project (treasury, staking stats)
  },
  afterUnstake: async () => {
    // Refetches: user (balances, staking, voting), project (treasury, staking stats)
  },
  afterClaim: async () => {
    // Refetches: user only (balances, claimable rewards)
  },
  afterAccrue: async () => {
    // Refetches: project only (outstanding rewards)
  },
  afterVote: async () => {
    // Refetches: user, proposals (vote receipts)
  },
  afterProposal: async () => {
    // Refetches: proposals, project (active count)
  },
  afterExecute: async () => {
    // Refetches: project, proposals, user (all may change)
  },
  afterAirdrop: async () => {
    // Refetches: project (treasury, airdrop status)
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
