# Quick Reference

Fast lookup for common patterns and data access in Levr SDK.

## Data Access Cheatsheet

### User Data (user-specific)

```typescript
import { useUser } from 'levr-sdk/client'
const { data: user } = useUser()

// Balances
user?.balances.token.formatted // Token balance
user?.balances.token.usd // Token balance in USD
user?.balances.pairedToken.formatted // Paired token balance (e.g., WETH, USDC)
user?.balances.nativeEth?.formatted // Native ETH balance (only when pairedToken.isNative)

// Staking (user-specific)
user?.staking.stakedBalance.formatted // Your staked amount
user?.staking.allowance.formatted // Your spending allowance
user?.staking.claimableRewards.staking.formatted // Your claimable token rewards
user?.staking.claimableRewards.pairedToken?.formatted // Your claimable paired token rewards

// Voting
user?.votingPower // Your voting power in Token Days (string)
```

### Project Data (pool-level)

```typescript
import { useProject } from 'levr-sdk/client'
const { data: project } = useProject()

// Token info
project?.token.name
project?.token.symbol
project?.token.decimals
project?.token.address
project?.token.totalSupply
project?.token.imageUrl
project?.token.originalAdmin
project?.token.admin
project?.token.context
project?.token.metadata

// Contract addresses
project?.treasury
project?.governor
project?.staking
project?.stakedToken
project?.factory
project?.forwarder

// Pool info
project?.pool?.poolKey
project?.pool?.feeDisplay
project?.pool?.numPositions
project?.pool?.pairedToken // { address, symbol, decimals, isNative }

// Treasury stats
project?.treasuryStats?.balance.formatted
project?.treasuryStats?.totalAllocated.formatted
project?.treasuryStats?.utilization // percentage
project?.treasuryStats?.stakingContractBalance.formatted
project?.treasuryStats?.escrowBalance.formatted
project?.treasuryStats?.stakingContractPairedBalance?.formatted

// Staking stats (pool-level)
project?.stakingStats?.totalStaked.formatted // Total by all users
project?.stakingStats?.apr.token.percentage // Token APR %
project?.stakingStats?.apr.pairedToken?.percentage // Paired token APR %
project?.stakingStats?.outstandingRewards.staking.available.formatted
project?.stakingStats?.outstandingRewards.staking.pending.formatted
project?.stakingStats?.outstandingRewards.staking.streaming.formatted
project?.stakingStats?.outstandingRewards.staking.claimable.formatted
project?.stakingStats?.rewardRates.token.formatted
project?.stakingStats?.streamParams.windowSeconds
project?.stakingStats?.streamParams.streamStart
project?.stakingStats?.streamParams.streamEnd
project?.stakingStats?.streamParams.isActive

// Governance stats
project?.governanceStats?.currentCycleId
project?.governanceStats?.activeProposalCount.transfer
project?.governanceStats?.activeProposalCount.boost

// Fee receivers
project?.feeReceivers?.[0].admin
project?.feeReceivers?.[0].recipient
project?.feeReceivers?.[0].percentage
project?.feeReceivers?.[0].areYouAnAdmin
project?.feeReceivers?.[0].feePreference // 0 = Both, 1 = Paired only, 2 = Token only

// Fee splitter
project?.feeSplitter?.isConfigured
project?.feeSplitter?.isActive
project?.feeSplitter?.splits // Array of { receiver, bps }
project?.feeSplitter?.totalBps
project?.feeSplitter?.pendingFees?.token
project?.feeSplitter?.pendingFees?.pairedToken

// Pricing (dynamic data)
project?.pricing?.tokenUsd
project?.pricing?.pairedTokenUsd

// Block timestamp
project?.blockTimestamp
```

### Airdrop Data (from context)

```typescript
import { useAirdropStatus } from 'levr-sdk/client'

const { data: airdrop, isLoading } = useAirdropStatus()

// Multi-recipient support
airdrop?.recipients // Array of recipients
airdrop?.recipients[0].address
airdrop?.recipients[0].allocatedAmount.formatted
airdrop?.recipients[0].availableAmount.formatted
airdrop?.recipients[0].isAvailable
airdrop?.recipients[0].isTreasury
airdrop?.recipients[0].proof // Merkle proof
airdrop?.recipients[0].error

// Deployment info
airdrop?.deploymentTimestamp
airdrop?.lockupDurationHours
```

### Global Metrics

```typescript
import { useMetrics } from 'levr-sdk/client'

const { data: metrics } = useMetrics()

metrics?.projectCount
metrics?.totalStakers
metrics?.totalStakedUsd // Formatted USD string or null
metrics?.tvlUsd // Formatted USD string or null
```

### Vault Data

```typescript
import { useVault } from 'levr-sdk/client'

const { data: vault } = useVault(tokenAddress)

vault?.status // 'locked' | 'vesting' | 'vested'
vault?.statusMessage // "Tokens Locked", etc.
vault?.descriptionMessage // Detailed explanation
vault?.daysRemaining // Days until next milestone
vault?.claimable // Amount claimable now
vault?.total // Total allocation
vault?.claimed // Already claimed
vault?.lockupEndTime
vault?.vestingEndTime
```

### Factory Config

```typescript
import { useFactory } from 'levr-sdk/client'

const { data: factory } = useFactory()

factory?.protocolFeeBps // Protocol fee
factory?.protocolTreasury
factory?.proposalWindowSeconds
factory?.votingWindowSeconds
factory?.quorumBps
factory?.approvalBps
factory?.maxActiveProposals
factory?.minSTokenBpsToSubmit
factory?.maxProposalAmountBps
factory?.streamWindowSeconds
factory?.minimumQuorumBps
```

### Proposals Data

```typescript
import { useProposals } from 'levr-sdk/client'
const { data } = useProposals()

data?.cycleId // Current cycle
data?.winner // Winning proposal ID
data?.proposals // Array of proposals

// Individual proposal
data?.proposals[0].id
data?.proposals[0].description
data?.proposals[0].amount.formatted
data?.proposals[0].amount.usd
data?.proposals[0].yesVotes.formatted
data?.proposals[0].noVotes.formatted
data?.proposals[0].meetsQuorum
data?.proposals[0].meetsApproval
data?.proposals[0].state

// Vote receipt (if user connected)
data?.proposals[0].voteReceipt?.hasVoted
data?.proposals[0].voteReceipt?.support // true = yes
data?.proposals[0].voteReceipt?.votes // voting power used
```

## Common Mutations

### Staking

```typescript
import { useStake } from 'levr-sdk/client'

const { approve, stake, unstake, claim, accrueRewards, accrueAllRewards, needsApproval } =
  useStake()

// Check if approval needed
if (needsApproval('1000')) {
  await approve.mutateAsync(1000)
}

// Stake
await stake.mutateAsync(1000)

// Unstake
await unstake.mutateAsync({ amount: 500, to: '0x...' })

// Accrue rewards (required before claiming)
await accrueAllRewards.mutateAsync()

// Claim rewards
await claim.mutateAsync()
```

### Swapping

```typescript
import { useSwap } from 'levr-sdk/client'

const { swap, quote, buildSwapConfig } = useSwap({
  quoteParams: {
    zeroForOne: true, // token -> paired token
    amountIn: '100',
    amountInDecimals: 18,
    amountOutDecimals: 18,
  },
})

// Wait for quote
if (quote.data) {
  const config = buildSwapConfig({
    zeroForOne: true,
    amountIn: 100,
    minAmountOut: quote.data.amountOut.toString(),
  })

  await swap.mutateAsync(config)
}
```

### Fee Splitting

```typescript
import { useConfigureSplits } from 'levr-sdk/client'

const { mutate: configureSplits } = useConfigureSplits()

// Configure splits and update recipient in one call
configureSplits({
  clankerToken: '0x...',
  rewardIndex: 0,
  splits: [
    { receiver: '0xABC...', percentage: 50 },
    { receiver: '0xDEF...', percentage: 30 },
    { receiver: '0x123...', percentage: 20 },
  ],
  isSplitterAlreadyActive: false,
})
```

### Governance

```typescript
import { useGovernance } from 'levr-sdk/client'

const {
  proposeTransfer,
  proposeBoost,
  vote,
  executeProposal,
  claimAirdrop,
  claimAirdropBatch,
  buildProposeTransferConfig,
  buildProposeBoostConfig,
} = useGovernance()

// Propose transfer
const config = buildProposeTransferConfig({
  recipient: '0x...',
  amount: '1000',
  description: 'Fund development',
})
await proposeTransfer.mutateAsync(config)

// Vote
await vote.mutateAsync({
  proposalId: 123n,
  support: true, // yes
})

// Execute
await executeProposal.mutateAsync({ proposalId: 123n })

// Claim airdrop (single)
await claimAirdrop.mutateAsync(recipient)

// Claim airdrop (batch)
await claimAirdropBatch.mutateAsync(availableRecipients)
```

### Token Admin

```typescript
import { useTokenAdmin } from 'levr-sdk/client'

const { updateMetadata, updateImage, updateAdmin } = useTokenAdmin()

// Update metadata
await updateMetadata.mutateAsync({ clankerToken: '0x...', metadata: '...' })

// Update image
await updateImage.mutateAsync({ clankerToken: '0x...', imageUrl: 'https://...' })

// Transfer admin
await updateAdmin.mutateAsync({ clankerToken: '0x...', newAdmin: '0x...' })
```

## Refetch After Actions

```typescript
import { useLevrRefetch } from 'levr-sdk/client'
const refetch = useLevrRefetch()

// After trading
await refetch.afterTrade() // Refetches: user, pool

// After staking/unstaking
await refetch.afterStake() // Refetches: user, project

// After claiming rewards
await refetch.afterClaim() // Refetches: user only

// After accruing rewards
await refetch.afterAccrue() // Refetches: project only

// After voting
await refetch.afterVote() // Refetches: user, proposals

// After creating proposal
await refetch.afterProposal() // Refetches: proposals, project

// After executing proposal
await refetch.afterExecute() // Refetches: project, proposals, user

// After claiming airdrop
await refetch.afterAirdrop() // Refetches: project
```

## Server-Side Quick Start

```typescript
import { getStaticProject, getProject, getUser, Stake, Governance } from 'levr-sdk'
import { createPublicClient, createWalletClient, http } from 'viem'
import { base } from 'viem/chains'

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

const walletClient = createWalletClient({
  chain: base,
  transport: http(),
  account: privateKeyToAccount('0x...'),
})

// 1. Get static project data (cache this)
const staticProject = await getStaticProject({
  publicClient,
  clankerToken: '0x...',
})

if (!staticProject?.isRegistered) {
  throw new Error('Project not registered')
}

// 2. Get dynamic project data
const project = await getProject({
  publicClient,
  staticProject,
})

// 3. Get user data
const user = await getUser({
  publicClient,
  userAddress: '0x...',
  project,
})

// 4. Use classes
const stake = new Stake({ wallet: walletClient, publicClient, project })
const governance = new Governance({ wallet: walletClient, publicClient, project })

// 5. Execute actions
await stake.approve(1000)
await stake.stake(1000)
await governance.vote(123n, true) // Note: proposalId is an ID, not an amount
```

## Common Patterns

### Check if User Can Vote

```typescript
const { data: user } = useUser()
const hasVotingPower = user && parseFloat(user.votingPower) > 0
```

### Check if Airdrop Available

```typescript
const { data: airdrop } = useAirdropStatus()
const hasClaimableAirdrop = airdrop?.recipients.some((r) => r.isAvailable) ?? false

// Get treasury airdrop specifically
const treasuryRecipient = airdrop?.recipients.find((r) => r.isTreasury)
const canClaimTreasury = treasuryRecipient?.isAvailable === true
```

### Check Vault Status

```typescript
const { data: vault } = useVault(tokenAddress)
const canClaimVault = vault && vault.claimable > 0n
const isVesting = vault?.status === 'vesting'
const isLocked = vault?.status === 'locked'
```

### Check if Rewards Available

```typescript
const { data: user } = useUser()
const hasRewards = user && parseFloat(user.staking.claimableRewards.staking.formatted) > 0
```

### Check if Fee Splitter Active

```typescript
const { data: project } = useProject()
const isSplitterActive = project?.feeSplitter?.isActive === true
const pendingFees = project?.feeSplitter?.pendingFees
```

### Get Current Price Impact

```typescript
const { quote } = useSwap({ quoteParams: { ... } })
const impact = quote.data?.priceImpactBps ?? 0

if (impact > 5) {
  console.warn('High price impact!')
}
```

### Display USD Values

```typescript
const { data: user } = useUser()

// All balance results have optional usd field
if (user?.balances.token.usd) {
  console.log(`Balance: $${user.balances.token.usd}`)
}

if (user?.staking.stakedBalance.usd) {
  console.log(`Staked: $${user.staking.stakedBalance.usd}`)
}
```

### Set Active Token

```typescript
import { useSetClankerToken } from 'levr-sdk/client'

function ProjectPage({ clankerToken }) {
  // Automatically sets and updates when clankerToken prop changes
  useSetClankerToken(clankerToken)

  return <div>Project content</div>
}
```

## TypeScript Types

### Import Types

```typescript
import type {
  Project,
  User,
  ProposalsResult,
  EnrichedProposalDetails,
  BalanceResult,
  PricingResult,
  PoolKey,
  AirdropStatus,
  AirdropRecipient,
  FactoryConfig,
  VaultStatusData,
  VaultStatus,
  PairedTokenInfo,
} from 'levr-sdk'
```

### BalanceResult Structure

All balance/amount values follow this structure:

```typescript
{
  raw: bigint // Raw value in wei
  formatted: string // Human-readable
  usd?: string // USD value (if pricing available)
}
```

## Need More Details?

- [Getting Started](./getting-started.md) - Full setup guide
- [Architecture](./architecture.md) - How everything works
- [Client Hooks](./client-hooks/) - Complete hook reference
- [Server API](./server-api/) - Server-side API reference
- [Migration Guide](./MIGRATION-GUIDE.md) - Detailed migration steps
