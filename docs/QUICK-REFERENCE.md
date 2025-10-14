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
user?.balances.weth.formatted // WETH balance
user?.balances.eth.formatted // Native ETH balance

// Staking (user-specific)
user?.staking.stakedBalance.formatted // Your staked amount
user?.staking.allowance.formatted // Your spending allowance
user?.staking.claimableRewards.staking.formatted // Your claimable token rewards
user?.staking.claimableRewards.weth?.formatted // Your claimable WETH rewards

// Voting
user?.votingPower.formatted // Your voting power (token-days)
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

// Treasury stats
project?.treasuryStats?.balance.formatted
project?.treasuryStats?.totalAllocated.formatted
project?.treasuryStats?.utilization // percentage

// Staking stats (pool-level)
project?.stakingStats?.totalStaked.formatted // Total by all users
project?.stakingStats?.apr.token.percentage // Token APR %
project?.stakingStats?.apr.weth?.percentage // WETH APR %
project?.stakingStats?.outstandingRewards.staking.available.formatted
project?.stakingStats?.outstandingRewards.staking.pending.formatted
project?.stakingStats?.rewardRates.token.formatted

// Governance stats
project?.governanceStats?.currentCycleId
project?.governanceStats?.activeProposalCount.transfer
project?.governanceStats?.activeProposalCount.boost

// Fee receivers
project?.feeReceivers?.[0].admin
project?.feeReceivers?.[0].recipient
project?.feeReceivers?.[0].percentage
project?.feeReceivers?.[0].areYouAnAdmin

// Pricing
project?.pricing?.tokenUsd
project?.pricing?.wethUsd

// Airdrop (treasury)
project?.airdrop?.availableAmount.formatted
project?.airdrop?.isAvailable
```

### Pool Data (real-time state)

```typescript
import { usePool } from 'levr-sdk/client'
const { data: pool } = usePool()

pool?.sqrtPriceX96 // Current price
pool?.tick // Current tick
pool?.liquidity.formatted // Current liquidity
pool?.protocolFee // Protocol fee
pool?.lpFee // LP fee
pool?.feeDisplay // Fee display string
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
  await approve.mutateAsync(1000n)
}

// Stake
await stake.mutateAsync(1000n)

// Unstake
await unstake.mutateAsync({ amount: 500n, to: '0x...' })

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
    zeroForOne: true, // token -> WETH
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

### Governance

```typescript
import { useGovernance } from 'levr-sdk/client'

const {
  proposeTransfer,
  proposeBoost,
  vote,
  executeProposal,
  claimAirdrop,
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

// Claim airdrop
await claimAirdrop.mutateAsync()
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
import { getProject, getUser, Stake, Governance } from 'levr-sdk'
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

// 1. Get project data
const project = await getProject({
  publicClient,
  clankerToken: '0x...',
})

// 2. Get user data
const user = await getUser({
  publicClient,
  userAddress: '0x...',
  project,
})

// 3. Use classes
const stake = new Stake({ wallet: walletClient, publicClient, project })
const governance = new Governance({ wallet: walletClient, publicClient, project })

// 4. Execute actions
await stake.approve(1000n)
await stake.stake(1000n)
await governance.vote(123n, true)
```

## Common Patterns

### Check if User Can Vote

```typescript
const { data: user } = useUser()
const hasVotingPower = user && parseFloat(user.votingPower.formatted) > 0
```

### Check if Airdrop Available

```typescript
const { data: project } = useProject()
const canClaimAirdrop = project?.airdrop?.isAvailable === true
```

### Check if Rewards Available

```typescript
const { data: user } = useUser()
const hasRewards = user && parseFloat(user.staking.claimableRewards.staking.formatted) > 0
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
  PoolData,
  ProposalsResult,
  EnrichedProposalDetails,
  BalanceResult,
  PricingResult,
  PoolKey,
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
