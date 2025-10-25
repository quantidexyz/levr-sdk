# useVault

Query vault allocation status for a token with computed vesting information.

## Usage

```typescript
import { useVault } from 'levr-sdk/client'

function VaultStatus({ tokenAddress }: { tokenAddress: `0x${string}` }) {
  const { data: vault, isLoading } = useVault(tokenAddress)

  if (isLoading) return <div>Loading vault...</div>
  if (!vault) return <div>No vault allocation found</div>

  return (
    <div>
      <h2>Vault Status</h2>
      <p>Status: {vault.statusMessage}</p>
      <p>{vault.descriptionMessage}</p>

      {vault.daysRemaining > 0 && (
        <p>Days Remaining: {vault.daysRemaining}</p>
      )}

      <h3>Allocation</h3>
      <p>Total: {vault.total.toString()}</p>
      <p>Claimed: {vault.claimed.toString()}</p>
      <p>Claimable: {vault.claimable.toString()}</p>

      <h3>Timeline</h3>
      <p>Lockup Ends: {new Date(Number(vault.lockupEndTime) * 1000).toLocaleDateString()}</p>
      <p>Vesting Ends: {new Date(Number(vault.vestingEndTime) * 1000).toLocaleDateString()}</p>
    </div>
  )
}
```

## Parameters

- `token` (required): Token address to query vault for (or undefined)
- `chainId` (optional): Chain ID (defaults to current chain from publicClient)

## Data Structure

```typescript
{
  status: VaultStatus // 'locked' | 'vesting' | 'vested'
  statusMessage: string // e.g., "Tokens Locked", "Vesting in Progress"
  descriptionMessage: string // Detailed explanation
  daysRemaining: number // Days until next milestone
  claimable: bigint // Amount available to claim now
  total: bigint // Total vault allocation
  claimed: bigint // Amount already claimed
  lockupEndTime: bigint // Timestamp when lockup ends
  vestingEndTime: bigint // Timestamp when vesting completes
} | null
```

## Vault Status Enum

```typescript
enum VaultStatus {
  LOCKED = 'locked', // Still in lockup period
  VESTING = 'vesting', // Lockup ended, vesting in progress
  VESTED = 'vested', // Fully vested, all tokens claimable
}
```

## Returns

- `data`: Vault status data or null
- `isLoading`: Loading state
- `error`: Error if query failed
- `refetch`: Manual refetch function

## Notes

- Refetches every 30 seconds automatically
- Returns null if no vault allocation exists for the token
- Status and messages computed based on current block timestamp
- `daysRemaining` shows time until lockup ends or vesting completes
- Uses Clanker Vault contract to fetch allocation data
- Claimable amount increases linearly during vesting period

## Related

- [useVaultClaim](../mutation/use-vault-claim.md) - Claim vaulted tokens
- [fetchVaultData](../../server-api/queries/vault.md) - Server-side vault query
