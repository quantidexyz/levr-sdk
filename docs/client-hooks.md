# Client Hooks

Complete reference for all React hooks provided by Levr SDK.

## Simple Query Hooks

Direct context accessors for read-only data.

### `useProject()`

Get the current project data including token info, contracts, and pool details.

```typescript
import { useProject } from 'levr-sdk/client'

function ProjectInfo() {
  const { data: project, isLoading, error } = useProject()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!project) return <div>No project loaded</div>

  return (
    <div>
      <h2>{project.token.name} ({project.token.symbol})</h2>
      <p>Token: {project.token.address}</p>
      <p>Treasury: {project.treasuryStats.balance.formatted} WETH</p>
      <p>Total Allocated: {project.treasuryStats.totalAllocated.formatted} WETH</p>
      {project.pricing && (
        <p>Token Price: ${project.pricing.tokenUsd}</p>
      )}
    </div>
  )
}
```

**Returns:**

- `data`: Project data or undefined
- `isLoading`: Loading state
- `error`: Error if query failed

### `useBalance()`

Get token balances for the connected wallet.

```typescript
import { useBalance } from 'levr-sdk/client'

function WalletBalances() {
  const { data: balances, isLoading } = useBalance()

  if (isLoading) return <div>Loading balances...</div>

  return (
    <div>
      <p>Token: {balances?.token?.formatted}</p>
      <p>WETH: {balances?.weth?.formatted}</p>
      <p>ETH: {balances?.eth?.formatted}</p>
    </div>
  )
}
```

**Returns:**

- `token`: Token balance with formatted/raw values
- `weth`: WETH balance
- `eth`: Native ETH balance

### `useProposals()`

Get the list of governance proposals.

```typescript
import { useProposals } from 'levr-sdk/client'

function ProposalsList() {
  const { data: proposals, isLoading } = useProposals()

  if (isLoading) return <div>Loading proposals...</div>

  return (
    <div>
      {proposals?.map((proposal) => (
        <div key={proposal.id}>
          <h3>Proposal #{proposal.id}</h3>
          <p>{proposal.description}</p>
          <p>For: {proposal.forVotes} | Against: {proposal.againstVotes}</p>
          <p>Status: {proposal.state}</p>
        </div>
      ))}
    </div>
  )
}
```

### `useClankerToken()`

Get Clanker token metadata (admin, image, etc.).

```typescript
import { useClankerToken } from 'levr-sdk/client'

function TokenMetadata() {
  const { data: tokenData, isLoading } = useClankerToken()

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <img src={tokenData?.imageUrl} alt={tokenData?.name} />
      <p>Admin: {tokenData?.admin}</p>
      <p>Description: {tokenData?.description}</p>
    </div>
  )
}
```

## Mutation Hooks

Hooks that provide both queries and mutations for specific domains.

### `useStake()`

Complete staking functionality with mutations and queries.

```typescript
import { useStake } from 'levr-sdk/client'

function StakingInterface() {
  const {
    // Mutations
    approve,
    stake,
    unstake,
    claim,
    accrueRewards,
    accrueAllRewards,

    // Queries
    allowance,
    poolData,
    userData,
    balances,
    wethRewardRate,
    aprBpsWeth,

    // Convenience accessors
    stakedBalance,
    totalStaked,
    tokenBalance,
    needsApproval,

    // Loading states
    isLoadingPoolData,
    isLoadingUserData,
  } = useStake({
    onStakeSuccess: (receipt) => {
      console.log('Staked!', receipt)
    },
    onUnstakeSuccess: (receipt) => {
      console.log('Unstaked!', receipt)
    },
    onClaimSuccess: (receipt) => {
      console.log('Claimed rewards!', receipt)
    },
  })

  const handleStake = () => {
    const amount = 1000n // Amount in wei
    if (needsApproval) {
      approve.mutate(amount)
    } else {
      stake.mutate(amount)
    }
  }

  return (
    <div>
      <h2>Staking</h2>
      <p>Your Balance: {tokenBalance?.formatted}</p>
      <p>Staked: {stakedBalance?.formatted}</p>
      <p>Total Staked: {totalStaked?.formatted}</p>
      <p>APR: {aprBpsWeth ? (Number(aprBpsWeth) / 100).toFixed(2) : '—'}%</p>

      <button onClick={handleStake} disabled={stake.isPending}>
        {needsApproval ? 'Approve' : 'Stake'}
      </button>

      <button
        onClick={() => unstake.mutate({ amount: 500n })}
        disabled={unstake.isPending}
      >
        Unstake
      </button>

      <button onClick={() => claim.mutate()} disabled={claim.isPending}>
        Claim Rewards
      </button>
    </div>
  )
}
```

**Options:**

- `onStakeSuccess`: Callback after successful stake
- `onUnstakeSuccess`: Callback after successful unstake
- `onClaimSuccess`: Callback after successful claim

**Mutations:**

- `approve.mutate(amount)`: Approve tokens for staking
- `stake.mutate(amount)`: Stake tokens
- `unstake.mutate({ amount, to? })`: Unstake tokens
- `claim.mutate()`: Claim all rewards
- `accrueRewards.mutate(tokenAddress)`: Accrue rewards for a token
- `accrueAllRewards.mutate()`: Accrue all rewards

### `useSwap()`

Swap functionality with quotes and price impact.

```typescript
import { useSwap } from 'levr-sdk/client'
import { useState } from 'react'

function SwapInterface() {
  const [amountIn, setAmountIn] = useState('100')
  const [zeroForOne, setZeroForOne] = useState(true) // true = token -> WETH

  const {
    // Mutations
    swap,

    // Queries
    quote,
    balances,
    poolKey,
    pricing,

    // Convenience
    tokenBalance,
    wethBalance,
    buildSwapConfig,
  } = useSwap({
    quoteParams: {
      zeroForOne,
      amountIn,
      amountInDecimals: 18,
      amountOutDecimals: 18,
    },
    onSwapSuccess: (receipt) => {
      console.log('Swapped!', receipt)
    },
  })

  const handleSwap = () => {
    if (!quote.data) return

    const config = buildSwapConfig({
      zeroForOne,
      amountIn: parseUnits(amountIn, 18),
      amountInDecimals: 18,
      minAmountOut: quote.data.amountOut * 99n / 100n, // 1% slippage
    })

    swap.mutate(config)
  }

  return (
    <div>
      <h2>Swap</h2>

      <select onChange={(e) => setZeroForOne(e.target.value === 'sell')}>
        <option value="sell">Token → WETH</option>
        <option value="buy">WETH → Token</option>
      </select>

      <input
        type="text"
        value={amountIn}
        onChange={(e) => setAmountIn(e.target.value)}
        placeholder="Amount"
      />

      {quote.data && (
        <div>
          <p>You'll receive: {formatUnits(quote.data.amountOut, 18)}</p>
          <p>Price Impact: {quote.data.priceImpactBps}%</p>
          {quote.data.hookFees && (
            <p>Hook Fees: {JSON.stringify(quote.data.hookFees)}</p>
          )}
        </div>
      )}

      <button onClick={handleSwap} disabled={swap.isPending || !quote.data}>
        Swap
      </button>
    </div>
  )
}
```

**Options:**

- `quoteParams`: Parameters for quote calculation
  - `zeroForOne`: Swap direction (true = token → WETH)
  - `amountIn`: Amount to swap (as string)
  - `amountInDecimals`: Input token decimals
  - `amountOutDecimals`: Output token decimals
- `onSwapSuccess`: Callback after successful swap

**Queries:**

- `quote.data`: Quote with price impact and hook fees
- `balances`: Token and WETH balances
- `pricing`: USD pricing data
- `poolKey`: Uniswap V4 pool key

### `useGovernance()`

Governance operations including proposals and voting.

```typescript
import { useGovernance } from 'levr-sdk/client'

function GovernanceInterface() {
  const {
    // Mutations
    proposeTransfer,
    proposeBoost,
    vote,
    executeProposal,
    claimAirdrop,

    // Queries
    currentCycleId,
    addresses,
    airdropStatus,
    proposal,

    // Convenience
    treasuryAddress,
    isAirdropAvailable,

    // Loading states
    isProposing,
    isVoting,
    isExecuting,
  } = useGovernance({
    onVoteSuccess: (receipt) => {
      console.log('Voted!', receipt)
    },
    onExecuteProposalSuccess: (receipt) => {
      console.log('Executed!', receipt)
    },
  })

  const handleProposeTransfer = () => {
    proposeTransfer.mutate({
      recipient: '0x...',
      amount: parseUnits('1000', 18),
      description: 'Fund development team',
    })
  }

  const handleVote = (proposalId: bigint, support: boolean) => {
    vote.mutate({ proposalId, support })
  }

  return (
    <div>
      <h2>Governance</h2>

      <p>Current Cycle: {currentCycleId?.toString()}</p>
      <p>Treasury: {treasuryAddress}</p>

      {isAirdropAvailable && (
        <button onClick={() => claimAirdrop.mutate()}>
          Claim Airdrop
        </button>
      )}

      <button onClick={handleProposeTransfer} disabled={isProposing}>
        Propose Transfer
      </button>
    </div>
  )
}
```

**Options:**

- `onVoteSuccess`: Callback after successful vote
- `onExecuteProposalSuccess`: Callback after successful execution
- `onProposeSuccess`: Callback after successful proposal

**Mutations:**

- `proposeTransfer.mutate({ recipient, amount, description })`: Propose a treasury transfer
- `proposeBoost.mutate({ rewardIndex, amount, description })`: Propose staking boost
- `vote.mutate({ proposalId, support })`: Vote on a proposal
- `executeProposal.mutate(proposalId)`: Execute a passed proposal
- `claimAirdrop.mutate()`: Claim airdrop tokens

### `useFeeReceivers()`

Manage fee receiver addresses.

```typescript
import { useFeeReceivers } from 'levr-sdk/client'

function FeeReceiverManager() {
  const { query, mutate } = useFeeReceivers({
    onSuccess: (hash) => {
      console.log('Updated fee receiver:', hash)
    },
  })

  const handleUpdate = () => {
    mutate.mutate({
      clankerToken: '0x...',
      rewardIndex: 0,
      newRecipient: '0x...',
    })
  }

  return (
    <div>
      <h2>Fee Receivers</h2>
      {query.data?.map((receiver, i) => (
        <div key={i}>
          <p>Index {i}: {receiver}</p>
        </div>
      ))}
      <button onClick={handleUpdate}>Update Receiver</button>
    </div>
  )
}
```

## Utility Hooks

### `useSetClankerToken()`

Update the global Clanker token context.

```typescript
import { useSetClankerToken } from 'levr-sdk/client'

function TokenSwitcher() {
  const setClankerToken = useSetClankerToken()

  return (
    <select onChange={(e) => setClankerToken(e.target.value as `0x${string}`)}>
      <option value="0x...">Token A</option>
      <option value="0x...">Token B</option>
    </select>
  )
}
```

### `useLevrRefetch()`

Manual control over query refetching.

```typescript
import { useLevrRefetch } from 'levr-sdk/client'

function RefreshButton() {
  const refetch = useLevrRefetch()

  return (
    <div>
      <button onClick={() => refetch.all()}>Refresh All</button>
      <button onClick={() => refetch.staking()}>Refresh Staking</button>
      <button onClick={() => refetch.governance()}>Refresh Governance</button>
      <button onClick={() => refetch.afterStake()}>After Stake Refetch</button>
    </div>
  )
}
```

**Methods:**

- `all()`: Refetch all queries
- `staking()`: Refetch all staking-related queries
- `governance()`: Refetch all governance-related queries
- `afterStake()`: Smart refetch after staking operations
- `afterSwap()`: Smart refetch after swap operations
- `afterGovernance()`: Smart refetch after governance operations

### `useClanker()`

Get the Clanker SDK instance for advanced usage.

```typescript
import { useClanker } from 'levr-sdk/client'

function AdvancedComponent() {
  const clanker = useClanker()

  // Use Clanker SDK methods directly
  useEffect(() => {
    if (clanker) {
      // Do something with Clanker SDK
    }
  }, [clanker])

  return <div>Advanced component</div>
}
```

## Query Keys

All query keys are exported for advanced use cases:

```typescript
import { queryKeys } from 'levr-sdk/client'
import { useQueryClient } from '@tanstack/react-query'

function CustomInvalidation() {
  const queryClient = useQueryClient()

  const invalidateProject = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.project(factoryAddress, clankerToken, chainId),
    })
  }

  return <button onClick={invalidateProject}>Invalidate Project</button>
}
```
