# useVaultClaim

Claim vaulted tokens using the Clanker SDK.

## Usage

```typescript
import { useVaultClaim, useVault } from 'levr-sdk/client'

function VaultClaimButton({ tokenAddress }: { tokenAddress: `0x${string}` }) {
  const { data: vault } = useVault(tokenAddress)
  const { mutate: claimVault, isPending } = useVaultClaim()

  const handleClaim = () => {
    claimVault(tokenAddress)
  }

  const canClaim = vault && vault.claimable > 0n

  return (
    <div>
      <p>Claimable: {vault?.claimable.toString()}</p>
      <button
        onClick={handleClaim}
        disabled={isPending || !canClaim}
      >
        {isPending ? 'Claiming...' : 'Claim Vaulted Tokens'}
      </button>
    </div>
  )
}
```

## Parameters (passed to mutate)

- `token` (required): Token address to claim from vault

## Returns

- `mutate`: Mutation function to trigger claim
- `mutateAsync`: Async mutation function
- `isPending`: Loading state
- `data`: Transaction receipt
- `error`: Error if claim failed

## Behavior

1. Calls `clanker.claimVaultedTokens({ token })` internally
2. Waits for transaction receipt
3. Automatically invalidates vault queries on success
4. Throws error if transaction reverts

## Notes

- Requires Clanker SDK to be initialized (provided by LevrProvider)
- Only works if vault allocation exists for the token
- Claims all available vested tokens
- Cannot claim during lockup period
- During vesting, claims linearly vested portion
- After vesting ends, claims all remaining tokens
- Automatically refetches vault data after successful claim

## Error Handling

```typescript
import { useVaultClaim } from 'levr-sdk/client'

function VaultClaimWithError() {
  const { mutate, error } = useVaultClaim()

  return (
    <div>
      <button onClick={() => mutate('0x...')}>Claim</button>
      {error && <p className="text-red-500">Error: {error.message}</p>}
    </div>
  )
}
```

## Related

- [useVault](../query/use-vault.md) - Query vault status
- [fetchVaultData](../../server-api/queries/vault.md) - Server-side vault query
