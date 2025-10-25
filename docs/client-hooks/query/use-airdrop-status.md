# useAirdropStatus

Get airdrop status with multi-recipient support from LevrProvider context.

## Usage

```typescript
import { useAirdropStatus, useGovernance } from 'levr-sdk/client'

function AirdropSection() {
  const { data: airdrop, isLoading } = useAirdropStatus()
  const { claimAirdrop, claimAirdropBatch } = useGovernance()

  if (isLoading) return <div>Loading airdrop...</div>
  if (!airdrop) return <div>No airdrop data</div>

  return (
    <div>
      <h2>Airdrop Recipients</h2>
      <p>Deployment: {new Date(airdrop.deploymentTimestamp!).toLocaleDateString()}</p>
      <p>Lockup Duration: {airdrop.lockupDurationHours} hours</p>

      {airdrop.recipients.map((recipient, idx) => (
        <div key={recipient.address}>
          <h3>{recipient.isTreasury ? 'Treasury' : `Recipient ${idx + 1}`}</h3>
          <p>Address: {recipient.address}</p>
          <p>Allocated: {recipient.allocatedAmount.formatted}</p>
          {recipient.allocatedAmount.usd && <p>USD: ${recipient.allocatedAmount.usd}</p>}
          <p>Available: {recipient.availableAmount.formatted}</p>

          {recipient.isAvailable ? (
            <button onClick={() => claimAirdrop.mutate(recipient)}>
              Claim Airdrop
            </button>
          ) : (
            <p>Status: {recipient.error}</p>
          )}
        </div>
      ))}

      {/* Batch claim all available */}
      {airdrop.recipients.some(r => r.isAvailable) && (
        <button onClick={() => claimAirdropBatch.mutate(airdrop.recipients.filter(r => r.isAvailable))}>
          Claim All Available
        </button>
      )}
    </div>
  )
}
```

## Parameters

None - this is a context accessor hook. Data comes from LevrProvider.

## Data Structure

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

## Returns

- `data`: Airdrop status or null
- `isLoading`: Loading state
- `error`: Error if query failed

## Notes

- Airdrop data comes from LevrProvider context (managed centrally)
- Supports multiple recipients (not just treasury)
- Each recipient has individual proof for Merkle tree verification
- `isTreasury` flag identifies the treasury recipient
- Refetches every 30 seconds automatically
- Returns null if no airdrop configured or IPFS URLs not provided
- Requires `ipfsSearchUrl` and `ipfsJsonUrl` in LevrProvider for merkle tree retrieval

## LevrProvider Configuration

To enable airdrop functionality, provide IPFS endpoint URLs to LevrProvider:

```typescript
<LevrProvider
  ipfsSearchUrl="/api/ipfs-search"
  ipfsJsonUrl="/api/ipfs-json"
>
  <YourApp />
</LevrProvider>
```

These endpoints are required for:

- Retrieving merkle tree data from IPFS
- Generating proofs for multi-recipient airdrops
- Checking claim eligibility for each recipient

## Why Separate Query?

Airdrop status is fetched separately to:

1. Reduce initial load time (most projects won't have airdrops)
2. Allow conditional fetching (only when UI needs it)
3. Keep project query focused on core data
4. Support complex multi-recipient scenarios without slowing down project load
