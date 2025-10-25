# useDeploy

Deploy a Clanker token and register it with Levr factory in one transaction.

## Usage

```typescript
import { useDeploy } from 'levr-sdk/client'
import type { LevrClankerDeploymentSchemaType } from 'levr-sdk'

function DeployInterface() {
  const { mutate: deploy, isPending } = useDeploy({
    ipfsJsonUploadUrl: '/api/ipfs-json', // Optional: for storing merkle tree
    onSuccess: ({ receipt, address, merkleTreeCID }) => {
      console.log('Deployed:', address)
      console.log('Transaction:', receipt.transactionHash)
      if (merkleTreeCID) {
        console.log('Merkle Tree CID:', merkleTreeCID)
      }
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

- `ipfsJsonUploadUrl` (optional): Full URL to /api/ipfs-json endpoint for storing merkle tree (required for airdrop retrieval later)
- `onSuccess`: Callback with receipt, deployed token address, and optional merkle tree CID
- `onError`: Callback on deployment error

## Returns

- `mutate`: Deploy mutation function
- `isPending`: Loading state
- `data`: Deployment result `{ receipt, address, merkleTreeCID? }`
- `error`: Error if deployment failed

## Notes

- Requires connected wallet and Clanker SDK instance
- Automatically calls `prepareForDeployment()`, deploys token, and registers with Levr
- Uses `executeMulticall` on LevrForwarder for atomic execution
- Returns deployed token address (computed deterministically with vanity enabled)
- If `ipfsJsonUploadUrl` provided and airdrop exists, merkle tree is stored to IPFS
- Merkle tree CID returned in `onSuccess` callback for later retrieval
- IPFS storage enables multi-recipient airdrop proof generation via `getAirdropStatus()`

## IPFS Integration

When deploying with airdrops, provide `ipfsJsonUploadUrl` to enable later retrieval:

```typescript
const { mutate: deploy } = useDeploy({
  ipfsJsonUploadUrl: '/api/ipfs-json',
  onSuccess: ({ address, merkleTreeCID }) => {
    console.log('Token deployed:', address)
    console.log('Merkle tree stored at:', merkleTreeCID)
    // Now airdrop can be queried via getAirdropStatus() with ipfsSearchUrl
  },
})
```
