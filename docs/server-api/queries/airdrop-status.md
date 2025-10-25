# getAirdropStatus()

Get airdrop status with multi-recipient support (called separately from project data).

## Usage

```typescript
import { getAirdropStatus, getProject } from 'levr-sdk'
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

// Then get airdrop status with IPFS URLs
const tokenUsdPrice = project.pricing ? parseFloat(project.pricing.tokenUsd) : null

const airdropStatus = await getAirdropStatus(
  publicClient,
  project.token.address,
  project.treasury,
  project.token.decimals,
  tokenUsdPrice,
  'https://your-app.com/api/ipfs-search', // Required for merkle tree retrieval
  'https://your-app.com/api/ipfs-json' // Required for merkle tree data
)

if (!airdropStatus) {
  console.log('No airdrop found or IPFS URLs not configured')
  return
}

// Process all recipients
console.log(`Found ${airdropStatus.recipients.length} recipients`)
console.log(`Deployment: ${new Date(airdropStatus.deploymentTimestamp!).toISOString()}`)

for (const recipient of airdropStatus.recipients) {
  console.log(`\nRecipient: ${recipient.address}`)
  console.log(`  Is Treasury: ${recipient.isTreasury}`)
  console.log(`  Allocated: ${recipient.allocatedAmount.formatted}`)
  console.log(`  Available: ${recipient.availableAmount.formatted}`)
  console.log(`  Can Claim: ${recipient.isAvailable}`)
  console.log(`  Proof Length: ${recipient.proof.length}`)
  if (recipient.error) {
    console.log(`  Error: ${recipient.error}`)
  }
}
```

## Parameters

- `publicClient` (required): Viem public client
- `clankerToken` (required): Clanker token address
- `treasury` (required): Treasury contract address (used to identify treasury recipient)
- `tokenDecimals` (required): Token decimals for formatting
- `tokenUsdPrice` (required): Token USD price for USD value calculations (or null)
- `ipfsSearchUrl` (required): Full URL to /api/ipfs-search endpoint
- `ipfsJsonUrl` (required): Full URL to /api/ipfs-json endpoint

## Returns

```typescript
{
  recipients: Array<{
    address: `0x${string}`
    allocatedAmount: BalanceResult
    availableAmount: BalanceResult
    isAvailable: boolean
    proof: `0x${string}`[]
    isTreasury: boolean
    error?: string
  }>
  deploymentTimestamp?: number
  lockupDurationHours?: number
} | null
```

Returns `null` if:

- No airdrop contract found
- Airdrop not allocated
- IPFS URLs not provided
- Merkle tree not found on IPFS
- Error fetching data

## Example Response

```typescript
{
  recipients: [
    {
      address: '0xTreasury...',
      allocatedAmount: {
        raw: 30000000000000000000000000000n,
        formatted: "30000000000.0",
        usd: "1500000.00"
      },
      availableAmount: {
        raw: 30000000000000000000000000000n,
        formatted: "30000000000.0",
        usd: "1500000.00"
      },
      isAvailable: true,
      proof: [], // Empty for single-recipient airdrops
      isTreasury: true
    },
    {
      address: '0xRecipient2...',
      allocatedAmount: {
        raw: 5000000000000000000000000000n,
        formatted: "5000000000.0",
        usd: "250000.00"
      },
      availableAmount: {
        raw: 0n,
        formatted: "0.0",
        usd: "0.00"
      },
      isAvailable: false,
      proof: ['0xabc...', '0xdef...'], // Merkle proofs for multi-recipient
      isTreasury: false,
      error: 'Airdrop is still locked (lockup period not passed)'
    }
  ],
  deploymentTimestamp: 1729800000000,
  lockupDurationHours: 24
}
```

## Notes

- Airdrop data is **no longer** part of `getProject()` return value
- This is a separate function that should be called when needed
- Supports multiple recipients with individual proofs
- Retrieves merkle tree from IPFS using provided endpoints
- Each recipient has `isTreasury` flag to identify treasury allocation
- Proofs are empty array for single-recipient airdrops (merkleRoot equals leaf hash)
- Multi-recipient airdrops use merkle tree to generate individual proofs
- USD values calculated if `tokenUsdPrice` provided
- IPFS URLs are **required** - function returns null without them

## Why Separate?

Airdrop status is fetched separately to:

1. Reduce initial load time (most projects won't have airdrops)
2. Allow conditional fetching (only fetch when UI needs it)
3. Keep project query focused on core data
4. Improve performance for common cases

## IPFS Integration

The function requires IPFS API endpoints to retrieve merkle tree data:

- **ipfsSearchUrl**: Searches for merkle tree CID by tokenAddress and chainId
- **ipfsJsonUrl**: Fetches merkle tree JSON data by CID

These endpoints should:

1. Store merkle trees during deployment via `deployV4({ ipfsJsonUploadUrl })`
2. Query merkle trees by metadata (tokenAddress, chainId)
3. Return merkle tree with recipients and proofs

## Related

- [getProject()](./project.md) - Get full project data
- [useAirdropStatus](../../client-hooks/query/use-airdrop-status.md) - React hook for airdrop status
- [Governance.claimAirdrop()](../classes/governance.md) - Claim airdrop for a recipient
