# getFactoryConfig()

Fetch Levr factory configuration including governance and staking parameters.

## Usage

```typescript
import { getFactoryConfig } from 'levr-sdk'

const config = await getFactoryConfig(8453) // Base mainnet chain ID

if (!config) {
  console.log('Factory not found on this chain')
  return
}

console.log('Protocol Fee:', config.protocolFeeBps / 100, '%')
console.log('Protocol Treasury:', config.protocolTreasury)
console.log('Proposal Window:', config.proposalWindowSeconds / 3600, 'hours')
console.log('Voting Window:', config.votingWindowSeconds / 3600, 'hours')
console.log('Quorum:', config.quorumBps / 100, '%')
console.log('Minimum Quorum:', config.minimumQuorumBps / 100, '%')
console.log('Approval Threshold:', config.approvalBps / 100, '%')
```

## Parameters

- `chainId` (required): Chain ID to get factory for

::: tip
`getFactoryConfig()` no longer requires a `publicClient` parameter. It fetches data from the GraphQL indexer instead of multicall.
:::

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
  minimumQuorumBps: number         // Minimum quorum threshold in basis points
} | null
```

Returns `null` if factory not found on the chain.

## Implementation Details

The function fetches factory configuration from the GraphQL indexer:

```typescript
const config = await getFactoryConfig(chainId)
```

This is more efficient than the previous multicall-based approach and doesn't require a `publicClient`.

## Example: Check Governance Rules

```typescript
const config = await getFactoryConfig(chainId)

if (config) {
  console.log('Governance Rules:')
  console.log(`- Proposals open for ${config.proposalWindowSeconds / 3600}h`)
  console.log(`- Voting lasts ${config.votingWindowSeconds / 3600}h`)
  console.log(`- Need ${config.quorumBps / 100}% quorum`)
  console.log(`- Minimum quorum: ${config.minimumQuorumBps / 100}%`)
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
- Data sourced from GraphQL indexer (no RPC calls needed)

## Related

- [useFactory](../../client-hooks/query/use-factory.md) - React hook for factory config
- [getProject](./project.md) - Get project data
