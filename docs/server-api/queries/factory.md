# getFactoryConfig()

Fetch Levr factory configuration including governance and staking parameters.

## Usage

```typescript
import { getFactoryConfig } from 'levr-sdk'
import { createPublicClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
})

const config = await getFactoryConfig(publicClient, baseSepolia.id)

if (!config) {
  console.log('Factory not deployed on this chain')
  return
}

console.log('Protocol Fee:', config.protocolFeeBps / 100, '%')
console.log('Protocol Treasury:', config.protocolTreasury)
console.log('Proposal Window:', config.proposalWindowSeconds / 3600, 'hours')
console.log('Voting Window:', config.votingWindowSeconds / 3600, 'hours')
console.log('Quorum:', config.quorumBps / 100, '%')
console.log('Approval Threshold:', config.approvalBps / 100, '%')
```

## Parameters

- `publicClient` (required): Viem public client
- `chainId` (required): Chain ID to get factory for

## Returns

```typescript
{
  protocolFeeBps: number           // Protocol fee in basis points (e.g., 200 = 2%)
  protocolTreasury: Address        // Protocol treasury receiving fees
  streamWindowSeconds: number       // Reward streaming window in seconds
  proposalWindowSeconds: number     // Proposal submission window in seconds
  votingWindowSeconds: number       // Voting duration in seconds
  maxActiveProposals: number        // Max active proposals per cycle
  quorumBps: number                // Quorum threshold in basis points
  approvalBps: number              // Approval threshold in basis points
  minSTokenBpsToSubmit: number     // Min staked tokens to submit (bps)
  maxProposalAmountBps: number     // Max proposal amount (bps of treasury)
} | null
```

Returns `null` if factory not found on the chain.

## Implementation Details

The function uses a single multicall to efficiently fetch all factory parameters:

```typescript
await publicClient.multicall({
  contracts: [
    { functionName: 'protocolFeeBps' },
    { functionName: 'protocolTreasury' },
    { functionName: 'streamWindowSeconds' },
    { functionName: 'proposalWindowSeconds' },
    { functionName: 'votingWindowSeconds' },
    { functionName: 'maxActiveProposals' },
    { functionName: 'quorumBps' },
    { functionName: 'approvalBps' },
    { functionName: 'minSTokenBpsToSubmit' },
    { functionName: 'maxProposalAmountBps' },
  ],
})
```

## Example: Check Governance Rules

```typescript
const config = await getFactoryConfig(publicClient, chainId)

if (config) {
  console.log('Governance Rules:')
  console.log(`- Proposals open for ${config.proposalWindowSeconds / 3600}h`)
  console.log(`- Voting lasts ${config.votingWindowSeconds / 3600}h`)
  console.log(`- Need ${config.quorumBps / 100}% quorum`)
  console.log(`- Need ${config.approvalBps / 100}% approval`)
  console.log(`- Max ${config.maxActiveProposals} proposals per cycle`)
  console.log(`- Proposals limited to ${config.maxProposalAmountBps / 100}% of treasury`)
}
```

## Notes

- Factory config is static and rarely changes
- All time values in seconds
- All percentages in basis points (divide by 100 for percentage)
- Configuration applies to all projects using this factory
- Used to validate proposals and governance operations

## Related

- [useFactory](../../../client-hooks/query/use-factory.md) - React hook for factory config
- [getProject](./project.md) - Get project data
