# Refetch Mapping Analysis

## What Data Lives Where

### Project Query Contains (Pool-Level Stats)

- `stakingStats.totalStaked` - Total amount staked by all users
- `stakingStats.outstandingRewards` - Pool rewards (available + pending)
- `stakingStats.apr` - Annual percentage rate
- `stakingStats.rewardRates` - Rewards per second
- `treasuryStats.balance` - Treasury token balance
- `treasuryStats.totalAllocated` - Staking + treasury balances
- `governanceStats.currentCycleId` - Current governance cycle
- `governanceStats.activeProposalCount` - Active proposals per type
- `airdrop` - Treasury airdrop status (Clanker airdrop)

### User Query Contains (User-Specific Stats)

- `balances.token` - User token balance
- `balances.weth` - User WETH balance
- `balances.eth` - User native ETH balance
- `staking.stakedBalance` - User's staked amount
- `staking.allowance` - User's spending allowance
- `staking.claimableRewards` - User's claimable rewards
- `votingPower` - User's voting power

### Pool Query Contains

- `sqrtPriceX96` - Current pool price
- `tick` - Current tick
- `liquidity` - Current liquidity
- Pool fees

### Proposals Query Contains

- List of proposals with votes
- Winner of cycle

## Action Analysis

### ✅ afterTrade (CORRECT)

**Action:** Swap tokens via Uniswap V4

**Changes:**

- User token/WETH balances ← `user`
- Pool state (price, liquidity) ← `pool`

**Current Refetch:** `user + pool`  
**Status:** ✅ CORRECT

---

### ✅ afterStake (CORRECT)

**Action:** Stake tokens into staking contract

**Changes:**

- User token balance ← `user`
- User staked balance ← `user`
- User voting power ← `user`
- Total staked (pool-level) ← `project.stakingStats` ✓
- Outstanding rewards (pool-level) ← `project.stakingStats` ✓
- Treasury/staking balances ← `project.treasuryStats` ✓

**Current Refetch:** `user + project`  
**Status:** ✅ CORRECT

---

### ✅ afterUnstake (CORRECT)

**Action:** Unstake tokens from staking contract

**Changes:** Same as afterStake (reverse direction)

**Current Refetch:** `user + project`  
**Status:** ✅ CORRECT

---

### ✅ afterClaim (CORRECT)

**Action:** Claim staking rewards (user claims from staking contract)

**Changes:**

- User token/WETH balance ← `user` (receives rewards)
- User claimable rewards ← `user` (goes to 0)
- Staking contract balance decreases (but this is minor, not critical to refetch immediately)

**Does NOT change:**

- Outstanding rewards (source is LP locker, only changes on accrue)

**Current Refetch:** `user` only  
**Status:** ✅ CORRECT

**Note:** Outstanding rewards only change when `accrueRewards()` collects fees FROM LP locker. Claims just distribute already-accrued rewards TO users.

---

### ✅ afterAccrue (CORRECT)

**Action:** Accrue rewards (collect fees FROM LP locker TO staking contract)

**Changes:**

- **Outstanding rewards (pool-level)** ← `project.stakingStats` ✓ (new fees added to pool)

**Does NOT change:**

- User claimable rewards (updated on-demand by contract, user can refetch manually if needed)

**Current Refetch:** `project` only  
**Status:** ✅ CORRECT

**Note:** User claimable rewards are calculated proportionally on-demand by the contract based on outstanding rewards and user's stake. No need to refetch user query immediately - users can manually refetch when they want to see updated claimable amounts.

---

### ✅ afterVote (CORRECT)

**Action:** Vote on proposal

**Changes:**

- Proposal votes (yesVotes, noVotes) ← `proposals`
- Vote receipt (hasVoted, support, votes) ← `proposals` (each proposal includes user's vote receipt)

**Current Refetch:** `user + proposals`  
**Status:** ✅ CORRECT

**Note:** Proposals now include vote receipts (when userAddress is provided), so refetching proposals updates the user's vote status on each proposal. The `user` refetch is technically unnecessary but harmless - keeping it ensures consistency across all vote-related UI.

---

### ✅ afterProposal (CORRECT)

**Action:** Create new proposal

**Changes:**

- Proposals list ← `proposals`
- Active proposal count ← `project.governanceStats` ✓

**Current Refetch:** `proposals + project`  
**Status:** ✅ CORRECT

---

### ✅ afterExecute (CORRECT)

**Action:** Execute proposal (transfer or boost)

**Changes:**

- Treasury balance ← `project.treasuryStats` ✓
- Proposal executed status ← `proposals`
- Possibly current cycle ID ← `project.governanceStats` ✓
- Possibly staking rewards (if boost) ← `project.stakingStats` ✓
- User balances/staking might change ← `user`

**Current Refetch:** `project + proposals + user`  
**Status:** ✅ CORRECT

---

### ❌ afterAirdrop (WRONG)

**Action:** Claim treasury airdrop (Clanker airdrop)

**Changes:**

- **Treasury balance** ← `project.treasuryStats` ❌ MISSING
- **Airdrop status** ← `project.airdrop` ❌ MISSING

**Current Refetch:** `user` only  
**Should Refetch:** `project` only  
**Status:** ❌ WRONG - Should refetch project, not user

**Note:** This is a governance action (treasury claims), not a user action. User doesn't change at all.

**Fix:** Change from `userQuery.refetch()` to `project.refetch()`

---

## Summary of Issues

| Action           | Current                    | Should Be                  | Status     |
| ---------------- | -------------------------- | -------------------------- | ---------- |
| afterTrade       | user + pool                | user + pool                | ✅         |
| afterStake       | user + project             | user + project             | ✅         |
| afterUnstake     | user + project             | user + project             | ✅         |
| afterClaim       | user                       | user                       | ✅         |
| **afterAccrue**  | **user + project**         | **project only**           | ✅ (fixed) |
| afterVote        | user + proposals           | user + proposals           | ✅         |
| afterProposal    | proposals + project        | proposals + project        | ✅         |
| afterExecute     | project + proposals + user | project + proposals + user | ✅         |
| **afterAirdrop** | **user**                   | **project**                | ✅ (fixed) |

**2 incorrect refetch mappings fixed!**

## Applied Fixes

### 1. ✅ afterClaim - NO CHANGE NEEDED

```typescript
afterClaim: async () => {
  await userQuery.refetch() // Balances, claimable rewards changed
}
```

**Reason:** Outstanding rewards source is LP locker (only changes on accrue), not claims.

### 2. ✅ afterAccrue - FIXED

```typescript
afterAccrue: async () => {
  await project.refetch() // Outstanding rewards changed (fees from LP locker)
}
```

**Fix:** Changed from `user + project` to `project only`. Outstanding rewards change (pool-level), but user claimable rewards are calculated on-demand by the contract. Users can manually refetch if they want to see updated claimable amounts immediately.

### 3. ✅ afterAirdrop - FIXED

```typescript
afterAirdrop: async () => {
  await project.refetch() // Treasury balance, airdrop status changed
}
```

**Fix:** Changed from `userQuery.refetch()` to `project.refetch()` - this is a treasury action, not user action.
