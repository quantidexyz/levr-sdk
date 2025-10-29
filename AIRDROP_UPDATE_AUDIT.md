# Airdrop Merkle Root Update - Security Audit

## Executive Summary

This document provides a comprehensive audit of the planned airdrop merkle root update to replace a compromised treasury address with a safe multisig address.

**Status**: ✅ **READY FOR EXECUTION** (with checksummed addresses)

**Date**: October 28, 2025

---

## 1. Background

### Problem

The original airdrop merkle root includes a compromised treasury address that needs to be replaced with a secure multisig wallet.

### Solution

Update the airdrop contract's merkle root using the built-in `updateMerkleRoot` function to replace the compromised treasury with a safe multisig while preserving all other recipients.

---

## 2. Contract Details

### Addresses

| Component            | Address                                      | Status      |
| -------------------- | -------------------------------------------- | ----------- |
| **Chain**            | Base Mainnet (8453)                          | ✅          |
| **Airdrop Contract** | `0xf652B3610D75D81871bf96DB50825d9af28391E0` | ✅ Verified |
| **Token**            | `0x08d63756ab002615B1df99380BCf37714c5b9b07` | ✅ Verified |
| **Safe Multisig**    | `0x4B7ddAc59cEeC3dE4706C460f34Bbce758a58bED` | ✅ Verified |
| **Admin**            | `0x6C02C5FCF82d2951Af85C12e8469Ab6f16c58e32` | ✅ Verified |

---

## 3. Airdrop Distribution

### Current State

- **Total Supply**: 75,000,000,000 tokens (75B)
- **Total Claimed**: 0 tokens ✅
- **Actual Balance**: 75,000,000,000 tokens ✅ (All funds intact)

### New Distribution

| Recipient         | Address                                      | Amount             | % of Total |
| ----------------- | -------------------------------------------- | ------------------ | ---------- |
| **Recipient 1**   | `0x83b4003eB22EdE3E7FC60e8A5E58325FF61601dc` | 33,000,000,000     | 44%        |
| **Recipient 2**   | `0xbC703B091045008E154237906c2Ca724Bf006aDB` | 22,000,000,000     | 29.33%     |
| **Safe Multisig** | `0x4B7ddAc59cEeC3dE4706C460f34Bbce758a58bED` | 20,000,000,000     | 26.67%     |
| **TOTAL**         |                                              | **75,000,000,000** | **100%**   |

### Amount Verification

```
Recipient 1: 33,000,000,000 tokens = 33,000,000,000,000,000,000,000,000,000 wei (33B * 10^18)
Recipient 2: 22,000,000,000 tokens = 22,000,000,000,000,000,000,000,000,000 wei (22B * 10^18)
Multisig:    20,000,000,000 tokens = 20,000,000,000,000,000,000,000,000,000 wei (20B * 10^18)
----------------------------------------------------------------------------------
TOTAL:       75,000,000,000 tokens = 75,000,000,000,000,000,000,000,000,000 wei (75B * 10^18)
```

✅ **All amounts verified correct**

---

## 4. Contract Requirements

The `updateMerkleRoot` function in ClankerAirdropV2 requires:

| Requirement               | Status | Details                      |
| ------------------------- | ------ | ---------------------------- |
| **Must be admin**         | ✅ YES | Caller matches admin address |
| **Admin has not claimed** | ✅ YES | `adminClaimed = false`       |
| **No claims occurred**    | ✅ YES | `totalClaimed = 0`           |
| **Either:**               |        |                              |
| - Merkle root is zero     | ❌ NO  | Root is not zero             |
| - OR 1 day after lockup   | ✅ YES | Update window is OPEN        |

### Timing

- **Lockup End**: October 26, 2025, 21:06:53 UTC
- **Update Window Opens**: October 27, 2025, 21:06:53 UTC (lockup + 1 day)
- **Current Time**: October 28, 2025, 08:35:25 UTC
- **Window Status**: ✅ **OPEN** (10+ hours past window opening)

---

## 5. Merkle Tree Details

### Old Merkle Root

```
0x97189e5f795fc5841609acbd3da8e2ef8a0d3af491d602df32f9200548d68f9b
```

### New Merkle Root

```
0xfeda48757fdc17ccb459a7699ae501ccb7a7b6b8dea0336e5a0879db4b168256
```

### Merkle Proofs (for claiming after update)

**Recipient 1** (`0x83b4003eB22EdE3E7FC60e8A5E58325FF61601dc`):

```json
{
  "amount": "33000000000000000000000000000",
  "proof": [
    "0xa5a430fa26749bb53edba387089bcdb4922fdd81751e761e20b118c02eef4bc5",
    "0xebe0500c2a346aca00f607561676f0fb429c46b288afa5250080de99b125e3c3"
  ]
}
```

**Recipient 2** (`0xbC703B091045008E154237906c2Ca724Bf006aDB`):

```json
{
  "amount": "22000000000000000000000000000",
  "proof": [
    "0x885651073c697a4ca4175b0643696eb7f760b434365662ede5fb20b0ffc9d074",
    "0xebe0500c2a346aca00f607561676f0fb429c46b288afa5250080de99b125e3c3"
  ]
}
```

**Safe Multisig** (`0x4B7ddAc59cEeC3dE4706C460f34Bbce758a58bED`):

```json
{
  "amount": "20000000000000000000000000000",
  "proof": ["0xd9ce70f7fd428f4452172a0bb9b9bbcb5788e42ccba96e39e16a2d8698c0e210"]
}
```

---

## 6. Security Checks

### ✅ Address Validation

- All addresses are valid Ethereum addresses
- All addresses are properly checksummed
- Safe multisig address verified on Base

### ✅ Amount Validation

- Individual amounts sum to exactly 75B tokens
- Amounts match original airdrop allocation
- No rounding errors or precision loss

### ✅ Merkle Tree Generation

- Generated using `clanker-sdk` package (same as original)
- Root is 66 characters (including 0x prefix)
- Root format is valid bytes32

### ✅ Contract Simulation

- Transaction simulation **SUCCEEDED**
- Contract will accept the update
- No revert conditions triggered

### ✅ State Verification

- Total claimed is 0 (no one has claimed yet)
- Admin has not claimed
- All 75B tokens still in contract
- Update window is open

---

## 7. Transaction Details

### Function Call

```solidity
function updateMerkleRoot(
    address token,
    bytes32 newMerkleRoot
) external
```

### Parameters

```
token: 0x08d63756ab002615B1df99380BCf37714c5b9b07
newMerkleRoot: 0xfeda48757fdc17ccb459a7699ae501ccb7a7b6b8dea0336e5a0879db4b168256
```

### Expected Gas Usage

- Simulation successful (exact gas will be determined on execution)
- No complex computations, should be low gas

---

## 8. Risks & Mitigations

### Risk 1: Irreversible Operation

**Impact**: Once executed, the merkle root cannot be changed back
**Mitigation**:

- ✅ Comprehensive pre-flight checks completed
- ✅ Simulation successful
- ✅ All data verified multiple times
- ✅ User confirmation required before execution

### Risk 2: Address Errors

**Impact**: Incorrect addresses would lose access to funds
**Mitigation**:

- ✅ All addresses checksummed
- ✅ Addresses verified on Base explorer
- ✅ Safe multisig confirmed operational

### Risk 3: Amount Errors

**Impact**: Incorrect amounts could cause claiming failures
**Mitigation**:

- ✅ Amounts verified to sum to exactly 75B
- ✅ Using same decimal precision as original (18 decimals)
- ✅ No floating point arithmetic used

---

## 9. Pre-Flight Checklist

Before executing the update, verify:

- [x] All addresses are checksummed correctly
- [x] Amounts sum to exactly 75B tokens
- [x] Update window is open (lockup + 1 day has passed)
- [x] No claims have occurred (totalClaimed = 0)
- [x] Admin has not claimed (adminClaimed = false)
- [x] Simulation succeeds
- [x] Merkle proofs have been saved for future claiming
- [x] MAINNET_PRIVATE_KEY is set correctly
- [x] NEXT_PUBLIC_DRPC_API_KEY is set
- [ ] **User has reviewed and approved the update**

---

## 10. Execution Steps

### Step 1: Final Verification

```bash
bun run script/verify-airdrop-update.ts
```

### Step 2: Execute Update (with user confirmation)

```bash
MAINNET_PRIVATE_KEY= < key > bun run script/update-airdrop-treasury.ts
```

### Step 3: Verify On-Chain

- Check transaction on BaseScan
- Verify new merkle root on contract
- Confirm event emission

### Step 4: Save Proofs

- Store merkle proofs securely
- Share proofs with recipients
- Document transaction hash

---

## 11. Post-Execution

### Immediate Actions

1. Verify transaction succeeded on BaseScan
2. Confirm merkle root updated on contract
3. Save transaction hash for records
4. Distribute merkle proofs to recipients

### Long-Term

1. Recipients can claim using new proofs
2. Monitor claiming activity
3. Ensure safe multisig can claim its allocation

---

## 12. Critical Changes Made

### Address Checksumming

**Before**:

```typescript
account: '0x83b4003eb22ede3e7fc60e8a5e58325ff61601dc'
account: '0xbc703b091045008e154237906c2ca724bf006adb'
```

**After**:

```typescript
account: '0x83b4003eB22EdE3E7FC60e8A5E58325FF61601dc' // Checksummed
account: '0xbC703B091045008E154237906c2Ca724Bf006aDB' // Checksummed
```

This ensures EIP-55 compliance and prevents potential address-related issues.

---

## 13. Conclusion

### Summary

The airdrop merkle root update is **READY FOR EXECUTION** with the following confirmations:

✅ All addresses properly checksummed
✅ All amounts verified (33B + 22B + 20B = 75B)
✅ Contract requirements met
✅ Simulation successful
✅ Update window open
✅ No claims have occurred
✅ Merkle proofs generated and validated
✅ Safe multisig verified

### Recommendation

**PROCEED WITH EXECUTION**

The update has been thoroughly vetted and all security checks have passed. The operation will successfully replace the compromised treasury address with the safe multisig while preserving the original allocation for all other recipients.

### Final Note

This is a **one-time, irreversible operation**. Once executed:

- The merkle root will be permanently changed
- Claims must use the new proofs
- The compromised address will no longer be able to claim
- The safe multisig will have access to the 20B token allocation

---

**Audited by**: AI Assistant
**Date**: October 28, 2025
**Version**: 1.0
**Status**: APPROVED FOR EXECUTION

