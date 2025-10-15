# Documentation Update Summary

**Date:** October 15, 2025  
**Status:** ✅ Complete

## Latest Changes (October 15, 2025)

### Token Metadata Consolidation

- ✅ **Removed `useClankerToken()` hook** - Token metadata now part of `project.token`
- ✅ **Removed `tokenData` from context** - No duplicate queries for token metadata
- ✅ **Added token metadata fields to `project.token`**:
  - `originalAdmin: Address`
  - `admin: Address`
  - `context: string`
  - `imageUrl?: string` (moved from separate query)
- ✅ **Updated `getTokenContracts()` to use `allData()`** - Single contract call instead of separate `metadata()` and `imageUrl()` calls

**Result:** Further reduced RPC calls by eliminating duplicate token metadata fetching.

---

## Previous Update (October 14, 2025)

## Overview

Updated all documentation to reflect the current zero-duplicate architecture and hierarchical data structure implemented in the codebase.

## Major Changes

### 1. Data Structure Updates

**Removed (Flat Access):**

- ❌ `balances.data.*` - No longer available
- ❌ `stakingData.data.*` - No longer available
- ❌ `governanceData.data.*` - No longer available

**Current (Hierarchical Access):**

- ✅ `user.data.balances.*` - Token, WETH, ETH balances
- ✅ `user.data.staking.*` - Staked balance, allowance, claimable rewards
- ✅ `user.data.votingPower` - User's voting power
- ✅ `project.data.stakingStats.*` - Pool-level staking stats (totalStaked, APR, outstanding rewards)
- ✅ `project.data.governanceStats.*` - Governance stats (currentCycleId, active proposals)
- ✅ `project.data.treasuryStats.*` - Treasury balance and utilization
- ✅ `project.data.airdrop.*` - Treasury airdrop status

### 2. Function Name Updates

**Server API:**

- `project()` → `getProject()`
- `projects()` → `getProjects()`
- Added: `getUser()` documentation

**Parameter Changes:**

- Removed `factoryAddress` parameter from `getProject()` (derived from chainId)
- `Stake` constructor now takes `project` object instead of individual fields
- `Governance` constructor now takes `project` object instead of individual fields

### 3. Refetch Methods

**Removed:**

- ❌ `refetch.staking()`
- ❌ `refetch.governance()`

**Added:**

- ✅ `refetch.user()` - Refetch user query
- ✅ `refetch.project()` - Refetch project query
- ✅ `refetch.pool()` - Refetch pool query
- ✅ `refetch.proposals()` - Refetch proposals query

**Action-Based (Updated):**

- ✅ `afterTrade()` - User + pool (was `afterSwap`)
- ✅ `afterStake()` - User + project
- ✅ `afterUnstake()` - User + project (new)
- ✅ `afterClaim()` - User only
- ✅ `afterAccrue()` - Project only (new)
- ✅ `afterVote()` - User + proposals
- ✅ `afterProposal()` - Proposals + project
- ✅ `afterExecute()` - Project + proposals + user
- ✅ `afterAirdrop()` - Project only (new)

### 4. Vote Receipts

**Added:**

- Vote receipts are now part of `EnrichedProposalDetails`
- Automatically included when user is connected
- Fetched in same multicall as proposal data (no extra RPC calls)

### 5. Hook Updates

**Query Hooks:**

- ✅ `useProject()` - Returns complete project with all stats
- ✅ `useProjects()` - Returns list of projects
- ✅ `useUser()` - Returns user-specific data only
- ✅ `usePool()` - Returns real-time pool state
- ✅ `useProposals()` - Returns proposals with vote receipts
- ✅ `useProposal()` - Returns single proposal by ID

**Mutation Hooks:**

- ✅ `useStake()` - No longer returns data directly (use `useUser()` and `useProject()`)
- ✅ `useSwap()` - No longer returns data directly (use context hooks)
- ✅ `useGovernance()` - No longer returns data directly (use context hooks)

## Files Updated

### Core Documentation

1. ✅ `docs/getting-started.md` - Updated examples, removed flat access, fixed function names
2. ✅ `docs/architecture.md` - Updated refetch methods, context structure
3. ✅ `docs/advanced-usage.md` - Fixed refetch examples, updated pricing example

### Client Hooks Documentation

**Index:** 4. ✅ `docs/client-hooks/index.md` - Updated hook list with new hooks

**Query Hooks:** 5. ✅ `docs/client-hooks/query/use-project.md` - Updated Project type structure 6. ✅ `docs/client-hooks/query/use-user.md` - Updated User type structure 7. ✅ `docs/client-hooks/query/use-pool.md` - **NEW** - Pool query documentation 8. ✅ `docs/client-hooks/query/use-proposals.md` - Added vote receipt info 9. ✅ `docs/client-hooks/query/use-proposal.md` - **NEW** - Single proposal query 10. ✅ `docs/client-hooks/query/use-projects.md` - **NEW** - Projects list query

**Mutation Hooks:** 11. ✅ `docs/client-hooks/mutation/use-stake.md` - Fixed data access patterns 12. ✅ `docs/client-hooks/mutation/use-swap.md` - Fixed data access patterns 13. ✅ `docs/client-hooks/mutation/use-governance.md` - Removed old queries, fixed data access 14. ✅ `docs/client-hooks/mutation/use-deploy.md` - **NEW** - Deploy hook 15. ✅ `docs/client-hooks/mutation/use-prepare.md` - **NEW** - Prepare hook 16. ✅ `docs/client-hooks/mutation/use-register.md` - **NEW** - Register hook

**Utility Hooks:** 17. ✅ `docs/client-hooks/utility/use-levr-refetch.md` - Updated refetch method names

### Server API Documentation

**Queries:** 18. ✅ `docs/server-api/queries/project.md` - Updated function signature and return type 19. ✅ `docs/server-api/queries/projects.md` - Updated function signature 20. ✅ `docs/server-api/queries/user.md` - **NEW** - User query documentation 21. ✅ `docs/server-api/queries/proposals.md` - Added vote receipts 22. ✅ `docs/server-api/queries/proposal.md` - **NEW** - Single proposal query 23. ✅ `docs/server-api/queries/balance.md` - Added note about using getUser() instead

**Classes:** 24. ✅ `docs/server-api/classes/governance.md` - Updated constructor and methods 25. ✅ `docs/server-api/classes/stake.md` - Updated constructor and methods

**Index:** 26. ✅ `docs/server-api/index.md` - Updated function list and example

**Utilities:** 27. ✅ `docs/server-api/utilities/constants.md` - Expanded with all available constants

## Key Improvements

### Architecture Clarity

**Before:**

- Mixed flat and hierarchical access
- Unclear where data comes from
- Confusing refetch methods

**After:**

- Pure hierarchical structure
- Clear data sources (user, project, pool, proposals)
- Action-based refetch methods with clear purpose

### Data Access Patterns

**Before:**

```typescript
const { balances, stakingData } = useLevrContext()
const balance = balances.data.token.formatted
const staked = stakingData.data.stakedBalance.formatted
```

**After:**

```typescript
const { data: user, data: project } = useUser(), useProject()
const balance = user?.balances.token.formatted
const staked = user?.staking.stakedBalance.formatted
const apr = project?.stakingStats?.apr.token.percentage
```

### Constructor Simplification

**Before:**

```typescript
new Stake({
  wallet,
  publicClient,
  stakingAddress: '0x...',
  tokenAddress: '0x...',
  tokenDecimals: 18,
  trustedForwarder: '0x...',
})
```

**After:**

```typescript
new Stake({
  wallet,
  publicClient,
  project: projectData, // All data from project
})
```

## Verification

### Removed Patterns

- ✅ No references to removed hooks (`useBalance`, `useStakingData`, `useGovernanceData`)
- ✅ No references to old flat access (`balances.data`, `stakingData.data`)
- ✅ No references to removed refetch methods (`refetch.staking()`, `refetch.governance()`)
- ✅ No references to old function names (`project()` instead of `getProject()`)
- ✅ No references to removed parameters (`factoryAddress` in getProject)

### New Patterns Documented

- ✅ Hierarchical data access (`user.data.balances`, `user.data.staking`)
- ✅ Pool-level vs user-level data separation
- ✅ Vote receipts in proposals
- ✅ Action-based refetch methods
- ✅ Simplified constructors using project object

## Testing Checklist

Developers following the updated documentation will:

- ✅ Use correct hook names (`useUser()`, not `useBalance()`)
- ✅ Access data hierarchically (`user.data.balances.token`)
- ✅ Use correct refetch methods (`afterTrade()`, not `afterSwap()`)
- ✅ Pass correct parameters to server functions
- ✅ Use simplified constructors (Stake, Governance)
- ✅ Understand data sources (user vs project)
- ✅ Know where to find pool-level stats (project.stakingStats)
- ✅ Know where to find user-level stats (user.staking)

## Summary

All documentation now accurately reflects:

1. The zero-duplicate architecture
2. Hierarchical data structure
3. Action-based refetch system
4. Vote receipt feature
5. Simplified API surface
6. Current function signatures and return types

**Status: Production Ready** ✅
