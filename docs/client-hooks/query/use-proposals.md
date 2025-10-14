# useProposals

Get the list of governance proposals with vote receipts.

## Usage

```typescript
import { useProposals } from 'levr-sdk/client'

function ProposalsList() {
  const { data, isLoading } = useProposals()

  if (isLoading) return <div>Loading proposals...</div>
  if (!data) return <div>No proposals</div>

  return (
    <div>
      <h2>Cycle {data.cycleId.toString()} Proposals</h2>
      {data.winner > 0n && <p>Winner: Proposal #{data.winner.toString()}</p>}

      {data.proposals.map((proposal) => (
        <div key={proposal.id.toString()}>
          <h3>Proposal #{proposal.id.toString()}</h3>
          <p>{proposal.description}</p>
          <p>Yes: {proposal.yesVotes.formatted} | No: {proposal.noVotes.formatted}</p>
          <p>Amount: {proposal.amount.formatted} {proposal.amount.usd && `($${proposal.amount.usd})`}</p>
          <p>Meets Quorum: {proposal.meetsQuorum ? 'Yes' : 'No'}</p>
          <p>Meets Approval: {proposal.meetsApproval ? 'Yes' : 'No'}</p>
          <p>State: {proposal.state}</p>

          {/* Vote receipt (if user is connected) */}
          {proposal.voteReceipt?.hasVoted && (
            <p>
              You voted: {proposal.voteReceipt.support ? 'Yes' : 'No'}
              {' '}({proposal.voteReceipt.votes.toString()} voting power)
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
```

## Data Structure

```typescript
{
  proposals: Array<{
    id: bigint
    proposalType: number // 0 = boost, 1 = transfer
    proposer: `0x${string}`
    amount: BalanceResult
    recipient: `0x${string}`
    description: string
    createdAt: { timestamp: bigint, date: Date }
    votingStartsAt: { timestamp: bigint, date: Date }
    votingEndsAt: { timestamp: bigint, date: Date }
    yesVotes: BalanceResult
    noVotes: BalanceResult
    totalBalanceVoted: bigint
    executed: boolean
    cycleId: bigint
    meetsQuorum: boolean
    meetsApproval: boolean
    state: number
    voteReceipt?: {
      hasVoted: boolean
      support: boolean
      votes: bigint
    }
  }>
  cycleId: bigint
  winner: bigint
}
```

## Notes

- Proposals automatically include vote receipts when user is connected
- Vote receipts are fetched in the same multicall as proposal data (no extra RPC calls)
- Refetches when user connects/disconnects wallet
