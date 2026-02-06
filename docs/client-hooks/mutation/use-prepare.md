# usePrepare

Prepare treasury and staking contracts for a Levr deployment. This is the first step in the deployment flow and can be called standalone.

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
    onError: (error) => {
      console.error('Preparation failed:', error)
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

```typescript
type UsePrepareParams = {
  onSuccess?: (params: {
    hash: `0x${string}`
    treasury: `0x${string}` | undefined
    staking: `0x${string}` | undefined
  }) => void
  onError?: (error: unknown) => void
}
```

- `onSuccess`: Callback with transaction hash and created treasury/staking addresses
- `onError`: Callback on preparation error

## Returns

- `mutate()`: Prepare mutation (no parameters)
- `isPending`: Loading state
- `data`: Preparation result `{ hash, treasury, staking }`
- `error`: Error if preparation failed

## What It Does

Calls `prepareForDeployment()` on the LevrFactory contract, which:

1. Creates a new treasury contract for the deployer
2. Creates a new staking contract for the deployer
3. Emits a `PreparationComplete` event with the created addresses

## When to Use

In most cases, you don't need to call `usePrepare` directly — both `useDeploy` and `useRegister` call `prepareForDeployment()` as part of their atomic multicall.

Use `usePrepare` standalone only if you need to separate the preparation step from the rest of the deployment flow (e.g., for a multi-step UI wizard).

## Notes

- Requires connected wallet
- Factory address is derived automatically from the connected chain
- Treasury and staking addresses are decoded from the transaction receipt

## Related

- [useDeploy](./use-deploy.md) - Full deploy + register flow (includes preparation)
- [useRegister](./use-register.md) - Register existing token (includes preparation)
- [deployV4()](../../server-api/deployment/deploy-v4.md) - Server-side deployment
