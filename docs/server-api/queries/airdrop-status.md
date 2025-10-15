# getTreasuryAirdropStatus()

Get airdrop status for a treasury (called separately from project data).

## Usage

```typescript
import { getTreasuryAirdropStatus, getProject } from 'levr-sdk'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

// First get project data
const project = await getProject({
  publicClient,
  clankerToken: '0x...',
})

if (!project) {
  throw new Error('Project not found')
}

// Then get airdrop status
const tokenUsdPrice = project.pricing ? parseFloat(project.pricing.tokenUsd) : null

const airdropStatus = await getTreasuryAirdropStatus(
  publicClient,
  project.token.address,
  project.treasury,
  project.token.decimals,
  tokenUsdPrice
)

if (airdropStatus?.isAvailable) {
  console.log('Airdrop available:', airdropStatus.availableAmount.formatted)
  console.log('USD Value:', airdropStatus.availableAmount.usd)
} else {
  console.log('No airdrop available')
}
```

## Parameters

- `publicClient` (required): Viem public client
- `clankerToken` (required): Clanker token address
- `treasury` (required): Treasury contract address
- `tokenDecimals` (required): Token decimals for formatting
- `tokenUsdPrice` (optional): Token USD price for USD value calculations

## Returns

```typescript
{
  availableAmount: BalanceResult
  allocatedAmount: BalanceResult
  isAvailable: boolean
  error?: string
} | null
```

Returns `null` if:
- No airdrop contract found
- Airdrop not allocated
- Error fetching data

## Example Response

```typescript
{
  availableAmount: {
    raw: 30000000000000000000000000000n,
    formatted: "30000000000.0",
    usd: "1500000.00"
  },
  allocatedAmount: {
    raw: 30000000000000000000000000000n,
    formatted: "30000000000.0",
    usd: "1500000.00"
  },
  isAvailable: true
}
```

## Notes

- Airdrop data is **no longer** part of `getProject()` return value
- This is a separate function that should be called when needed
- Checks if treasury has an airdrop allocated via Clanker airdrop contract
- Returns `isAvailable: true` only if airdrop exists and hasn't been fully claimed
- USD values calculated if `tokenUsdPrice` provided

## Why Separate?

Airdrop status is fetched separately to:
1. Reduce initial load time (most projects won't have airdrops)
2. Allow conditional fetching (only fetch when UI needs it)
3. Keep project query focused on core data
4. Improve performance for common cases

## Related

- [getProject()](./project.md) - Get full project data
- [useAirdropStatus](../../client-hooks/query/use-airdrop-status.md) - React hook for airdrop status

