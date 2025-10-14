# Migration Guide: Updated Data Flow Architecture

**For users upgrading from older versions of levr-sdk**

## Overview

The SDK has been refactored to achieve **zero duplicate queries** and a **cleaner hierarchical data structure**. This guide helps you migrate from the old API to the new one.

## Breaking Changes

### 1. Removed Hooks

These hooks no longer exist:

- ❌ `useBalance()` 
- ❌ `useStakingData()`
- ❌ `useGovernanceData()`

**Migration:**

```typescript
// ❌ Old way
import { useBalance, useStakingData, useGovernanceData } from 'levr-sdk/client'

const { data: balances } = useBalance()
const { data: stakingData } = useStakingData()
const { data: governanceData } = useGovernanceData()

// ✅ New way
import { useUser, useProject } from 'levr-sdk/client'

const { data: user } = useUser()
const { data: project } = useProject()

// Access balances
user?.balances.token
user?.balances.weth
user?.balances.eth

// Access staking
user?.staking.stakedBalance
user?.staking.allowance
user?.staking.claimableRewards

// Access voting
user?.votingPower

// Access pool-level stats
project?.stakingStats?.totalStaked
project?.stakingStats?.apr
project?.stakingStats?.outstandingRewards

// Access governance
project?.governanceStats?.currentCycleId
project?.governanceStats?.activeProposalCount
```

### 2. Context Structure Changed

**Before:**
```typescript
const context = useLevrContext()

context.balances.data.token
context.stakingData.data.stakedBalance
context.governanceData.data.votingPower
```

**After:**
```typescript
const context = useLevrContext()

context.user.data?.balances.token
context.user.data?.staking.stakedBalance
context.user.data?.votingPower
```

### 3. Refetch Methods Changed

**Removed:**
- ❌ `refetch.staking()`
- ❌ `refetch.governance()`
- ❌ `refetch.afterSwap()`

**Added:**
- ✅ `refetch.user()` - Refetch user query
- ✅ `refetch.project()` - Refetch project query
- ✅ `refetch.pool()` - Refetch pool query
- ✅ `refetch.proposals()` - Refetch proposals query
- ✅ `refetch.afterTrade()` - After swap (renamed)
- ✅ `refetch.afterUnstake()` - After unstake (new)
- ✅ `refetch.afterAccrue()` - After reward accrual (new)
- ✅ `refetch.afterAirdrop()` - After airdrop claim (new)

**Migration:**

```typescript
// ❌ Old way
await refetch.staking()
await refetch.governance()
await refetch.afterSwap()

// ✅ New way
await refetch.user() // Includes balances + staking + voting
await refetch.project() // Includes governance stats
await refetch.afterTrade() // Smart refetch after swap
```

### 4. Server Function Names

**Changed:**
- `project()` → `getProject()`
- `projects()` → `getProjects()`
- Added: `getUser()`

**Migration:**

```typescript
// ❌ Old way
import { project, projects } from 'levr-sdk'

const projectData = await project({
  publicClient,
  factoryAddress: '0x...',
  clankerToken: '0x...',
})

// ✅ New way
import { getProject, getProjects, getUser } from 'levr-sdk'

const projectData = await getProject({
  publicClient,
  clankerToken: '0x...',
  // No factoryAddress needed - derived from chainId
})

const userData = await getUser({
  publicClient,
  userAddress: '0x...',
  project: projectData,
})
```

### 5. Class Constructors Simplified

**Stake Class:**

```typescript
// ❌ Old way
new Stake({
  wallet,
  publicClient,
  stakingAddress: '0x...',
  tokenAddress: '0x...',
  tokenDecimals: 18,
  trustedForwarder: '0x...',
})

// ✅ New way
new Stake({
  wallet,
  publicClient,
  project: projectData, // All fields from project
})
```

**Governance Class:**

```typescript
// ❌ Old way
new Governance({
  wallet,
  publicClient,
  governorAddress: '0x...',
  tokenDecimals: 18,
  clankerToken: '0x...',
})

// ✅ New way
new Governance({
  wallet,
  publicClient,
  project: projectData, // All fields from project
})
```

### 6. Hook Return Values

**useStake, useSwap, useGovernance no longer return data directly:**

```typescript
// ❌ Old way
const {
  stake,
  tokenBalance,
  stakedBalance,
  allowance,
  rewards,
  apr,
} = useStake()

// ✅ New way
import { useStake, useUser, useProject } from 'levr-sdk/client'

const { stake, needsApproval } = useStake()
const { data: user } = useUser()
const { data: project } = useProject()

// Access data from context
const tokenBalance = user?.balances.token
const stakedBalance = user?.staking.stakedBalance
const allowance = user?.staking.allowance
const claimableRewards = user?.staking.claimableRewards
const apr = project?.stakingStats?.apr
```

## New Features

### 1. Vote Receipts

Proposals now include vote receipts when user is connected:

```typescript
const { data } = useProposals()

data?.proposals.forEach(proposal => {
  if (proposal.voteReceipt?.hasVoted) {
    console.log('You voted:', proposal.voteReceipt.support ? 'Yes' : 'No')
    console.log('Voting power used:', proposal.voteReceipt.votes)
  }
})
```

### 2. Pool-Level vs User-Level Data

Clear separation of concerns:

**Pool-Level (in project):**
- Total staked by all users
- APR percentages
- Outstanding rewards (available + pending)
- Reward rates per second

**User-Level (in user):**
- User's balances
- User's staked amount
- User's allowance
- User's claimable rewards
- User's voting power

### 3. Smart Refetch Methods

Action-based refetch methods only update what changed:

```typescript
refetch.afterTrade() // Only user + pool
refetch.afterStake() // Only user + project
refetch.afterClaim() // Only user
refetch.afterAccrue() // Only project
refetch.afterVote() // Only user + proposals
```

## Step-by-Step Migration

### 1. Update Imports

```typescript
// Before
import {
  useBalance,
  useStakingData,
  useGovernanceData,
} from 'levr-sdk/client'

// After
import {
  useUser,
  useProject,
  usePool,
  useProposals,
} from 'levr-sdk/client'
```

### 2. Update Data Access

```typescript
// Before
const { data: balances } = useBalance()
const tokenBalance = balances?.token.formatted

// After
const { data: user } = useUser()
const tokenBalance = user?.balances.token.formatted
```

### 3. Update Refetch Calls

```typescript
// Before
await refetch.staking()

// After
await refetch.user() // Includes staking data
```

### 4. Update Server Calls

```typescript
// Before
const projectData = await project({
  publicClient,
  factoryAddress: '0x...',
  clankerToken: '0x...',
})

// After
const projectData = await getProject({
  publicClient,
  clankerToken: '0x...',
  // factoryAddress derived from chainId automatically
})
```

### 5. Update Class Instantiation

```typescript
// Before
const stake = new Stake({
  wallet,
  publicClient,
  stakingAddress: projectData.staking,
  tokenAddress: projectData.token.address,
  tokenDecimals: projectData.token.decimals,
  trustedForwarder: projectData.forwarder,
})

// After
const stake = new Stake({
  wallet,
  publicClient,
  project: projectData,
})
```

## Benefits of Migration

1. **Fewer RPC Calls** - 37-53% reduction through elimination of duplicate queries
2. **Clearer Data Sources** - Know exactly where each piece of data comes from
3. **Better Performance** - Single multicall per data group
4. **Simpler API** - Less boilerplate, clearer patterns
5. **Type Safety** - Better TypeScript inference with hierarchical structure

## Need Help?

- Check the [Architecture](./architecture.md) doc for understanding the new design
- See [Getting Started](./getting-started.md) for complete examples
- Review [Client Hooks](./client-hooks/) for hook-specific documentation
- Check [Server API](./server-api/) for server-side usage

