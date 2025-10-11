# useFeeReceivers

Manage fee receiver addresses.

## Usage

```typescript
import { useFeeReceivers } from 'levr-sdk/client'

function FeeReceiverManager() {
  const { query, mutate } = useFeeReceivers({
    onSuccess: (hash) => {
      console.log('Updated fee receiver:', hash)
    },
  })

  const handleUpdate = () => {
    mutate.mutate({
      clankerToken: '0x...',
      rewardIndex: 0,
      newRecipient: '0x...',
    })
  }

  return (
    <div>
      <h2>Fee Receivers</h2>
      {query.data?.map((receiver, i) => (
        <div key={i}>
          <p>Index {i}: {receiver}</p>
        </div>
      ))}
      <button onClick={handleUpdate}>Update Receiver</button>
    </div>
  )
}
```
