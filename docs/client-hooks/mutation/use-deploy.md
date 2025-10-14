# useDeploy

Deploy a Clanker token and register it with Levr factory in one transaction.

## Usage

```typescript
import { useDeploy } from 'levr-sdk/client'
import type { LevrClankerDeploymentSchemaType } from 'levr-sdk'

function DeployInterface() {
  const { mutate: deploy, isPending } = useDeploy({
    onSuccess: ({ receipt, address }) => {
      console.log('Deployed:', address)
      console.log('Transaction:', receipt.transactionHash)
    },
    onError: (error) => {
      console.error('Deploy failed:', error)
    },
  })

  const handleDeploy = () => {
    const config: LevrClankerDeploymentSchemaType = {
      name: 'My Token',
      symbol: 'TKN',
      image: 'ipfs://...',
      treasuryFunding: '50%',
      fees: {
        type: 'static',
        feeTier: '3%',
      },
      devBuy: '0.1 ETH', // Optional
      metadata: {
        description: 'My awesome token',
        telegramLink: 'https://t.me/...',
        websiteLink: 'https://...',
      },
    }

    deploy(config)
  }

  return (
    <button onClick={handleDeploy} disabled={isPending}>
      {isPending ? 'Deploying...' : 'Deploy Token'}
    </button>
  )
}
```

## Options

- `onSuccess`: Callback with receipt and deployed token address
- `onError`: Callback on deployment error

## Returns

- `mutate`: Deploy mutation function
- `isPending`: Loading state
- `data`: Deployment result (receipt + address)
- `error`: Error if deployment failed

## Notes

- Requires connected wallet and Clanker SDK instance
- Automatically calls `prepareForDeployment()`, deploys token, and registers with Levr
- Uses `executeMulticall` on LevrForwarder for atomic execution
- Returns deployed token address (computed deterministically with vanity enabled)

