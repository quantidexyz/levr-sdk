# Advanced Usage

Advanced patterns and examples for using Levr SDK.

## Dynamic Token Switching

Switch between different tokens:

```typescript
import { useSetClankerToken, useProject } from 'levr-sdk/client'

function TokenSwitcher({ tokens }: { tokens: Array<`0x${string}`> }) {
  const setClankerToken = useSetClankerToken()
  const { data: project } = useProject()

  return (
    <div>
      <h2>Current: {project?.token.name}</h2>
      <select onChange={(e) => setClankerToken(e.target.value as `0x${string}`)}>
        {tokens.map((address) => (
          <option key={address} value={address}>{address}</option>
        ))}
      </select>
    </div>
  )
}
```

All queries automatically update when you switch tokens.

## Manual Refetch Control

Control when queries refetch:

```typescript
import { useLevrRefetch } from 'levr-sdk/client'

function RefreshButton() {
  const refetch = useLevrRefetch()

  return (
    <div>
      <button onClick={() => refetch.all()}>Refresh All</button>
      <button onClick={() => refetch.user()}>Refresh User Data</button>
      <button onClick={() => refetch.project()}>Refresh Project</button>
      <button onClick={() => refetch.afterStake()}>Smart Refetch After Stake</button>
      <button onClick={() => refetch.afterTrade()}>Smart Refetch After Trade</button>
    </div>
  )
}
```

## Custom Query Invalidation

Invalidate specific queries:

```typescript
import { queryKeys } from 'levr-sdk/client'
import { useQueryClient } from '@tanstack/react-query'

function CustomInvalidation() {
  const queryClient = useQueryClient()

  const invalidateProject = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.project(clankerToken, chainId),
    })
  }

  return <button onClick={invalidateProject}>Refresh Project</button>
}
```

## Price Impact Warnings

Display warnings for high price impact:

```typescript
import { useSwap } from 'levr-sdk/client'

function SwapWithWarning() {
  const { quote, swap } = useSwap({
    quoteParams: { zeroForOne: true, amountIn: '100', amountInDecimals: 18, amountOutDecimals: 18 }
  })

  const priceImpact = quote.data?.priceImpactBps ?? 0
  const isHighImpact = priceImpact > 5

  return (
    <div>
      <p>Price Impact: {priceImpact.toFixed(2)}%</p>
      {isHighImpact && <p className="text-red-500">⚠️ Very high impact!</p>}
      <button onClick={() => swap.mutate(config)} disabled={isHighImpact}>
        Swap
      </button>
    </div>
  )
}
```

## Optimistic Updates

Show pending states:

```typescript
import { useStake } from 'levr-sdk/client'
import { useState } from 'react'

function OptimisticStaking() {
  const { stake, stakedBalance } = useStake()
  const [pending, setPending] = useState(false)

  const handleStake = (amount: bigint) => {
    setPending(true)
    stake.mutate(amount, {
      onSettled: () => setPending(false)
    })
  }

  return (
    <div>
      <p>
        Staked: {stakedBalance?.formatted}
        {pending && <span> (updating...)</span>}
      </p>
    </div>
  )
}
```

## Server-Side Integration

Use in API routes:

```typescript
// app/api/stats/route.ts
import { project, Stake } from 'levr-sdk'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token') as `0x${string}`

  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  })

  const projectData = await project({
    publicClient,
    factoryAddress: process.env.FACTORY_ADDRESS as `0x${string}`,
    clankerToken: token,
  })

  return Response.json({
    name: projectData.token.name,
    treasury: projectData.treasuryStats.balance.formatted,
  })
}
```

## Testing Components

Test with providers:

```typescript
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LevrProvider } from 'levr-sdk/client'
import { WagmiProvider } from 'wagmi'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })

  return render(
    <WagmiProvider config={testConfig}>
      <QueryClientProvider client={queryClient}>
        <LevrProvider>
          {ui}
        </LevrProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

test('displays project', async () => {
  renderWithProviders(<ProjectComponent />)
  // ... assertions
})
```

## USD Pricing

Enable USD values by providing `oraclePublicClient` to LevrProvider:

```typescript
import { useProject, useUser } from 'levr-sdk/client'

function PricingDisplay() {
  const { data: project } = useProject()
  const { data: user } = useUser()

  return (
    <div>
      {project?.pricing && (
        <>
          <p>Token Price: ${project.pricing.tokenUsd}</p>
          <p>WETH Price: ${project.pricing.wethUsd}</p>
          <p>Your Balance: {user?.balances.token.formatted} (${user?.balances.token.usd})</p>
          <p>Staked Value: ${user?.staking.stakedBalance.usd}</p>
          <p>Treasury Value: ${project.treasuryStats?.balance.usd}</p>
        </>
      )}
    </div>
  )
}
```

## Best Practices

1. **Always use LevrProvider** - Wrap your app at the root
2. **Set token early** - Call `useSetClankerToken` in route components
3. **Trust automatic refetches** - Don't manually refetch after mutations
4. **Use smart refetch methods** - `afterStake()`, `afterSwap()`, etc.
5. **Handle loading states** - Check `isLoading` before rendering data
6. **Provide USD pricing** - Pass `oraclePublicClient` for better UX
7. **Memoize calculations** - Use `useMemo` for expensive operations
8. **Test with providers** - Always wrap tests with required providers
