# balance()

Get token balances for an address.

## Usage

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
})

console.log('Token:', balances.token?.formatted)
console.log('WETH:', balances.weth?.formatted)
console.log('ETH:', balances.eth?.formatted)
```

## Parameters

- `publicClient` (required): Viem public client
- `address` (required): User address to check balance
- `tokens` (required): Array of token configs with `address`, `decimals`, and `key`

## Returns

```typescript
{
  [key: string]: {
    raw: bigint
    formatted: string
  } | undefined
}
```
