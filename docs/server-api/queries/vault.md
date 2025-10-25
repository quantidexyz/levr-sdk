# Vault Functions

Server-side functions for querying and managing vault allocations.

## fetchVaultData()

Fetch vault allocation data for a token.

### Usage

```typescript
import { fetchVaultData } from 'levr-sdk'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

const vaultData = await fetchVaultData(
  publicClient,
  '0x...', // token address
  base.id // optional chainId
)

if (!vaultData) {
  console.log('No vault allocation for this token')
  return
}

console.log('Token:', vaultData.allocation.token)
console.log('Total:', vaultData.allocation.amountTotal.toString())
console.log('Claimed:', vaultData.allocation.amountClaimed.toString())
console.log('Claimable:', vaultData.claimable.toString())
console.log('Lockup Ends:', new Date(Number(vaultData.allocation.lockupEndTime) * 1000))
console.log('Vesting Ends:', new Date(Number(vaultData.allocation.vestingEndTime) * 1000))
console.log('Admin:', vaultData.allocation.admin)
```

### Parameters

- `publicClient` (required): Viem public client
- `tokenAddress` (required): Token address to query
- `chainId` (optional): Chain ID (inferred from publicClient if not provided)

### Returns

```typescript
{
  allocation: {
    token: `0x${string}`
    amountTotal: bigint
    amountClaimed: bigint
    lockupEndTime: bigint
    vestingEndTime: bigint
    admin: `0x${string}`
  }
  claimable: bigint
} | undefined
```

Returns `undefined` if no vault allocation exists.

---

## getVaultStatus()

Compute vault status with human-readable messages based on current time.

### Usage

```typescript
import { fetchVaultData, getVaultStatus } from 'levr-sdk'

const vaultData = await fetchVaultData(publicClient, tokenAddress)

if (!vaultData) {
  console.log('No vault allocation')
  return
}

// Get current block timestamp
const block = await publicClient.getBlock({ blockTag: 'latest' })
const blockTimestamp = Number(block.timestamp)

const status = getVaultStatus(vaultData, blockTimestamp)

console.log('Status:', status.status) // 'locked', 'vesting', or 'vested'
console.log('Message:', status.statusMessage)
console.log('Description:', status.descriptionMessage)
console.log('Days Remaining:', status.daysRemaining)
console.log('Claimable:', status.claimable.toString())
```

### Parameters

- `data` (required): Vault data from `fetchVaultData()`
- `blockTimestamp` (required): Current block timestamp in seconds

### Returns

```typescript
{
  status: VaultStatus // 'locked' | 'vesting' | 'vested'
  statusMessage: string // "Tokens Locked", "Vesting in Progress", etc.
  descriptionMessage: string // Detailed explanation
  daysRemaining: number // Days until next milestone
  claimable: bigint // Amount claimable now
  total: bigint // Total allocation
  claimed: bigint // Already claimed
  lockupEndTime: bigint // When lockup ends (seconds)
  vestingEndTime: bigint // When vesting completes (seconds)
}
```

---

## Types

### VaultStatus

```typescript
enum VaultStatus {
  LOCKED = 'locked', // Tokens locked, nothing claimable
  VESTING = 'vesting', // Linear vesting in progress
  VESTED = 'vested', // Fully vested, all claimable
}
```

### VaultAllocation

```typescript
{
  token: `0x${string}` // Token address
  amountTotal: bigint // Total vault allocation
  amountClaimed: bigint // Amount already claimed
  lockupEndTime: bigint // Lockup end timestamp (seconds)
  vestingEndTime: bigint // Vesting end timestamp (seconds)
  admin: `0x${string}` // Vault admin address
}
```

### VaultStatusData

Complete vault status with computed fields (returned by `getVaultStatus()`).

---

## Complete Example

```typescript
import { fetchVaultData, getVaultStatus, VaultStatus } from 'levr-sdk'

async function checkVaultStatus(tokenAddress: `0x${string}`) {
  const vaultData = await fetchVaultData(publicClient, tokenAddress)

  if (!vaultData) {
    return { canClaim: false, message: 'No vault allocation' }
  }

  const block = await publicClient.getBlock({ blockTag: 'latest' })
  const status = getVaultStatus(vaultData, Number(block.timestamp))

  switch (status.status) {
    case VaultStatus.LOCKED:
      return {
        canClaim: false,
        message: `Tokens locked for ${status.daysRemaining} more days`,
      }

    case VaultStatus.VESTING:
      return {
        canClaim: status.claimable > 0n,
        message: `${status.claimable} tokens claimable (${status.daysRemaining} days until fully vested)`,
      }

    case VaultStatus.VESTED:
      return {
        canClaim: status.claimable > 0n,
        message:
          status.claimable > 0n
            ? `${status.claimable} tokens ready to claim`
            : 'All tokens claimed',
      }
  }
}
```

## Notes

- Vault contract address retrieved via `GET_VAULT_ADDRESS(chainId)`
- Uses multicall for efficient data fetching
- Claimable amount calculated on-chain based on vesting schedule
- Linear vesting between lockupEndTime and vestingEndTime
- Admin can update allocation admin via `editAllocationAdmin()`
- Claiming transfers tokens directly to vault admin

## Related

- [useVault](../../../client-hooks/query/use-vault.md) - React hook for vault status
- [useVaultClaim](../../../client-hooks/mutation/use-vault-claim.md) - React hook to claim vaulted tokens
- [Constants](../utilities/constants.md) - `GET_VAULT_ADDRESS()` function
