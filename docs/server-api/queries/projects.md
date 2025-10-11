# projects()

Get multiple projects data from the Levr factory.

## Usage

```typescript
import { projects } from 'levr-sdk'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

const {
  projects: projectsList,
  fromBlock,
  toBlock,
} = await projects({
  publicClient,
  factoryAddress: '0x...',
  chainId: base.id,
  pageSize: 100, // Optional: default 100
  fromBlock: 0n, // Optional: default to last 10% of blocks
  toBlock: 'latest', // Optional: default 'latest'
})

console.log(`Found ${projectsList.length} projects`)
console.log(`Block range: ${fromBlock} - ${toBlock}`)

for (const project of projectsList) {
  console.log(`${project.token.name} (${project.token.symbol})`)
  console.log(`Treasury: ${project.treasuryStats.balance.formatted} tokens`)
}
```

## Parameters

- `publicClient` (required): Viem public client
- `factoryAddress` (required): Levr factory contract address
- `chainId` (required): Chain ID
- `pageSize` (optional): Maximum number of projects to return (default: 100)
- `fromBlock` (optional): Start block (default: last 10% of blocks)
- `toBlock` (optional): End block (default: 'latest')

## Returns

```typescript
{
  projects: Array<{
    treasury: `0x${string}`
    governor: `0x${string}`
    staking: `0x${string}`
    stakedToken: `0x${string}`
    token: {
      address: `0x${string}`
      decimals: number
      name: string
      symbol: string
      totalSupply: bigint
      metadata: ProjectMetadata | null
      imageUrl?: string
    }
    pool?: {
      poolKey: {
        currency0: `0x${string}`
        currency1: `0x${string}`
        fee: number
        tickSpacing: number
        hooks: `0x${string}`
      }
      feeDisplay: string
      numPositions: bigint
    }
    treasuryStats: {
      balance: {
        raw: bigint
        formatted: string
      }
      totalAllocated: {
        raw: bigint
        formatted: string
      }
      utilization: number
    }
  }>
  fromBlock: bigint
  toBlock: bigint
}
```

## Notes

- Projects are returned in descending order (most recent first)
- Filters out unregistered projects (where contracts are zero addresses)
- Uses multicall for efficient batch fetching
- Treasury stats include balance and total allocated (treasury + staking)
