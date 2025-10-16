# proposal()

Get a single proposal by ID (alternative to proposals() for individual lookups).

## Usage

```typescript
import { proposal, getProject } from 'levr-sdk'

const projectData = await getProject({
  publicClient,
  clankerToken: '0x...',
})

const proposalData = await proposal(
  publicClient,
  projectData.governor,
  123n, // proposalId
  projectData.token.decimals,
  projectData.pricing, // Optional: for USD values
  '0x...' // Optional: userAddress for vote receipt
)

console.log('Proposal:', proposalData.description)
console.log('Yes votes:', proposalData.yesVotes.formatted)
console.log('No votes:', proposalData.noVotes.formatted)
console.log('Meets quorum:', proposalData.meetsQuorum)

if (proposalData.voteReceipt?.hasVoted) {
  console.log('User voted:', proposalData.voteReceipt.support ? 'Yes' : 'No')
}
```

## Parameters

- `publicClient` (required): Viem public client
- `governorAddress` (required): Governor contract address
- `proposalId` (required): Proposal ID (bigint)
- `tokenDecimals` (required): Token decimals for formatting
- `pricing` (optional): Pricing data for USD values
- `userAddress` (optional): User address to include vote receipt

## Returns

```typescript
{
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
}
```

## Notes

- For most use cases, use `proposals()` instead (more efficient for lists)
- Fetches proposal data in a single multicall
- Includes vote receipt if userAddress provided
- Returns enriched data with quorum/approval checks
