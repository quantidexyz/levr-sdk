# Vote Receipt Feature

**Date:** October 13, 2025  
**Status:** ✅ Implemented and tested

## Overview

Added vote receipt tracking to the Proposal type so that each proposal knows whether the current user has voted on it. This provides better UX by showing vote status directly in proposal lists.

## Design Decision

**Where should vote receipts live?**

### Option 1: User Query ❌
- Would need to fetch all proposals first to know what to query
- Less intuitive - proposals would need to look up their vote status from user data
- More complex data flow

### Option 2: Proposal Type ✅ (CHOSEN)
- Each proposal object includes the current user's vote receipt
- Natural for UI - when displaying proposals, each has its own vote status
- Fetched efficiently in a single multicall alongside proposal data
- Vote receipts are optional - only included when userAddress is provided

## Implementation

### Type Changes

**EnrichedProposalDetails:**
```typescript
export type EnrichedProposalDetails = FormattedProposalDetails & {
  meetsQuorum: boolean
  meetsApproval: boolean
  state: number
  voteReceipt?: {
    hasVoted: boolean      // Whether user voted on this proposal
    support: boolean       // true = yes, false = no
    votes: bigint          // Voting power used
  }
}
```

### Function Changes

**proposalCallData:**
- Now accepts optional `userAddress` parameter
- Returns 4 contracts normally
- Returns 5 contracts (adds getVoteReceipt) when userAddress provided

**parseProposalData:**
- Handles optional 5th result (vote receipt)
- Returns voteReceipt in the enriched proposal object

**proposals:**
- Accepts optional `userAddress` parameter
- Dynamically adjusts contracts per proposal (4 or 5)
- Includes vote receipts in multicall when user is connected

### Query Changes

**ProposalsParams:**
```typescript
export type ProposalsParams = {
  publicClient: PopPublicClient
  governorAddress: `0x${string}`
  cycleId?: bigint
  tokenDecimals?: number
  pricing?: PricingResult
  pageSize?: number
  userAddress?: `0x${string}` // NEW: Include vote receipts if provided
}
```

**useProposalsQuery:**
- Gets userAddress from `useAccount()` hook
- Passes userAddress to `proposals()` function
- Updates query key to include userAddress (refetches when user changes)

### Query Key Update

**Before:**
```typescript
queryKey: queryKeys.proposals(chainId, cycleId)
```

**After:**
```typescript
queryKey: queryKeys.proposals(chainId, cycleId, userAddress)
```

This ensures the query refetches when the user connects/disconnects their wallet.

## Performance Impact

### RPC Calls

**Without user connected:**
- Proposals: 2 proposals × 4 calls = 8 contracts in multicall
- No change from before

**With user connected:**
- Proposals: 2 proposals × 5 calls = 10 contracts in multicall
- +2 calls per proposal load (efficient - all in single multicall)

**Example for 10 proposals:**
- Without vote receipts: 40 contracts in multicall
- With vote receipts: 50 contracts in multicall
- +10 calls total (+25% for complete vote status across all proposals)

### Efficiency

The vote receipts are fetched in the **same multicall** as the proposal data, so:
- No additional RPC round trips
- No additional latency
- Minimal overhead (just +1 call per proposal in the multicall)

This is much more efficient than fetching vote receipts individually or in a separate call.

## Usage Examples

### Display Proposal List with Vote Status

```typescript
const { proposals } = useLevrContext()

proposals.data?.proposals.map(proposal => (
  <ProposalCard
    key={proposal.id}
    proposal={proposal}
    hasVoted={proposal.voteReceipt?.hasVoted}
    votedYes={proposal.voteReceipt?.support}
    votingPower={proposal.voteReceipt?.votes}
  />
))
```

### Check if User Can Vote

```typescript
function canVote(proposal: EnrichedProposalDetails): boolean {
  // User hasn't voted yet
  return !proposal.voteReceipt?.hasVoted
}
```

### Show Vote Summary

```typescript
function VoteSummary({ proposal }: { proposal: EnrichedProposalDetails }) {
  if (!proposal.voteReceipt) {
    return <div>Connect wallet to see your vote</div>
  }

  if (!proposal.voteReceipt.hasVoted) {
    return <div>You haven't voted yet</div>
  }

  return (
    <div>
      You voted: {proposal.voteReceipt.support ? 'Yes' : 'No'}
      Voting power used: {formatUnits(proposal.voteReceipt.votes, 18)}
    </div>
  )
}
```

## Backward Compatibility

✅ **Fully backward compatible**

- `voteReceipt` is optional in the type
- Existing code that doesn't use vote receipts continues to work
- Server-side usage without userAddress works as before
- Vote receipts are only included when userAddress is explicitly provided

## Testing

### Mock Updates

Updated test mocks to handle both scenarios:
- 4 contracts per proposal (without vote receipts)
- 5 contracts per proposal (with vote receipts)

Mock returns vote receipt data:
```typescript
{
  hasVoted: true,
  support: true,
  votes: 75000000000000000000n
}
```

### Test Coverage

✅ All 38 tests passing
- Server-side data flow tests
- React hooks integration tests
- Refetch method tests
- End-to-end integration tests

## Benefits

1. **Better UX** - Users immediately see which proposals they've voted on
2. **Efficient** - Vote receipts fetched in same multicall as proposals
3. **Type-safe** - Vote receipt is part of proposal type with proper TypeScript support
4. **Natural** - Each proposal knows its own vote status
5. **Optional** - Works with or without user connection

## Refetch Behavior

### afterVote is Now Correct ✅

**Before this feature:**
- User query didn't include vote receipts
- afterVote refetched user + proposals
- User refetch seemed unnecessary

**After this feature:**
- Proposals include vote receipts
- afterVote refetches user + proposals
- Proposals refetch updates vote receipts ✅ CORRECT
- User refetch is technically optional but harmless

This validates that our `afterVote` refetch mapping was already correct!

## Summary

✅ **Vote receipts added to Proposal type**  
✅ **Efficiently fetched in single multicall**  
✅ **Backward compatible**  
✅ **Fully tested**  
✅ **Better UX for users**  
✅ **Validates afterVote refetch mapping**

The feature is production-ready and provides a significant UX improvement for governance interactions!

