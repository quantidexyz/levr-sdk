# updateFeeReceiver()

Update the fee receiver address for a Clanker token.

## Usage

```typescript
import { updateFeeReceiver } from 'levr-sdk'

const hash = await updateFeeReceiver({
  walletClient,
  clankerToken: '0x...',
  chainId: 8453, // Base
  rewardIndex: 0, // Index of the fee receiver to update
  newRecipient: '0x...', // New recipient address (e.g., staking contract)
})

console.log('Updated fee receiver:', hash)
```

## Parameters

- `walletClient` (required): Viem wallet client
- `clankerToken` (required): Clanker token address
- `chainId` (required): Chain ID
- `rewardIndex` (required): Index of the fee receiver to update (usually 0)
- `newRecipient` (required): New recipient address (typically the staking contract)

## Returns

```typescript
;`0x${string}` // Transaction hash
```

## Notes

- Only the admin for the specific reward index can update it
- Typically used to route trading fees to the staking contract
- Check your admin status with `feeReceivers()` first
- Transaction will revert if you're not the admin for that index
