# useProposal

Get a single proposal by ID (alternative to useProposals for individual proposals).

## Usage

```typescript
import { useProposal } from 'levr-sdk/client'

function ProposalDetails({ proposalId }: { proposalId: bigint }) {
  const { data: proposal, isLoading } = useProposal({
    proposalId,
    enabled: true,
  })

  if (isLoading) return <div>Loading proposal...</div>
  if (!proposal) return <div>Proposal not found</div>

  return (
    <div>
      <h2>Proposal #{proposal.id.toString()}</h2>
      <p>Type: {proposal.proposalType === 0 ? 'Boost' : 'Transfer'}</p>
      <p>Proposer: {proposal.proposer}</p>
      <p>Amount: {proposal.amount.formatted}</p>
      {proposal.amount.usd && <p>USD: ${proposal.amount.usd}</p>}
      <p>Description: {proposal.description}</p>

      <h3>Voting</h3>
      <p>Yes: {proposal.yesVotes.formatted}</p>
      <p>No: {proposal.noVotes.formatted}</p>
      <p>Meets Quorum: {proposal.meetsQuorum ? 'Yes' : 'No'}</p>
      <p>Meets Approval: {proposal.meetsApproval ? 'Yes' : 'No'}</p>

      {proposal.voteReceipt?.hasVoted && (
        <p>You voted: {proposal.voteReceipt.support ? 'Yes' : 'No'}</p>
      )}
    </div>
  )
}
```

## Options

- `proposalId` (required): Proposal ID to fetch
- `enabled` (optional): Enable/disable query (default: true)

## Returns

- `data`: Enriched proposal details with vote receipt
- `isLoading`: Loading state
- `error`: Error if query failed

## Notes

- For most use cases, use `useProposals()` instead (gets all proposals efficiently)
- This hook is useful for dedicated proposal detail pages
- Includes vote receipt if user is connected
- Automatically refetches every 30 seconds
