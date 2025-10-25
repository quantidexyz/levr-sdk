# useFactory

Access factory configuration from LevrProvider context.

## Usage

```typescript
import { useFactory } from 'levr-sdk/client'

function FactoryInfo() {
  const { data: factory, isLoading } = useFactory()

  if (isLoading) return <div>Loading factory config...</div>
  if (!factory) return <div>Factory config not available</div>

  return (
    <div>
      <h2>Factory Configuration</h2>

      <h3>Fees</h3>
      <p>Protocol Fee: {factory.protocolFeeBps / 100}%</p>
      <p>Protocol Treasury: {factory.protocolTreasury}</p>

      <h3>Governance Parameters</h3>
      <p>Proposal Window: {factory.proposalWindowSeconds / 3600} hours</p>
      <p>Voting Window: {factory.votingWindowSeconds / 3600} hours</p>
      <p>Max Active Proposals: {factory.maxActiveProposals}</p>
      <p>Quorum: {factory.quorumBps / 100}%</p>
      <p>Approval Threshold: {factory.approvalBps / 100}%</p>
      <p>Min Stake to Submit: {factory.minSTokenBpsToSubmit / 100}%</p>
      <p>Max Proposal Amount: {factory.maxProposalAmountBps / 100}%</p>

      <h3>Staking</h3>
      <p>Stream Window: {factory.streamWindowSeconds / 3600} hours</p>
    </div>
  )
}
```

## Parameters

None - this is a context accessor hook. Data comes from LevrProvider.

## Data Structure

```typescript
{
  protocolFeeBps: number           // Protocol fee in basis points
  protocolTreasury: `0x${string}`  // Protocol treasury address
  streamWindowSeconds: number       // Reward stream window in seconds
  proposalWindowSeconds: number     // Proposal submission window in seconds
  votingWindowSeconds: number       // Voting window in seconds
  maxActiveProposals: number        // Maximum active proposals per cycle
  quorumBps: number                // Quorum threshold in basis points
  approvalBps: number              // Approval threshold in basis points
  minSTokenBpsToSubmit: number     // Minimum staked tokens to submit proposal (bps)
  maxProposalAmountBps: number     // Maximum proposal amount (bps of treasury)
} | null
```

## Returns

- `data`: Factory configuration or null
- `isLoading`: Loading state
- `error`: Error if query failed
- `refetch`: Manual refetch function

## Notes

- Factory config is fetched once per chain and cached indefinitely
- Configuration is static and rarely changes
- Cached for 1 hour (`gcTime: 1000 * 60 * 60`)
- Never goes stale unless chain changes (`staleTime: Infinity`)
- Used internally by governance and staking operations
- All time values in seconds, all percentages in basis points (divide by 100)

## Example: Check Proposal Eligibility

```typescript
import { useFactory, useUser } from 'levr-sdk/client'

function ProposalEligibility() {
  const { data: factory } = useFactory()
  const { data: user } = useUser()

  if (!factory || !user) return null

  const totalStaked = parseFloat(user.staking.stakedBalance.formatted)
  const minRequired = (factory.minSTokenBpsToSubmit / 10000) * totalStaked

  const canPropose = totalStaked >= minRequired

  return (
    <div>
      <p>Can Submit Proposals: {canPropose ? 'Yes' : 'No'}</p>
      {!canPropose && (
        <p>Need {minRequired} more tokens staked</p>
      )}
    </div>
  )
}
```

## Related

- [getFactoryConfig](../../../server-api/queries/factory.md) - Server-side factory config query
