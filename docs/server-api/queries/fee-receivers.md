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
  feePreference?: FeePreference // Which tokens this recipient receives
}> | undefined
```

### Fee Preference Enum

```typescript
enum FeePreference {
  Both = 0, // Receives both clanker token and paired token
  Paired = 1, // Receives paired token only
  Clanker = 2, // Receives clanker token only
}
```

## Fee Splitter Functions

### `configureSplits(params)`

Configure fee splitting for a token (step 1).

```typescript
import { configureSplits } from 'levr-sdk'

const receipt = await configureSplits({
  walletClient,
  publicClient,
  clankerToken: '0x...',
  chainId: 8453,
  splits: [
    { receiver: '0xABC...', percentage: 50 },
    { receiver: '0xDEF...', percentage: 30 },
    { receiver: '0x123...', percentage: 20 },
  ],
})

console.log('Splits configured:', receipt.transactionHash)
```

**Parameters:**

- `walletClient` (required): Viem wallet client
- `publicClient` (required): Viem public client
- `clankerToken` (required): Token to configure splits for
- `chainId` (required): Chain ID
- `splits` (required): Array of split configurations

**Split Config:**

```typescript
{
  receiver: `0x${string}` // Recipient address
  percentage: number // Percentage (0-100)
}
```

**Returns:** `TransactionReceipt`

### `updateRecipientToSplitter(params)`

Update fee recipient to the splitter contract (step 2).

```typescript
import { updateRecipientToSplitter } from 'levr-sdk'

const receipt = await updateRecipientToSplitter({
  walletClient,
  publicClient,
  clankerToken: '0x...',
  chainId: 8453,
  rewardIndex: 0,
})

console.log('Recipient updated:', receipt.transactionHash)
```

**Parameters:**

- `walletClient` (required): Viem wallet client
- `publicClient` (required): Viem public client
- `clankerToken` (required): Token address
- `chainId` (required): Chain ID
- `rewardIndex` (required): Index of fee receiver to update

**Returns:** `TransactionReceipt`

**Note:** Must be called after `configureSplits()` succeeds.

## Complete Flow Example

```typescript
import { configureSplits, updateRecipientToSplitter } from 'levr-sdk'

// Step 1: Configure how fees will be split
const configReceipt = await configureSplits({
  walletClient,
  publicClient,
  clankerToken: '0x...',
  chainId: 8453,
  splits: [
    { receiver: '0xTeam...', percentage: 50 },
    { receiver: '0xMarketing...', percentage: 30 },
    { receiver: '0xDev...', percentage: 20 },
  ],
})

// Step 2: Update LP locker to point to splitter
const updateReceipt = await updateRecipientToSplitter({
  walletClient,
  publicClient,
  clankerToken: '0x...',
  chainId: 8453,
  rewardIndex: 0, // Usually 0 for primary recipient
})

console.log('Fee splitter is now active!')
```

## Notes

- Queries the LP locker contract for reward configuration
- Returns undefined if no fee receivers configured
- `areYouAnAdmin` is only true if `userAddress` provided and matches
- `feePreference` is optional and may be undefined for legacy configurations
- Fee splitter requires both configuration and recipient update to be active
- Only the fee receiver admin can configure splits and update recipients
