# Advanced Usage

Advanced patterns, best practices, and examples for using Levr SDK.

## Dynamic Token Switching

Switch between different Clanker tokens dynamically:

```typescript
import { useSetClankerToken, useProject } from 'levr-sdk/client'

function TokenSwitcher({ tokens }: { tokens: Array<`0x${string}`> }) {
  const setClankerToken = useSetClankerToken()
  const { data: project } = useProject()

  const handleSwitch = (tokenAddress: `0x${string}`) => {
    setClankerToken(tokenAddress)
    // All queries automatically update with new token!
  }

  return (
    <div>
      <h2>Current Token: {project?.token.name}</h2>
      <select onChange={(e) => handleSwitch(e.target.value as `0x${string}`)}>
        {tokens.map((address) => (
          <option key={address} value={address}>
            {address}
          </option>
        ))}
      </select>
    </div>
  )
}
```

## Manual Refetch Control

Control refetching behavior manually when needed:

```typescript
import { useLevrRefetch } from 'levr-sdk/client'

function RefreshControls() {
  const refetch = useLevrRefetch()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefreshAll = async () => {
    setIsRefreshing(true)
    try {
      await refetch.all()
      toast.success('Refreshed all data')
    } catch (error) {
      toast.error('Failed to refresh')
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div>
      <button onClick={handleRefreshAll} disabled={isRefreshing}>
        {isRefreshing ? 'Refreshing...' : 'Refresh All'}
      </button>
      <button onClick={() => refetch.staking()}>Refresh Staking</button>
      <button onClick={() => refetch.governance()}>Refresh Governance</button>
    </div>
  )
}
```

## Custom Query Invalidation

Invalidate specific queries for fine-grained control:

```typescript
import { queryKeys } from 'levr-sdk/client'
import { useQueryClient } from '@tanstack/react-query'
import { useChainId } from 'wagmi'

function CustomInvalidation() {
  const queryClient = useQueryClient()
  const chainId = useChainId()
  const factoryAddress = '0x...'
  const clankerToken = '0x...'

  const invalidateProject = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.project(factoryAddress, clankerToken, chainId),
    })
  }

  const invalidateBalance = (address: `0x${string}`) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.balance(address, []),
      exact: false, // Match all balance queries for this address
    })
  }

  return (
    <div>
      <button onClick={invalidateProject}>Invalidate Project</button>
      <button onClick={() => invalidateBalance('0x...')}>
        Invalidate Balance
      </button>
    </div>
  )
}
```

## Deploying New Tokens

Deploy new tokens with metadata and configuration:

```typescript
import { useDeploy } from 'levr-sdk/client'
import { parseUnits } from 'viem'

function DeployToken() {
  const deploy = useDeploy({
    onSuccess: ({ receipt, address, poolKey }) => {
      console.log('Deployed to:', address)
      console.log('Pool Key:', poolKey)
      console.log('Transaction:', receipt.transactionHash)
    },
    onError: (error) => {
      console.error('Deployment failed:', error)
    },
  })

  const handleDeploy = () => {
    deploy.mutate({
      name: 'My Token',
      ticker: 'TKN',
      imageUrl: 'ipfs://...',
      description: 'A community-governed token',
      initialLiquidity: parseUnits('10', 18), // 10 WETH
      v3PairAddress: '0x...', // Optional: existing V3 pair
      admin: '0x...', // Optional: admin address
      rewardRecipients: ['0x...', '0x...'], // Optional: fee recipients
    })
  }

  return (
    <div>
      <button onClick={handleDeploy} disabled={deploy.isPending}>
        {deploy.isPending ? 'Deploying...' : 'Deploy Token'}
      </button>
      {deploy.isError && <p>Error: {deploy.error?.message}</p>}
    </div>
  )
}
```

## Working with USD Pricing

Enable USD pricing for better UX:

```typescript
import { useProject, useBalance, useStake } from 'levr-sdk/client'

function PricingDisplay() {
  const { data: project } = useProject()
  const { data: balances } = useBalance()
  const { aprBpsWeth, totalStaked } = useStake()

  // Check if USD pricing is available
  const hasUsdPricing = !!project?.pricing

  return (
    <div>
      <h2>Token Information</h2>

      {hasUsdPricing && (
        <>
          <p>Token Price: ${project.pricing.tokenUsd}</p>
          <p>WETH Price: ${project.pricing.wethUsd}</p>
        </>
      )}

      <h3>Your Balances</h3>
      <p>
        Token: {balances?.token?.formatted}
        {hasUsdPricing && balances?.token?.usd && (
          <span> (${balances.token.usd})</span>
        )}
      </p>

      <h3>Staking</h3>
      <p>
        Total Staked: {totalStaked?.formatted}
        {hasUsdPricing && totalStaked?.usd && (
          <span> (${totalStaked.usd})</span>
        )}
      </p>
      {aprBpsWeth && (
        <p>APR: {(Number(aprBpsWeth) / 100).toFixed(2)}%</p>
      )}
    </div>
  )
}
```

## Handling Price Impact

Display price impact warnings for swaps:

```typescript
import { useSwap } from 'levr-sdk/client'
import { useState } from 'react'

function SwapWithWarning() {
  const [amountIn, setAmountIn] = useState('100')
  const [zeroForOne, setZeroForOne] = useState(true)

  const { quote, swap, buildSwapConfig } = useSwap({
    quoteParams: {
      zeroForOne,
      amountIn,
      amountInDecimals: 18,
      amountOutDecimals: 18,
    },
  })

  const priceImpact = quote.data?.priceImpactBps ?? 0
  const isHighImpact = priceImpact > 1 // > 1%
  const isVeryHighImpact = priceImpact > 5 // > 5%

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
      <input
        type="text"
        value={amountIn}
        onChange={(e) => setAmountIn(e.target.value)}
      />

      {quote.data && (
        <div>
          <p>Amount Out: {formatUnits(quote.data.amountOut, 18)}</p>
          <p className={isVeryHighImpact ? 'text-red-500' : isHighImpact ? 'text-yellow-500' : ''}>
            Price Impact: {priceImpact.toFixed(2)}%
          </p>

          {isVeryHighImpact && (
            <div className="warning">
              ⚠️ Very high price impact! Consider reducing the amount.
            </div>
          )}

          {quote.data.hookFees && (
            <p>Fees: {JSON.stringify(quote.data.hookFees)}</p>
          )}
        </div>
      )}

      <button
        onClick={handleSwap}
        disabled={swap.isPending || !quote.data || isVeryHighImpact}
      >
        {isVeryHighImpact ? 'Impact Too High' : 'Swap'}
      </button>
    </div>
  )
}
```

## Optimistic Updates

Show optimistic updates for better UX:

```typescript
import { useStake, useBalance } from 'levr-sdk/client'
import { useState } from 'react'

function OptimisticStaking() {
  const { data: balances } = useBalance()
  const { stake, stakedBalance } = useStake()
  const [optimisticStaked, setOptimisticStaked] = useState<bigint>()

  const handleStake = (amount: bigint) => {
    // Show optimistic update
    setOptimisticStaked((stakedBalance?.raw ?? 0n) + amount)

    stake.mutate(amount, {
      onSuccess: () => {
        // Clear optimistic state
        setOptimisticStaked(undefined)
      },
      onError: () => {
        // Revert optimistic state
        setOptimisticStaked(undefined)
      },
    })
  }

  const displayedStaked = optimisticStaked ?? stakedBalance?.raw ?? 0n

  return (
    <div>
      <p>
        Staked: {formatUnits(displayedStaked, 18)}
        {optimisticStaked && <span className="opacity-50"> (pending)</span>}
      </p>
      <button onClick={() => handleStake(parseUnits('100', 18))}>
        Stake 100
      </button>
    </div>
  )
}
```

## Pagination for Proposals

Handle large lists of proposals with pagination:

```typescript
import { useProposals } from 'levr-sdk/client'
import { useState } from 'react'

function PaginatedProposals() {
  const { data: proposals } = useProposals()
  const [page, setPage] = useState(0)
  const pageSize = 10

  const paginatedProposals = proposals?.slice(
    page * pageSize,
    (page + 1) * pageSize
  )
  const totalPages = Math.ceil((proposals?.length ?? 0) / pageSize)

  return (
    <div>
      <h2>Proposals</h2>
      {paginatedProposals?.map((proposal) => (
        <div key={proposal.id}>
          <h3>Proposal #{proposal.id}</h3>
          <p>{proposal.description}</p>
        </div>
      ))}

      <div>
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          Previous
        </button>
        <span>Page {page + 1} of {totalPages}</span>
        <button
          onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
          disabled={page >= totalPages - 1}
        >
          Next
        </button>
      </div>
    </div>
  )
}
```

## Error Handling

Robust error handling for mutations:

```typescript
import { useStake } from 'levr-sdk/client'
import { useState } from 'react'

function StakeWithErrorHandling() {
  const [error, setError] = useState<string>()

  const { stake } = useStake({
    onStakeSuccess: () => {
      setError(undefined)
      toast.success('Staked successfully!')
    },
  })

  const handleStake = (amount: bigint) => {
    setError(undefined)

    stake.mutate(amount, {
      onError: (error) => {
        // Handle specific errors
        if (error.message.includes('insufficient')) {
          setError('Insufficient balance')
        } else if (error.message.includes('allowance')) {
          setError('Approval required')
        } else if (error.message.includes('user rejected')) {
          setError('Transaction rejected')
        } else {
          setError(error.message)
        }
      },
    })
  }

  return (
    <div>
      <button onClick={() => handleStake(parseUnits('100', 18))}>
        Stake 100
      </button>

      {error && (
        <div className="error">
          ❌ {error}
        </div>
      )}

      {stake.isPending && (
        <div className="loading">
          ⏳ Transaction pending...
        </div>
      )}
    </div>
  )
}
```

## Server-Side Integration

Use the SDK in server-side contexts (API routes, cron jobs, etc.):

```typescript
// app/api/stats/route.ts
import { project, proposals, Stake } from 'levr-sdk'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clankerToken = searchParams.get('token') as `0x${string}`

  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  })

  // Get project data
  const projectData = await project({
    publicClient,
    factoryAddress: process.env.FACTORY_ADDRESS as `0x${string}`,
    clankerToken,
  })

  // Get proposals
  const proposalsList = await proposals({
    publicClient,
    governorAddress: projectData.governor,
  })

  // Get staking stats
  const stake = new Stake({
    publicClient,
    stakingAddress: projectData.staking,
    tokenAddress: projectData.token.address,
    tokenDecimals: 18,
  })

  const poolData = await stake.getPoolData()

  return Response.json({
    token: projectData.token,
    treasury: projectData.treasuryStats.balance.formatted,
    totalStaked: formatUnits(poolData.totalStaked, 18),
    proposalsCount: proposalsList.length,
  })
}
```

## Testing Components

Test components using Levr SDK hooks:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LevrProvider } from 'levr-sdk/client'
import { WagmiProvider } from 'wagmi'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <WagmiProvider config={testWagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <LevrProvider>
          {ui}
        </LevrProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

test('displays project data', async () => {
  renderWithProviders(<ProjectComponent />)

  await waitFor(() => {
    expect(screen.getByText(/Token Name/i)).toBeInTheDocument()
  })
})
```

## Performance Optimization

Optimize rendering with proper memoization:

```typescript
import { useProject, useBalance } from 'levr-sdk/client'
import { useMemo } from 'react'

function OptimizedComponent() {
  const { data: project } = useProject()
  const { data: balances } = useBalance()

  // Memoize expensive calculations
  const portfolioValue = useMemo(() => {
    if (!project?.pricing || !balances) return null

    const tokenValue = Number(balances.token?.formatted ?? 0) *
      Number(project.pricing.tokenUsd)
    const wethValue = Number(balances.weth?.formatted ?? 0) *
      Number(project.pricing.wethUsd)

    return tokenValue + wethValue
  }, [project?.pricing, balances])

  return (
    <div>
      {portfolioValue && (
        <p>Portfolio Value: ${portfolioValue.toFixed(2)}</p>
      )}
    </div>
  )
}
```

## Best Practices Summary

1. **Always use LevrProvider** - Wrap your app at the root
2. **Set token early** - Call `useSetClankerToken` as soon as possible
3. **Trust automatic refetches** - Don't manually refetch after mutations
4. **Use smart refetch methods** - Use `afterStake()`, `afterSwap()`, etc.
5. **Handle loading states** - Check `isLoading` before accessing data
6. **Handle errors** - Provide good error messages to users
7. **Show price impact** - Warn users about high price impact swaps
8. **Use USD pricing** - Provide `oraclePublicClient` for better UX
9. **Memoize calculations** - Use `useMemo` for expensive computations
10. **Test with providers** - Always wrap tests with required providers
