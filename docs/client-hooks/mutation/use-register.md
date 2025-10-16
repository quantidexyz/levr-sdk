# useRegister

Register an existing Clanker token with Levr factory.

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
  })

  return (
    <button onClick={() => register({ clankerToken })} disabled={isPending}>
      {isPending ? 'Registering...' : 'Register Token'}
    </button>
  )
}
```

## Options

- `onSuccess`: Callback with hash and project contract addresses
- `onError`: Callback on registration error

## Parameters (passed to mutate)

- `clankerToken` (required): Clanker token address to register

## Returns

- `mutate`: Register mutation function
- `isPending`: Loading state
- `data`: Registration result (hash, project)
- `error`: Error if registration failed

## Notes

- Calls `prepareForDeployment()` + `register()` in one multicall
- Creates treasury, governor, staking, and staked token contracts
- Use for tokens deployed outside of Levr (e.g., manually deployed Clanker tokens)
- For standard deployment, use `useDeploy()` instead
