# project()

Get complete project data including token info, contracts, pool details, and optional USD pricing.

## Usage

```typescript
import { project } from 'levr-sdk'
import { createPublicClient, http } from 'viem'
import { base, mainnet } from 'viem/chains'

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

const oracleClient = createPublicClient({
  chain: mainnet,
  transport: http(),
})

const projectData = await project({
  publicClient,
  factoryAddress: '0x...',
  clankerToken: '0x...',
  oraclePublicClient: oracleClient, // Optional: for USD pricing
})

console.log('Token:', projectData.token.name)
console.log(
  'Treasury Balance:',
  projectData.treasuryStats.balance.formatted,
  projectData.token.symbol
)
console.log('Token Price:', projectData.pricing?.tokenUsd, 'USD')
```

## Parameters

- `publicClient` (required): Viem public client
- `factoryAddress` (required): Levr factory contract address
- `clankerToken` (required): Clanker token address
- `oraclePublicClient` (optional): Mainnet client for USD pricing

## Returns

```typescript
{
  token: {
    address: `0x${string}`
    name: string
    symbol: string
    decimals: number
  }
  weth: `0x${string}`
  staking: `0x${string}`
  governor: `0x${string}`
  treasury: `0x${string}`
  forwarder: `0x${string}`
  poolKey: {
    currency0: `0x${string}`
    currency1: `0x${string}`
    fee: number
    tickSpacing: number
    hooks: `0x${string}`
  }
  treasuryStats: {
    balance: {
      raw: bigint
      formatted: string
      usd?: string // If oraclePublicClient provided
    }
    totalAllocated: {
      raw: bigint
      formatted: string
      usd?: string
    }
  }
  pricing?: {
    wethUsd: string
    tokenUsd: string
  }
}
```
