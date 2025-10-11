# feeReceivers()

Get fee receiver information for a Clanker token.

## Usage

```typescript
import { feeReceivers } from 'levr-sdk'

const receivers = await feeReceivers({
  publicClient,
  clankerToken: '0x...',
  userAddress: '0x...', // Optional: to check if you're an admin
})

receivers?.forEach((receiver, index) => {
  console.log(`Receiver ${index}:`)
  console.log('  Admin:', receiver.admin)
  console.log('  Recipient:', receiver.recipient)
  console.log('  Percentage:', receiver.percentage, '%')
  console.log('  Are you admin?', receiver.areYouAnAdmin)
})
```

## Parameters

- `publicClient` (required): Viem public client
- `clankerToken` (required): Clanker token address
- `userAddress` (optional): User address to check admin status

## Returns

```typescript
Array<{
  areYouAnAdmin: boolean // True if userAddress matches this admin
  admin: `0x${string}` // Admin who can update this receiver
  recipient: `0x${string}` // Current fee recipient address
  percentage: number // Percentage of fees (e.g., 50 = 50%)
}> | undefined
```

## Notes

- Queries the LP locker contract for reward configuration
- Returns undefined if no fee receivers configured
- `areYouAnAdmin` is only true if `userAddress` provided and matches
