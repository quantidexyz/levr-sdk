# proposal()

Get a single proposal by ID (alternative to proposals() for individual lookups).

## Usage

```typescript
import { proposal, getStaticProject, getProject } from 'levr-sdk'

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

const proposalData = await proposal(
  publicClient,
  projectData.governor,
  projectData.token.address, // projectId
  123n, // proposalId
  projectData.token.decimals,
  projectData.pricing // Optional: for USD values
)

if (!proposalData) {
  console.log('Proposal not found')
  return
}

console.log('Proposal:', proposalData.description)
console.log('Yes votes:', proposalData.yesVotes.formatted)
console.log('No votes:', proposalData.noVotes.formatted)
console.log('Meets quorum:', proposalData.meetsQuorum)
```

## Parameters

- `publicClient` (required): Viem public client
- `governorAddress` (required): Governor contract address
- `projectId` (required): Project ID (token address string)
- `proposalId` (required): Proposal ID (bigint)
- `tokenDecimals` (optional): Token decimals for formatting (default: 18)
- `pricing` (optional): Pricing data for USD values

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
} | null
```

Returns `null` if the proposal is not found.

## Notes

- For most use cases, use `proposals()` instead (more efficient for lists)
- Fetches proposal data from GraphQL indexer
- `meetsQuorum`, `meetsApproval`, and `state` are indexed values
- Returns enriched data with quorum/approval checks
