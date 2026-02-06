# Documentation Update Summary

**Date:** February 6, 2026
**Status:** Complete

## Latest Changes (February 6, 2026)

### Paired Token Generalization (weth -> pairedToken)

The SDK now supports non-WETH paired tokens (e.g., USDC). All `weth` references have been renamed to `pairedToken` throughout the API and documentation.

**Key renames:**

- `pricing.wethUsd` -> `pricing.pairedTokenUsd`
- `balances.weth` -> `balances.pairedToken`
- `balances.eth` -> `balances.nativeEth?` (optional, only when `pairedToken.isNative`)
- `claimableRewards.weth` -> `claimableRewards.pairedToken`
- `stakingStats.apr.weth` -> `stakingStats.apr.pairedToken`
- `stakingStats.outstandingRewards.weth` -> `stakingStats.outstandingRewards.pairedToken`
- `feeSplitter.pendingFees.weth` -> `feeSplitter.pendingFees.pairedToken`

**New `PairedTokenInfo` type** added to pool info:

```typescript
{
  address: `0x${string}`
  symbol: string
  decimals: number
  isNative: boolean // true if WETH/WBNB
}
```

### Streaming Rewards

New fields in `stakingStats.outstandingRewards`:

- `streaming: BalanceResult` - Currently streaming reward amount
- `claimable: BalanceResult` - Amount claimable by users

New `streamParams` object in `stakingStats`:

- `windowSeconds`, `streamStart`, `streamEnd`, `isActive`

### Treasury Stats Expansion

New fields in `treasuryStats`:

- `stakingContractBalance: BalanceResult`
- `escrowBalance: BalanceResult`
- `stakingContractPairedBalance?: BalanceResult`

### API Signature Changes

- `getProject()`: Removed `oraclePublicClient` parameter (pricing auto-fetched)
- `getFactoryConfig()`: Signature changed from `(publicClient, chainId)` to `(chainId)` - now uses GraphQL indexer
- `proposals()`: Added required `projectId` parameter
- `proposal()`: Added `projectId` as 3rd positional parameter, removed `userAddress`
- `Stake.accrueAllRewards()`: Signature changed from `(tokenAddresses)` to `(params?: {tokens?, useFeeSplitter?})`
- New method: `Stake.distributeFromFeeSplitter(params?)`
- Added `blockTimestamp?: bigint` to Project return type
- Added `minimumQuorumBps` to FactoryConfig

### Removed: getProjects() Server Function

`getProjects()` no longer exists as a server function. Replaced by `useProjects` hook with GraphQL subscriptions for real-time data.

### New Hooks

- `useMetrics` - Global protocol metrics (projectCount, totalStakers, totalStakedUsd, tvlUsd)
- `useTokenAdmin` - Token admin operations (updateMetadata, updateImage, updateAdmin)

### Removed: usePool Hook

`usePool` hook has been removed (it doesn't exist in the source code).

### Navigation Updates

- Removed `usePool` from sidebar and index
- Added `useMetrics` to Query Hooks sidebar
- Added `useTokenAdmin` to Mutation Hooks sidebar
- Marked `getProjects()` as removed in sidebar

### Files Updated

- `server-api/queries/project.md` - Removed oraclePublicClient, updated types
- `server-api/queries/static-project.md` - Added pairedToken, feeSplitter
- `server-api/queries/user.md` - weth->pairedToken, eth->nativeEth
- `server-api/queries/factory.md` - New signature, added minimumQuorumBps
- `server-api/queries/proposals.md` - Added projectId parameter
- `server-api/queries/proposal.md` - Added projectId, removed userAddress
- `server-api/queries/projects.md` - Replaced with removal notice
- `server-api/queries/balance.md` - Updated pricing example
- `server-api/queries/fee-receivers.md` - Updated FeePreference comments
- `server-api/classes/stake.md` - Updated accrueAllRewards, added distributeFromFeeSplitter
- `server-api/index.md` - Removed getProjects, fixed example
- `client-hooks/index.md` - Removed usePool, added useMetrics and useTokenAdmin
- `client-hooks/query/use-pool.md` - Deleted
- `client-hooks/query/use-projects.md` - Complete rewrite (GraphQL subscriptions)
- `client-hooks/query/use-metrics.md` - New file
- `client-hooks/mutation/use-token-admin.md` - New file
- `client-hooks/mutation/use-governance.md` - Added claimAirdropBatch
- `.vitepress/config.mts` - Updated sidebar
- `QUICK-REFERENCE.md` - All weth->pairedToken, new sections
- `getting-started.md` - Fixed server usage example

---

## Previous Updates

### October 25, 2025 - Airdrop, Vault, Factory, Governance Cycles

- Airdrop API overhaul (multi-recipient, IPFS integration)
- Vault integration (useVault, useVaultClaim, fetchVaultData)
- Factory configuration (useFactory, getFactoryConfig)
- Governance cycle management (useGovernanceCycle)

### October 18, 2025 - Fee Splitter Integration

- Fee splitting system for multiple recipients
- FeePreference enum for token-specific fee routing

### October 15, 2025 - Token Metadata Consolidation

- Removed useClankerToken hook
- Token metadata consolidated into project.token

### October 14, 2025 - Zero-Duplicate Architecture

- Complete documentation rewrite for hierarchical data structure
- Action-based refetch system
- Vote receipt feature
- Simplified API surface
