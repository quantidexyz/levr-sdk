# proposals()

Get all governance proposals.

## Usage

```typescript
import { proposals } from 'levr-sdk'

const proposalsList = await proposals({
  publicClient,
  governorAddress: '0x...',
})

for (const proposal of proposalsList) {
  console.log(`Proposal #${proposal.id}:`, proposal.description)
  console.log('For:', proposal.forVotes, 'Against:', proposal.againstVotes)
  console.log('State:', proposal.state)
}
```

## Parameters

- `publicClient` (required): Viem public client
- `governorAddress` (required): Governor contract address

## Returns

```typescript
Array<{
  id: bigint
  proposer: `0x${string}`
  description: string
  startBlock: bigint
  endBlock: bigint
  forVotes: bigint
  againstVotes: bigint
  executed: boolean
  canceled: boolean
  state: string // 'Pending' | 'Active' | 'Defeated' | 'Succeeded' | 'Executed' | 'Canceled'
}>
```
