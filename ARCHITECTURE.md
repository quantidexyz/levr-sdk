# Centralized Data Architecture

## Overview

The Levr SDK uses a centralized, composable data architecture that minimizes RPC calls, prevents wasteful refetches, and provides intuitive access patterns.

## Core Principles

1. **Single Multicall Per Domain** - Each data group fetches all its data in one RPC call
2. **Simpler Prop Drilling** - Pass whole objects (`project`) instead of individual fields
3. **Helper Composition** - Utility functions return contract arrays for reuse in larger multicalls
4. **Action-Based Refetches** - Refetch grouped by user actions, not arbitrary categories
5. **Hybrid Access** - Both hierarchical (`user.data.balances`) and flat (`balances.data`) patterns

## Data Groups

### 1. Project Group

**Server:** `src/project.ts`  
**Hook:** `useProject()`  
**Refetch:** `refetch.project()`

**Contains:**

- Token metadata (name, symbol, decimals, supply, image)
- Contract addresses (treasury, governor, staking, stakedToken, forwarder, factory)
- Pool info (poolKey, feeDisplay, numPositions)
- Treasury stats (balance, utilization) with USD values
- Fee receivers (admin, recipient, percentage)
- Governance data (currentCycleId)
- Pricing data (wethUsd, tokenUsd)

**Access:**

```typescript
const { project } = useLevrContext()
project.data?.token.name
project.data?.pool?.poolKey
project.data?.feeReceivers
project.data?.factory
project.data?.currentCycleId
project.data?.pricing
```

### 2. User Group

**Server:** `src/user.ts`  
**Hook:** `useUser()`  
**Refetch:** `refetch.user()`

**Contains (single multicall):**

- `balances` - Token balances (token, weth, eth) with USD
- `staking` - Staked balance, allowance, rewards, APR with USD
  - `rewards.outstanding` - Available & pending (staking + weth)
  - `rewards.claimable` - Claimable amounts (staking + weth)
  - `apr.token` - Token APR in basis points
  - `apr.weth` - WETH APR in basis points
- `governance` - Voting power, airdrop status with USD

**Access:**

```typescript
// Hierarchical
const { user } = useLevrContext()
user.data?.balances.token
user.data?.staking.stakedBalance
user.data?.staking.rewards.claimable.staking
user.data?.governance.votingPower

// Flat (backward compatible)
const { balances, stakingData, governanceData } = useLevrContext()
balances.data?.token
stakingData.data?.stakedBalance
governanceData.data?.votingPower
```

### 3. Pool Group

**Server:** `src/pool.ts`  
**Hook:** `usePool()`  
**Refetch:** `refetch.pool()`

**Contains:**

- poolKey, sqrtPriceX96, tick
- Liquidity, fees (protocol, LP)
- Fee display string

**Access:**

```typescript
const { pool } = useLevrContext()
pool.data?.liquidity
pool.data?.tick
pool.data?.feeDisplay
```

### 4. Proposals Group

**Server:** `src/proposals.ts`  
**Hook:** `useProposals()`  
**Refetch:** `refetch.proposals()`

**Contains:**

- Array of formatted proposal details
- Block range metadata

**Note:** Global governance data (currentCycleId, factory) is now in `project`. User-specific governance data (voting power, airdrop) is in `user.governance`.

## Helper Utils (for Composition)

These functions return contract arrays that can be composed into larger multicalls:

```typescript
// From src/user.ts
balanceContracts({ userAddress, clankerToken, wethAddress })
stakingContracts({ userAddress, stakingAddress, clankerToken, wethAddress })

// From src/pool.ts
poolStateContracts({ stateViewAddress, poolId })
```

**Usage Example:**

```typescript
// Compose a custom multicall
const contracts = [
  ...balanceContracts({ userAddress, clankerToken, wethAddress }),
  ...stakingContracts({ userAddress, stakingAddress, clankerToken }),
  // ... other contracts
]
const results = await publicClient.multicall({ contracts })
```

## Action-Based Refetch System

Refetches are grouped by user actions to prevent wasteful queries:

```typescript
refetch.afterTrade() // user (balances), pool
refetch.afterStake() // user (balances, staking, voting power), project
refetch.afterUnstake() // user (balances, staking, voting power), project
refetch.afterClaim() // user (balances, rewards)
refetch.afterAccrue() // user (outstanding/claimable rewards)
refetch.afterVote() // user (governance), proposals
refetch.afterProposal() // proposals, governance (cycle)
refetch.afterExecute() // project, proposals, user, governance
refetch.afterAirdrop() // user (balances, airdrop status)
```

**Mutation Usage:**

```typescript
const { stake, refetch } = useStake()

stake.mutate(amount, {
  onSuccess: () => {
    refetch.afterStake() // Handled automatically by SDK
  },
})
```

## Simplified Prop Drilling

All server functions accept whole objects instead of individual fields:

```typescript
// ✅ Good
user({ publicClient, userAddress, project })
pool({ publicClient, project })

// ❌ Old way
user({
  publicClient,
  userAddress,
  clankerToken,
  stakingAddress,
  treasuryAddress,
  tokenDecimals,
  pricing,
})
```

## Public Hooks

### useStake()

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
  user, // Full user data query
  project, // Full project data query

  // Convenience accessors
  tokenBalance,
  stakedBalance,
  allowance,
  rewards, // { outstanding, claimable }
  apr, // { token, weth }

  // Helpers
  needsApproval,

  // Loading states
  isLoading,
  isApproving,
  isStaking,
  isUnstaking,
  isClaiming,
  isAccruing,
} = useStake()
```

### useSwap()

```typescript
const {
  // Mutations
  swap,

  // Queries
  user, // For balances
  project, // For pool key
  pool, // For liquidity/fees
  quote, // Dynamic quote query

  // Convenience accessors
  balances,
  tokenBalance,
  wethBalance,
  poolKey,

  // Helpers
  buildSwapConfig,

  // Loading states
  isLoading,
  isSwapping,
} = useSwap()
```

### useGovernance()

```typescript
const {
  // Mutations
  vote,
  proposeTransfer,
  proposeBoost,
  executeProposal,
  claimAirdrop,

  // Queries
  user, // For voting power, airdrop
  project, // For treasury, token info
  currentCycleId,
  addresses,

  // Dynamic queries
  proposal,
  proposalsForCycle,
  winner,
  voteReceipt,

  // Convenience accessors
  userVotingPower, // From user.data.governance
  airdropStatusData, // From user.data.governance.airdrop
  availableAirdropAmount,

  // Helpers
  buildProposeTransferConfig,

  // Loading states
  isLoading,
  isProposing,
  isVoting,
  isExecuting,
  isClaiming,
} = useGovernance()
```

### useFeeReceivers()

```typescript
const {
  data, // FeeReceiverAdmin[] (from project.feeReceivers)
  isLoading,
  error,
  mutate, // Update fee receiver mutation
} = useFeeReceivers()
```

Fee receivers are now part of project data, with user-specific `areYouAnAdmin` flag added client-side.

## Migration Guide

### From Old Structure

```typescript
// OLD
const { balances, staking, governance } = useLevrContext()
const tokenBalance = balances.data?.token
const stakedBalance = staking.userData.data?.stakedBalance
const votingPower = governance.votingPowerSnapshot.data

// NEW (hierarchical)
const { user } = useLevrContext()
const tokenBalance = user.data?.balances.token
const stakedBalance = user.data?.staking.stakedBalance
const votingPower = user.data?.governance.votingPower

// NEW (flat - backward compatible)
const { balances, stakingData, governanceData } = useLevrContext()
const tokenBalance = balances.data?.token
const stakedBalance = stakingData.data?.stakedBalance
const votingPower = governanceData.data?.votingPower
```

### Refetch Changes

```typescript
// OLD
await refetch.afterStake() // Refetched 10+ individual queries

// NEW
await refetch.afterStake() // Refetches user + project (2 multicalls)
```

## Benefits

### 1. Efficiency

- **Before:** 15+ separate RPC calls for user data
- **After:** 1 multicall for all user data

### 2. Simplicity

- Pass whole objects instead of 7+ individual parameters
- Clear data ownership (user vs project vs pool)
- Intuitive refetch grouping by action

### 3. Type Safety

- Full TypeScript support with proper types
- No `as any` workarounds needed
- Autocomplete for nested properties

### 4. Maintainability

- Helper functions can be reused across domains
- Clear separation of concerns
- Action-based refetches are self-documenting

## Architecture Diagram

```
LevrProvider
  ├── project()   → Token, contracts, pool, treasury, feeReceivers, factory, currentCycleId, pricing
  ├── user()      → Balances, staking, governance (1 multicall)
  ├── pool()      → Liquidity, fees, ticks (optional)
  └── proposals() → Proposal list

Context (Dual Access)
  ├── Hierarchical: user.data.balances.token, project.data.currentCycleId
  └── Flat: balances.data.token

Action-Based Refetches
  ├── afterTrade    → [user, pool]
  ├── afterStake    → [user, project]
  ├── afterVote     → [user, proposals]
  ├── afterProposal → [proposals, project]
  └── afterExecute  → [project, proposals, user]
```

**Note:** No separate governance query - all data comes from project!

## Future Enhancements

- Add stream params to project or pool query
- Add reward rate per second to user query
- Consider portfolio aggregation (total USD value across balances)
- Add protocol-level group for factory/forwarder config
