# useDeploy

Deploy a new Clanker token and register it with the Levr factory in one atomic transaction.

## Usage

```typescript
import { useDeploy } from 'levr-sdk/client'
import type { LevrClankerDeploymentSchemaType } from 'levr-sdk'

function DeployInterface() {
  const { mutate: deploy, isPending } = useDeploy({
    ipfsJsonUploadUrl: '/api/ipfs-json',
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
      pairedToken: 'ETH',
      treasuryFunding: '30%',
      stakingReward: '100%',
      fees: {
        type: 'static',
        feeTier: '3%',
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

```typescript
type UseDeployParams = {
  ipfsJsonUploadUrl?: string
  onSuccess?: (params: {
    receipt: TransactionReceipt
    address: `0x${string}`
    merkleTreeCID?: string
  }) => void
  onError?: (error: unknown) => void
}
```

- `ipfsJsonUploadUrl` (optional): Full URL to IPFS JSON upload endpoint. Required if deploying with airdrops — stores the merkle tree for later proof generation via `useAirdropStatus()`
- `onSuccess`: Callback with transaction receipt, deployed token address, and optional merkle tree CID
- `onError`: Callback on deployment error

## Returns

- `mutate(config)`: Deploy mutation — accepts a `LevrClankerDeploymentSchemaType`
- `isPending`: Loading state
- `data`: Deployment result `{ receipt, address, merkleTreeCID? }`
- `error`: Error if deployment failed

## Deployment Schema

The `mutate` function accepts a `LevrClankerDeploymentSchemaType` configuration:

```typescript
import type { LevrClankerDeploymentSchemaType } from 'levr-sdk'

const config: LevrClankerDeploymentSchemaType = {
  // Required
  name: 'My Token', // Token name
  symbol: 'TKN', // Token symbol
  image: 'ipfs://...', // Token image (IPFS or HTTP URL)
  pairedToken: 'ETH', // 'ETH', 'USDC', 'BNB', etc.
  treasuryFunding: '30%', // '10%' through '90%'
  stakingReward: '100%', // '40%' through '100%' (in 10% steps)
  fees: {
    type: 'static', // 'static' or 'dynamic 3%'
    feeTier: '3%', // '1%' | '2%' | '3%' (only for static)
  },

  // Optional
  metadata: {
    description: '...',
    telegramLink: 'https://t.me/...',
    websiteLink: 'https://...',
    xLink: 'https://x.com/...',
    farcasterLink: 'https://...',
  },
  devBuy: '0.1 ETH', // Initial dev buy amount
  airdrop: [
    // Custom airdrops (% of total supply)
    { percentage: 5, account: '0x...' },
  ],
  vault: {
    // Token vesting vault
    lockupPeriod: '90 days', // '30 days' | '90 days' | '180 days'
    vestingPeriod: '180 days', // 'instant' | '30 days' | '180 days'
    percentage: '10%', // '5%' through '30%' (in 5% steps)
  },
  rewards: [
    // Custom fee reward recipients
    {
      admin: '0x...',
      recipient: '0x...',
      percentage: 20, // Must sum to 100% with stakingReward
      token: 'Both', // 'Both' | 'Paired' | 'Clanker'
    },
  ],
  adminOverwrite: '0x...', // Transfer token admin after deploy
}
```

::: tip Validation Rules

- Total allocation (airdrop + vault + treasury) must be **≤ 90%** (minimum 10% for liquidity)
- Total rewards (stakingReward + custom recipients) must equal **100%**
- A 2% Levr Protocol fee is automatically deducted from staking rewards
  :::

## Deployment Flow

Internally, `useDeploy` calls `deployV4()` which executes these steps atomically:

1. **`prepareForDeployment()`** — Creates treasury and staking contracts
2. **Deploy token** — Deploys via Clanker factory through the trusted forwarder
3. **`register()`** — Registers with Levr factory (creates governance + staked token)
4. _(Optional)_ Transfers token admin if `adminOverwrite` is set
5. _(Optional)_ Stores merkle tree to IPFS if `ipfsJsonUploadUrl` is provided

## Examples

### Minimal Deployment

```typescript
const { mutate: deploy } = useDeploy({
  onSuccess: ({ address }) => {
    router.push(`/token/${address}`)
  },
})

deploy({
  name: 'Simple Token',
  symbol: 'SMPL',
  image: 'https://example.com/icon.png',
  pairedToken: 'ETH',
  treasuryFunding: '30%',
  stakingReward: '100%',
  fees: { type: 'static', feeTier: '3%' },
})
```

### Full Deployment with Airdrop

```typescript
const { mutate: deploy } = useDeploy({
  ipfsJsonUploadUrl: '/api/ipfs-json',
  onSuccess: ({ address, merkleTreeCID }) => {
    console.log('Token:', address)
    console.log('Merkle CID:', merkleTreeCID)
  },
})

deploy({
  name: 'Full Token',
  symbol: 'FULL',
  image: 'ipfs://Qm...',
  pairedToken: 'ETH',
  treasuryFunding: '30%',
  stakingReward: '80%',
  fees: { type: 'dynamic 3%' },
  devBuy: '0.1 ETH',
  metadata: {
    description: 'A fully configured token',
    websiteLink: 'https://example.com',
  },
  airdrop: [
    { percentage: 5, account: '0xTeam...' },
    { percentage: 5, account: '0xMarketing...' },
  ],
  vault: {
    lockupPeriod: '90 days',
    vestingPeriod: '180 days',
    percentage: '10%',
  },
  rewards: [{ admin: '0xTeam...', recipient: '0xTeam...', percentage: 20, token: 'Both' }],
})
```

## Notes

- Requires connected wallet and Clanker SDK instance (initialized automatically via `useClanker()`)
- Uses `executeMulticall` on LevrForwarder for atomic execution — all steps succeed or all revert
- Token address is computed deterministically via CREATE2
- IPFS storage enables multi-recipient airdrop proof generation via `useAirdropStatus()`

## Related

- [deployV4()](../../server-api/deployment/deploy-v4.md) - Server-side deployment function
- [useRegister](./use-register.md) - Register existing tokens (not deployed via Levr)
- [usePrepare](./use-prepare.md) - Standalone preparation step
- [useClanker](../utility/use-clanker.md) - Clanker SDK instance
