# buildCalldatasV4()

Low-level function that builds the encoded calldata for deploying and registering a Clanker token. Used internally by `deployV4()`, but can be called directly for custom deployment flows.

## Usage

```typescript
import { buildCalldatasV4 } from 'levr-sdk'
import { Clanker } from 'clanker-sdk/v4'
import { createPublicClient, createWalletClient, http } from 'viem'
import { base } from 'viem/chains'

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

const walletClient = createWalletClient({
  chain: base,
  transport: http(),
  account: privateKeyToAccount('0x...'),
})

const clanker = new Clanker({ wallet: walletClient, publicClient })

const result = await buildCalldatasV4({
  c: {
    name: 'My Token',
    symbol: 'TKN',
    image: 'ipfs://...',
    pairedToken: 'ETH',
    treasuryFunding: '30%',
    stakingReward: '100%',
    fees: { type: 'static', feeTier: '3%' },
  },
  clanker,
  publicClient,
  wallet: walletClient,
  factoryAddress: '0x...', // LevrFactory address
  forwarderAddress: '0x...', // LevrForwarder address
})

// Execute the multicall manually
const txHash = await walletClient.writeContract({
  address: forwarderAddress,
  abi: LevrForwarder_v1,
  functionName: 'executeMulticall',
  args: [result.callDatas],
  value: result.totalValue,
})
```

## Parameters

```typescript
type BuildCalldatasV4Params = {
  c: LevrClankerDeploymentSchemaType
  clanker: Clanker
  publicClient: PublicClient
  wallet: WalletClient
  factoryAddress: `0x${string}`
  forwarderAddress: `0x${string}`
}
```

- `c` (required): Deployment configuration (see [deployV4 schema](./deploy-v4.md#deployment-schema))
- `clanker` (required): Clanker SDK instance
- `publicClient` (required): Viem public client
- `wallet` (required): Viem wallet client with account
- `factoryAddress` (required): LevrFactory contract address
- `forwarderAddress` (required): LevrForwarder contract address

## Returns

```typescript
type BuildCalldatasV4ReturnType = {
  callDatas: CallData[] // Encoded calls for executeMulticall
  clankerTokenAddress: `0x${string}` // Deterministic token address
  totalValue: bigint // Total ETH to send (for dev buy)
  merkleTree: StandardMerkleTree<[string, string]> | null // Airdrop merkle tree
  treasury: `0x${string}` // Created treasury address
  liquidityPercentage: number // % of supply going to liquidity
}
```

### CallData Structure

Each entry in `callDatas` is a multicall operation:

```typescript
type CallData = {
  target: `0x${string}` // Contract to call
  allowFailure: boolean // false = revert entire multicall on failure
  value: bigint // ETH to send with this call
  callData: `0x${string}` // ABI-encoded function call
}
```

The array contains 3 entries in order:

| Index | Target    | Function                 | Value      | Purpose                             |
| ----- | --------- | ------------------------ | ---------- | ----------------------------------- |
| 0     | Factory   | `prepareForDeployment()` | 0          | Create treasury + staking contracts |
| 1     | Forwarder | `executeTransaction()`   | devBuy ETH | Deploy Clanker token                |
| 2     | Factory   | `register()`             | 0          | Register token with Levr            |

## Notes

- Most users should use [`deployV4()`](./deploy-v4.md) instead — it handles the full flow including forwarder lookup, multicall execution, admin transfer, and IPFS storage
- The token address is computed deterministically via CREATE2 before deployment
- The factory and forwarder addresses can be obtained via `GET_FACTORY_ADDRESS(chainId)` and reading `trustedForwarder()` from the factory contract
- Returns the merkle tree if airdrops are configured, for storing to IPFS separately

## Related

- [deployV4()](./deploy-v4.md) - High-level deployment function (recommended)
- [Constants](../utilities/constants.md) - `GET_FACTORY_ADDRESS()` and other address getters
