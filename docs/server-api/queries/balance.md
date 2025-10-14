# balance()

Get token balances for an address (used internally by `getUser()`).

## Usage

::: tip
For most use cases, use `getUser()` instead which includes balances in a single multicall with staking data.
:::

```typescript
import { balance } from 'levr-sdk'
import { zeroAddress } from 'viem'

const balances = await balance({
  publicClient,
  address: '0x...', // User address
  tokens: [
    { address: '0x...', decimals: 18, key: 'token' },
    { address: '0x...', decimals: 18, key: 'weth' },
    { address: zeroAddress, decimals: 18, key: 'eth' }, // Native ETH
  ],
  pricing: { wethUsd: '2500', tokenUsd: '0.05' }, // Optional
})

console.log('Token:', balances.token?.formatted)
console.log('WETH:', balances.weth?.formatted)
console.log('ETH:', balances.eth?.formatted)

if (balances.token?.usd) {
  console.log('Token USD:', balances.token.usd)
}
```

## Parameters

- `publicClient` (required): Viem public client
- `address` (required): User address to check balance
- `tokens` (required): Array of token configs with `address`, `decimals`, and `key`
- `pricing` (optional): USD pricing data for balance USD values

## Returns

```typescript
Record<string, BalanceResult>

// Where BalanceResult is:
{
  raw: bigint
  formatted: string
  usd?: string // If pricing provided
}
```

## Notes

- Handles both ERC20 tokens and native ETH (use `zeroAddress` for native)
- Uses multicall for efficient ERC20 balance fetching
- Parallel native balance fetch with multicall
- USD values calculated if pricing data provided
