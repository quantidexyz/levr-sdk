# usePrepare

Prepare treasury and staking contracts for deployment.

## Usage

```typescript
import { usePrepare } from 'levr-sdk/client'

function PrepareButton() {
  const { mutate: prepare, isPending } = usePrepare({
    onSuccess: ({ hash, treasury, staking }) => {
      console.log('Prepared!')
      console.log('Treasury:', treasury)
      console.log('Staking:', staking)
      console.log('Transaction:', hash)
    },
  })

  return (
    <button onClick={() => prepare()} disabled={isPending}>
      {isPending ? 'Preparing...' : 'Prepare Deployment'}
    </button>
  )
}
```

## Options

- `onSuccess`: Callback with hash, treasury, and staking addresses
- `onError`: Callback on preparation error

## Returns

- `mutate`: Prepare mutation function
- `isPending`: Loading state
- `data`: Preparation result (hash, treasury, staking)
- `error`: Error if preparation failed

## Notes

- Calls `prepareForDeployment()` on LevrFactory
- Creates treasury and staking contracts
- Required before token deployment
- Part of the deployment flow (prepare → deploy → register)
