# proposals()

Get all governance proposals for a cycle with enriched data and vote receipts.

## Usage

```typescript
import { proposals, getStaticProject, getProject } from 'levr-sdk'

// First get project data
const staticProject = await getStaticProject({
  publicClient,
  clankerToken: '0x...',
})

if (!staticProject?.isRegistered) {
  throw new Error('Project not registered')
}

const projectData = await getProject({
  publicClient,
  staticProject,
})

// Then get proposals
const result = await proposals({
  publicClient,
  governorAddress: projectData.governor,
  projectId: projectData.token.address, // Required
  cycleId: projectData.governanceStats?.currentCycleId, // Optional: defaults to current
  tokenDecimals: projectData.token.decimals,
  pricing: projectData.pricing,
  pageSize: 50, // Optional: default 50
  userAddress: '0x...', // Optional: include vote receipts if provided
})

console.log(`Cycle ${result.cycleId} has ${result.proposals.length} proposals`)
console.log(`Winner: Proposal #${result.winner}`)

for (const proposal of result.proposals) {
  console.log(`Proposal #${proposal.id}:`, proposal.description)
  console.log('Yes:', proposal.yesVotes.formatted, 'No:', proposal.noVotes.formatted)
  console.log('Meets Quorum:', proposal.meetsQuorum)
  console.log('Meets Approval:', proposal.meetsApproval)
  console.log('State:', proposal.state)

  if (proposal.voteReceipt?.hasVoted) {
    console.log('You voted:', proposal.voteReceipt.support ? 'Yes' : 'No')
  }
}
```

## Parameters

- `publicClient` (required): Viem public client
- `governorAddress` (required): Governor contract address
- `projectId` (required): Project ID (token address string)
- `cycleId` (optional): Cycle ID to fetch proposals for (defaults to current cycle)
- `tokenDecimals` (optional): Token decimals for formatting (default: 18)
- `pricing` (optional): Pricing data for USD values
- `pageSize` (optional): Maximum proposals to return (default: 50)
- `userAddress` (optional): User address to include vote receipts

## Returns

```typescript
{
  proposals: Array<{
    id: bigint
    proposalType: number // 0 = boost, 1 = transfer
    proposer: `0x${string}`
    amount: BalanceResult
    recipient: `0x${string}`
    description: string
    createdAt: { timestamp: bigint; date: Date }
    votingStartsAt: { timestamp: bigint; date: Date }
    votingEndsAt: { timestamp: bigint; date: Date }
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

- Uses GraphQL indexer for efficient querying (no event scanning)
- `meetsQuorum`, `meetsApproval`, and `state` are indexed and updated on each vote
- Vote receipts included when `userAddress` provided (no extra RPC calls)
- Returns enriched data with quorum/approval checks and state
