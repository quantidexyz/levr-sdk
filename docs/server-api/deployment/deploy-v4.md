# deployV4()

Deploy a new Clanker token and register it with the Levr factory in a single atomic transaction.

## Usage

```typescript
import { deployV4 } from 'levr-sdk'
import { Clanker } from 'clanker-sdk/v4'
import { createPublicClient, createWalletClient, http } from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

const walletClient = createWalletClient({
  chain: base,
  transport: http(),
  account: privateKeyToAccount('0x...'),
})

const clanker = new Clanker({
  wallet: walletClient,
  publicClient,
})

const result = await deployV4({
  clanker,
  ipfsJsonUploadUrl: 'https://your-app.com/api/ipfs-json', // Optional
  c: {
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
  },
})

console.log('Deployed at:', result.address)
console.log('Transaction:', result.receipt.transactionHash)
if (result.merkleTreeCID) {
  console.log('Merkle tree CID:', result.merkleTreeCID)
}
```

## Parameters

```typescript
type DeployV4Params = {
  c: LevrClankerDeploymentSchemaType // Deployment configuration
  clanker: Clanker | undefined | null // Clanker SDK instance
  ipfsJsonUploadUrl?: string // URL for storing merkle tree to IPFS
}
```

- `c` (required): Deployment configuration (see [Deployment Schema](#deployment-schema) below)
- `clanker` (required): Initialized Clanker SDK instance with wallet and public client
- `ipfsJsonUploadUrl` (optional): Full URL to IPFS JSON upload endpoint. Required if the deployment includes airdrops — the merkle tree is stored for later proof generation via `getAirdropStatus()`

## Returns

```typescript
type DeployV4ReturnType = {
  receipt: TransactionReceipt // Viem transaction receipt
  address: `0x${string}` // Deployed token address
  merkleTreeCID?: string // IPFS CID of merkle tree (if airdrop + IPFS URL provided)
}
```

## Deployment Flow

The function executes these steps atomically via `executeMulticall` on the trusted forwarder:

1. **`prepareForDeployment()`** — Creates treasury and staking contracts on the factory
2. **`executeTransaction()`** — Deploys the Clanker token via the Clanker factory (includes dev buy ETH if configured)
3. **`register()`** — Registers the token with the Levr factory, creating governance and staked token contracts

After the multicall:

4. If `adminOverwrite` is set, transfers token admin in a separate transaction
5. If `ipfsJsonUploadUrl` is provided and an airdrop exists, stores the merkle tree to IPFS

## Deployment Schema

The `c` parameter uses the `LevrClankerDeploymentSchemaType`:

```typescript
import type { LevrClankerDeploymentSchemaType } from 'levr-sdk'

const config: LevrClankerDeploymentSchemaType = {
  // Required
  name: string                    // Token name
  symbol: string                  // Token symbol
  image: string                   // Token image URL (IPFS or HTTP)
  pairedToken: string             // Paired token: 'ETH', 'USDC', 'BNB', etc.
  treasuryFunding: string         // '10%' | '20%' | '30%' | ... | '90%'
  stakingReward: string           // '100%' | '90%' | '80%' | '70%' | '60%' | '50%' | '40%'
  fees: {
    type: 'static'
    feeTier: string               // '1%' | '2%' | '3%'
  } | {
    type: 'dynamic 3%'
  }

  // Optional
  metadata?: {
    description?: string
    telegramLink?: string
    websiteLink?: string
    xLink?: string
    farcasterLink?: string
  }
  devBuy?: string                 // e.g., '0.1 ETH', '0.5 BNB'
  airdrop?: Array<{
    percentage: number            // % of total supply (0-100)
    account: `0x${string}`        // Recipient address
  }>
  vault?: {
    lockupPeriod: string          // '30 days' | '90 days' | '180 days'
    vestingPeriod: string         // 'instant' | '30 days' | '180 days'
    percentage: string            // '5%' | '10%' | '15%' | '20%' | '25%' | '30%'
  }
  rewards?: Array<{
    admin: `0x${string}`          // Admin who can manage this recipient
    recipient: `0x${string}`      // Fee recipient address
    percentage: number            // % of total rewards (0-100)
    token: 'Both' | 'Paired' | 'Clanker'
  }>
  adminOverwrite?: `0x${string}`  // Transfer token admin after deployment
}
```

### Validation Rules

- Total allocation (airdrop + vault + treasury) must be **≤ 90%** (minimum 10% reserved for liquidity)
- Total rewards (stakingReward + custom reward recipients) must equal **100%**
- A 2% Levr Protocol fee is automatically deducted from staking rewards

### Supply Allocation Helper

```typescript
import { calculateAllocationBreakdown } from 'levr-sdk'

const breakdown = calculateAllocationBreakdown({
  treasuryFunding: '30%',
  airdrop: [{ percentage: 10, account: '0x...' }],
  vault: { lockupPeriod: '90 days', vestingPeriod: '30 days', percentage: '10%' },
})

// breakdown.treasuryPercentage = 30
// breakdown.airdropPercentage = 10
// breakdown.vaultPercentage = 10
// breakdown.totalAllocatedPercentage = 50
// breakdown.liquidityPercentage = 50
```

## Examples

### Minimal Deployment

```typescript
const result = await deployV4({
  clanker,
  c: {
    name: 'Simple Token',
    symbol: 'SMPL',
    image: 'https://example.com/icon.png',
    pairedToken: 'ETH',
    treasuryFunding: '30%',
    stakingReward: '100%',
    fees: { type: 'static', feeTier: '3%' },
  },
})
```

### Full Deployment with Airdrop and Vault

```typescript
const result = await deployV4({
  clanker,
  ipfsJsonUploadUrl: 'https://your-app.com/api/ipfs-json',
  c: {
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
      telegramLink: 'https://t.me/example',
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
    rewards: [
      {
        admin: '0xTeam...',
        recipient: '0xTeam...',
        percentage: 20,
        token: 'Both',
      },
    ],
    adminOverwrite: '0xNewAdmin...',
  },
})
```

## Notes

- Requires Clanker SDK v4 with wallet and public client initialized
- Token address is computed deterministically via CREATE2 (vanity enabled)
- The trusted forwarder ensures atomic execution — all three steps succeed or all revert
- Dev buy ETH is forwarded through the trusted forwarder to the Clanker factory
- Admin transfer (if `adminOverwrite` is set) is a separate transaction and may fail independently

## Related

- [buildCalldatasV4()](./build-calldatas-v4.md) - Lower-level calldata builder
- [useDeploy](../../client-hooks/mutation/use-deploy.md) - React hook for deployment
- [useRegister](../../client-hooks/mutation/use-register.md) - Register existing tokens
- [getFactoryConfig()](../queries/factory.md) - Factory governance parameters
