# useProposals

Get the list of governance proposals.

## Usage

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
