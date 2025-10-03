# QuoterV4 Bug with ALL Clanker v4 Pools

## Issue Summary

The Uniswap v4 QuoterV4 contract (`0x0d5e0f971ed27fbff6c2837bf31316121532048d`) is incompatible with **ALL Clanker v4 pools**. It reports `PoolNotInitialized` (error signature `0x6190b2b0`) even for correctly initialized pools, regardless of whether they use static or dynamic fee configurations.

**Why**: All Clanker v4 hooks (both static and dynamic) use the dynamic fee flag (`0x800000`) to indicate hook-controlled fees. The QuoterV4 contract fails on any pool with this flag set.

## What We Verified

### ✅ Working Correctly:

1. **Pool Initialization** - PoolManager emits `Initialize` event with correct parameters
2. **LP Locker Registration** - LP Locker correctly stores and returns pool key
3. **Pool Key Accuracy** - LP Locker data perfectly matches the initialized pool
4. **Liquidity** - Pool has liquidity (verified by user: 1 ETH)

### ❌ The Bug:

**QuoterV4 cannot quote on ANY Clanker v4 pools** (static or dynamic fees), even though:

- The pool exists
- The pool is initialized
- The pool key is correct
- The pool has liquidity

## Test Evidence

See `/packages/levr/test/e2e-deploy-and-swap.test.ts` for complete reproduction.

The test shows:

```
✅ LP Locker pool key matches initialized pool

Pool Initialization Event:
  Currency0: 0x4200000000000000000000000000000000000006 (WETH)
  Currency1: 0xCdb5f6F9b13EC062D02013f8e31317a74a8E6b07 (Token)
  Fee: 8388608 (0x800000) ← Dynamic fee flag
  Tick Spacing: 200
  Hooks: 0xb429d62f8f3bFFb98CdB9569533eA23bF0Ba28CC ← Clanker dynamic fee hook

❌ Quoter FAILED with PoolNotInitialized
```

## Affected Configurations

This bug affects **ALL Clanker v4 tokens** regardless of fee configuration:

- ✅ Static fee pools (`FEE_CONFIGS.StaticBasic`, custom static fees)
- ✅ Dynamic fee pools (`FEE_CONFIGS.DynamicBasic`, `FEE_CONFIGS.Dynamic3`)
- Hook addresses (Base mainnet):
  - `0xb429d62f8f3bFFb98CdB9569533eA23bF0Ba28CC` (Static Fee Hook V2)
  - `0xd60D6B218116cFd801E28F78d011a203D2b068Cc` (Dynamic Fee Hook V2)

**Root Cause**: All Clanker v4 hooks use the dynamic fee flag (`0x800000`) to indicate hook-controlled fees, even for static fee pools. The QuoterV4 contract cannot handle this architecture.

## Error Handling Improvements

We've improved error handling in `use-quote.ts` to:

1. Properly catch the `0x6190b2b0` error signature
2. Log detailed pool key information for debugging
3. Provide actionable error messages

## Workarounds

### Option 1: Skip Quoter, Use Direct Pricing (Required for Now)

**Note**: Switching between static and dynamic fees **does NOT help** - both use the same fee flag architecture.

Implement custom pricing logic that:

- Reads pool state directly from PoolManager
- Calculates price from sqrtPriceX96
- Estimates output based on current tick and liquidity

### Option 2: Wait for Fix (Recommended)

Contact Clanker/Uniswap teams about updating the Quoter contract to support dynamic fee hooks.

## Next Steps

1. **Report to Clanker team** - This is a Quoter contract issue that affects **ALL** Clanker v4 tokens
2. **Implement alternative pricing** - Build custom quoting logic that doesn't rely on QuoterV4
3. **Monitor for Quoter updates** - Watch for new Quoter deployments that fix this issue
4. **Consider using Clanker v3** - If Quoter support is critical, v3 may work differently

## Technical Details

- **Error Signature**: `0x6190b2b0` (PoolNotInitialized)
- **Quoter Contract**: `0x0d5e0f971ed27fbff6c2837bf31316121532048d`
- **PoolManager**: `0x498581fF718922c3f8e6A244956aF099B2652b2b`
- **Affected Hooks**:
  - `0xb429d62f8f3bFFb98CdB9569533eA23bF0Ba28CC` (Static Fee Hook V2)
  - `0xd60D6B218116cFd801E28F78d011a203D2b068Cc` (Dynamic Fee Hook V2)
- **Network**: Base (Chain ID: 8453)

## Related Files

- `packages/levr/src/client/hook/use-quote.ts` - Quote hook with improved error handling
- `packages/levr/test/e2e-deploy-and-swap.test.ts` - Full reproduction test
- `packages/levr/src/client/hook/use-pool-info.ts` - LP Locker integration

---

_Last Updated: 2025-10-03_
_Test Run: All pools initialize correctly, Quoter consistently fails with PoolNotInitialized_
