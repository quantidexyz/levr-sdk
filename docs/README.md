# Levr SDK

TypeScript SDK for Levr protocol — governance, staking, and liquidity management on Uniswap V4.

Two entry points: `levr-sdk` (server) and `levr-sdk/client` (React hooks).

## Install

```bash
bun add levr-sdk viem @tanstack/react-query wagmi
```

## Client (React)

Wrap your app with `LevrProvider`, set the active token, then use hooks:

```typescript
import { LevrProvider, useSetClankerToken, useProject, useUser, useStake } from 'levr-sdk/client'

function App() {
  return (
    <LevrProvider ipfsSearchUrl="/api/ipfs-search" ipfsJsonUrl="/api/ipfs-json">
      <TokenPage clankerToken="0x..." />
    </LevrProvider>
  )
}

function TokenPage({ clankerToken }: { clankerToken: `0x${string}` }) {
  useSetClankerToken(clankerToken)
  const { data: project } = useProject()
  const { data: user } = useUser()
  const { stake, needsApproval } = useStake()

  return (
    <div>
      <h1>{project?.token.name} — ${project?.pricing?.tokenUsd}</h1>
      <p>Balance: {user?.balances.token.formatted}</p>
      <p>Staked: {user?.staking.stakedBalance.formatted}</p>
      <p>APR: {project?.stakingStats?.apr.token.percentage}%</p>
      <button onClick={() => stake.mutate(1000)}>Stake</button>
    </div>
  )
}
```

### Reading Data

All data comes from two core hooks — no extra queries needed:

```typescript
const { data: project } = useProject() // Pool-level: token, contracts, pool, treasury, staking stats, governance, pricing, fee splitter
const { data: user } = useUser() // User-level: balances, staked amount, claimable rewards, voting power

// Balances
user?.balances.token.formatted // Token balance (all BalanceResults have .raw, .formatted, .usd?)
user?.balances.pairedToken.formatted // Paired token (WETH, USDC, etc.)
user?.balances.nativeEth?.formatted // Native ETH (only when pairedToken.isNative)

// Staking
user?.staking.stakedBalance.formatted
user?.staking.claimableRewards.staking.formatted
user?.staking.claimableRewards.pairedToken?.formatted

// Pool-level stats
project?.stakingStats?.totalStaked.formatted
project?.stakingStats?.apr.token.percentage
project?.stakingStats?.apr.pairedToken?.percentage
project?.treasuryStats?.balance.formatted
project?.pool?.pairedToken // { address, symbol, decimals, isNative }
project?.pricing?.tokenUsd
project?.pricing?.pairedTokenUsd
project?.governanceStats?.currentCycleId
```

### Mutations

```typescript
// Staking
const { approve, stake, unstake, claim, accrueAllRewards, needsApproval } = useStake()
if (needsApproval('1000')) await approve.mutateAsync(1000)
await stake.mutateAsync(1000)
await accrueAllRewards.mutateAsync() // Required before claiming
await claim.mutateAsync()

// Swapping
const { swap, quote, buildSwapConfig } = useSwap({
  quoteParams: { zeroForOne: true, amountIn: '100', amountInDecimals: 18, amountOutDecimals: 18 },
})

// Governance
const { proposeTransfer, vote, executeProposal, claimAirdrop, claimAirdropBatch } = useGovernance()
await vote.mutateAsync({ proposalId: 1n, support: true })

// Deployment (new token)
const { mutate: deploy } = useDeploy({ ipfsJsonUploadUrl: '/api/ipfs-json' })
deploy({
  name: 'Token',
  symbol: 'TKN',
  image: '...',
  pairedToken: 'ETH',
  treasuryFunding: '30%',
  stakingReward: '100%',
  fees: { type: 'static', feeTier: '3%' },
})

// Registration (existing token)
const { mutate: register } = useRegister()
register({ clankerToken: '0x...' })

// Token admin
const { updateMetadata, updateImage, updateAdmin } = useTokenAdmin()

// Fee splitting
const { mutate: configureSplits } = useConfigureSplits()
configureSplits({
  clankerToken: '0x...',
  rewardIndex: 0,
  splits: [{ receiver: '0x...', percentage: 100 }],
})
```

### Additional Query Hooks

```typescript
const { data: proposals } = useProposals() // Governance proposals + vote receipts
const { data: metrics } = useMetrics() // Global: projectCount, totalStakers, tvlUsd
const { data: projects } = useProjects({ search: '' }) // Project list (GraphQL subscriptions)
const { data: vault } = useVault(tokenAddress) // Vault status/vesting
const { data: factory } = useFactory() // Protocol governance params
const { data: airdrop } = useAirdropStatus() // Multi-recipient airdrop status
```

## Server

Two-step project data flow: `getStaticProject()` (cacheable) then `getProject()` (dynamic):

```typescript
import { getStaticProject, getProject, getUser, Stake, Governance, deployV4 } from 'levr-sdk'
import { createPublicClient, createWalletClient, http } from 'viem'
import { base } from 'viem/chains'

const publicClient = createPublicClient({ chain: base, transport: http() })

// Fetch project data
const staticProject = await getStaticProject({ publicClient, clankerToken: '0x...' })
if (!staticProject?.isRegistered) throw new Error('Not registered')

const project = await getProject({ publicClient, staticProject })
const user = await getUser({ publicClient, userAddress: '0x...', project })

// Stake tokens
const stake = new Stake({ wallet: walletClient, publicClient, project })
await stake.approve(1000)
await stake.stake(1000)
await stake.accrueAllRewards() // Required before claiming
await stake.claimRewards()

// Governance
const gov = new Governance({ wallet: walletClient, publicClient, project })
await gov.vote(proposalId, true)

// Deploy new token
const result = await deployV4({
  clanker,
  ipfsJsonUploadUrl: '/api/ipfs-json',
  c: {
    name: 'Token',
    symbol: 'TKN',
    image: '...',
    pairedToken: 'ETH',
    treasuryFunding: '30%',
    stakingReward: '100%',
    fees: { type: 'static', feeTier: '3%' },
  },
})
console.log('Deployed:', result.address)

// Other server functions
const factoryConfig = await getFactoryConfig(base.id)
const proposals = await proposals(publicClient, staticProject, cycleId, projectId)
```

## Key Concepts

**Paired Token** — Each pool has a paired token (WETH, USDC, etc.) accessible via `project.pool.pairedToken`. All APIs use `pairedToken` instead of `weth`.

**Manual Accrual** — Rewards must be explicitly accrued before claiming: `accrueAllRewards()` then `claimRewards()`.

**Voting Power** — Time-weighted: staked amount x time staked. Partial unstakes reduce proportionally.

**Protocol Fees** — Variable fee on stake/unstake operations, deducted from amount.

**Streaming Rewards** — Rewards stream over a window (`stakingStats.streamParams`). Check `outstandingRewards.staking.streaming` and `.claimable`.

## Docs

Full documentation at **https://www.levr.world/api/docs/sdk/**

- [Getting Started](./getting-started.md) — Setup guide
- [Quick Reference](./QUICK-REFERENCE.md) — Data access cheatsheet
- [Client Hooks](./client-hooks/) — All React hooks
- [Server API](./server-api/) — Server functions, classes, swaps
- [Deployment](./server-api/deployment/deploy-v4.md) — Token deployment schema and flow
- [Architecture](./architecture.md) — Zero-duplicate provider design
- [Migration Guide](./MIGRATION-GUIDE.md) — Upgrading from older versions
