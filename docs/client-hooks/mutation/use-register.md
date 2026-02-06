# useRegister

Register an existing Clanker token with the Levr factory. This creates all the governance infrastructure (treasury, governor, staking, staked token) for a token that was deployed outside of Levr.

## Usage

```typescript
import { useRegister } from 'levr-sdk/client'

function RegisterButton({ clankerToken }: { clankerToken: `0x${string}` }) {
  const { mutate: register, isPending } = useRegister({
    onSuccess: ({ hash, project }) => {
      console.log('Registered!')
      console.log('Transaction:', hash)
      if (project) {
        console.log('Treasury:', project.treasury)
        console.log('Governor:', project.governor)
        console.log('Staking:', project.staking)
        console.log('Staked Token:', project.stakedToken)
      }
    },
    onError: (error) => {
      console.error('Registration failed:', error)
    },
  })

  return (
    <button onClick={() => register({ clankerToken })} disabled={isPending}>
      {isPending ? 'Registering...' : 'Register Token'}
    </button>
  )
}
```

## Options

```typescript
type UseRegisterParams = {
  onSuccess?: (params: RegisterResult) => void
  onError?: (error: unknown) => void
}
```

- `onSuccess`: Callback with transaction hash and created project contract addresses
- `onError`: Callback on registration error

## Parameters (passed to mutate)

```typescript
{
  clankerToken: `0x${string}`
}
```

- `clankerToken` (required): Address of the Clanker token to register with Levr

## Returns

- `mutate(params)`: Register mutation
- `isPending`: Loading state
- `data`: Registration result
- `error`: Error if registration failed

### RegisterResult

```typescript
type RegisterResult = {
  hash: `0x${string}`
  project:
    | {
        treasury: `0x${string}`
        governor: `0x${string}`
        staking: `0x${string}`
        stakedToken: `0x${string}`
      }
    | undefined
}
```

## Registration Flow

The hook executes two steps atomically via `executeMulticall` on the trusted forwarder:

1. **`prepareForDeployment()`** — Creates treasury and staking contracts on the factory
2. **`register(clankerToken)`** — Registers the token, creating governance and staked token contracts

The created contract addresses are decoded from the `Registered` event emitted by the factory.

## When to Use

Use `useRegister` when you need to add Levr governance to a token that already exists on-chain:

- Tokens deployed manually through Clanker
- Tokens deployed before Levr integration
- Tokens deployed via other deployment tools

For deploying **new** tokens with Levr registration in one step, use [`useDeploy`](./use-deploy.md) instead.

## Notes

- Requires connected wallet
- Factory address is derived automatically from the connected chain
- The trusted forwarder is read from the factory contract
- Both steps are atomic — if either fails, the entire transaction reverts

## Related

- [useDeploy](./use-deploy.md) - Deploy and register in one step (for new tokens)
- [usePrepare](./use-prepare.md) - Standalone preparation step
- [deployV4()](../../server-api/deployment/deploy-v4.md) - Server-side deployment
