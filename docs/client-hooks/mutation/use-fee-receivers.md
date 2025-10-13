# useFeeReceivers

Manage fee receiver addresses. Data comes from project context.

## Usage

```typescript
import { useFeeReceivers } from 'levr-sdk/client'

function FeeReceiverManager() {
  const { data, isLoading, mutate } = useFeeReceivers({
    onSuccess: (hash) => {
      console.log('Updated fee receiver:', hash)
    },
  })

  const handleUpdate = (index: number, newRecipient: `0x${string}`) => {
    mutate.mutate({
      clankerToken: project.data!.token.address, // From context
      rewardIndex: index,
      newRecipient,
    })
  }

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <h2>Fee Receivers</h2>
      {data?.map((receiver, i) => (
        <div key={i}>
          <p>Admin: {receiver.admin}</p>
          <p>Recipient: {receiver.recipient}</p>
          <p>Percentage: {receiver.percentage}%</p>
          {receiver.areYouAnAdmin && (
            <button onClick={() => handleUpdate(i, '0x...')}>
              Update Recipient
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
```

## Options

**Callback parameters (optional):**

- `onSuccess`: Callback after successful fee receiver update
- `onError`: Callback on update error

## Returned Values

- `data`: Array of fee receivers (from `project.data.feeReceivers`)
- `isLoading`: Loading state
- `error`: Error if query failed
- `mutate`: Mutation function for updating fee receivers

## Fee Receiver Structure

```typescript
{
  areYouAnAdmin: boolean // True if connected wallet is admin
  admin: `0x${string}` // Admin address who can update
  recipient: `0x${string}` // Current fee recipient
  percentage: number // Fee percentage (e.g., 50 = 50%)
}
```

## Notes

- Fee receiver data comes from `project` query (no separate query)
- `areYouAnAdmin` is automatically calculated based on connected wallet
- Only admins can update their respective fee receivers
