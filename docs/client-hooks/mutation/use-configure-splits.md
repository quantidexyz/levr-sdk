# useConfigureSplits

Configure fee splitting for trading fees. Allows distributing fees from LP trading among multiple recipients.

## Usage

```typescript
import { useConfigureSplits } from 'levr-sdk/client'

function FeeSplitterManager() {
  const { mutate: configureSplits, isPending } = useConfigureSplits({
    onConfigureSplitsSuccess: (hash) => {
      console.log('Splits configured:', hash)
    },
    onUpdateRecipientSuccess: (hash) => {
      console.log('Recipient updated to splitter:', hash)
    },
    onSuccess: (hash) => {
      console.log('Fee splitter fully configured:', hash)
    },
    onError: (error) => {
      console.error('Configuration failed:', error)
    },
  })

  const handleConfigure = () => {
    configureSplits({
      clankerToken: '0x...',
      rewardIndex: 0, // Index of the fee receiver to replace
      splits: [
        { receiver: '0xABC...', percentage: 30 }, // 30%
        { receiver: '0xDEF...', percentage: 40 }, // 40%
        { receiver: '0x123...', percentage: 30 }, // 30%
      ],
      isSplitterAlreadyActive: false, // Set to true if splitter is already the recipient
    })
  }

  return (
    <button onClick={handleConfigure} disabled={isPending}>
      {isPending ? 'Configuring...' : 'Configure Fee Splits'}
    </button>
  )
}
```

## How It Works

Fee splitting is a two-step process:

1. **Configure Splits** (`configureSplits()`): Set up how fees should be split among recipients
2. **Update Recipient** (`updateRecipientToSplitter()`): Point the LP locker to the splitter contract

Both steps are executed automatically in a single mutation.

## Parameters

```typescript
{
  clankerToken: `0x${string}` // Token to configure splitting for
  rewardIndex: number | bigint // Fee receiver index (usually 0)
  splits: SplitConfig[] // Array of split configurations
  isSplitterAlreadyActive?: boolean // Skip step 2 if splitter already set
}
```

### Split Configuration

```typescript
type SplitConfig = {
  receiver: `0x${string}` // Recipient address
  percentage: number // Percentage (0-100, e.g., 30 = 30%)
}
```

**Rules:**

- Total percentages must equal 100
- Each percentage must be > 0
- Maximum 10 receivers

## Options (Callbacks)

- `onConfigureSplitsSuccess(hash)`: Called after step 1 completes
- `onUpdateRecipientSuccess(hash)`: Called after step 2 completes (if needed)
- `onSuccess(hash)`: Called when entire process completes
- `onError(error)`: Called if any step fails

## Returns

- `mutate`: Mutation function to trigger configuration
- `isPending`: Loading state for the entire process
- `data`: Final transaction hash
- `error`: Error if configuration failed

## Checking Current Configuration

Use `useProject()` to check the current fee splitter status:

```typescript
import { useProject } from 'levr-sdk/client'

const { data: project } = useProject()

// Check if splitter is configured
if (project?.feeSplitter?.isConfigured) {
  console.log('Splits:', project.feeSplitter.splits)
  console.log('Total BPS:', project.feeSplitter.totalBps)
  console.log('Is Active:', project.feeSplitter.isActive)
}

// Check pending fees (if splitter is active)
if (project?.feeSplitter?.pendingFees) {
  console.log('Token Pending:', project.feeSplitter.pendingFees.token)
  console.log('WETH Pending:', project.feeSplitter.pendingFees.weth)
}
```

## Example: Replace Single Recipient with Multiple

```typescript
import { useConfigureSplits, useProject } from 'levr-sdk/client'

function SplitFees() {
  const { data: project } = useProject()
  const { mutate } = useConfigureSplits()

  const currentRecipient = project?.feeReceivers?.[0]?.recipient

  const splitIntoThree = () => {
    mutate({
      clankerToken: project!.token.address,
      rewardIndex: 0,
      splits: [
        { receiver: '0xTeam...', percentage: 50 },
        { receiver: '0xMarketing...', percentage: 30 },
        { receiver: '0xDev...', percentage: 20 },
      ],
    })
  }

  return (
    <div>
      <p>Current Recipient: {currentRecipient}</p>
      <button onClick={splitIntoThree}>Split Fees</button>
    </div>
  )
}
```

## Notes

- Only the fee receiver admin can configure splits
- Configuration is per-token (each token has its own splits)
- Once configured, fees are automatically split on distribution
- You can reconfigure splits at any time
- Splitter contract handles the distribution logic
- Pending fees in the splitter are shown in `project.feeSplitter.pendingFees`
- When splitter is active, `project.stakingStats.outstandingRewards` reflects fees in the splitter

## Related

- [useFeeReceivers](./use-fee-receivers.md) - View current fee receivers
- [useProject](../query/use-project.md) - Access fee splitter data
