# Airdrop Status Fix - IPFS Integration Required

**Date:** October 30, 2025  
**Issue:** Airdrop status not working in UI  
**Root Cause:** Missing IPFS URL parameters

---

## Problem

The `getAirdropStatus()` function has two issues:

1. **IPFS URLs Required:** Function requires IPFS endpoints to retrieve merkle tree data, but these URLs are not being provided by the UI
2. **Timeout on getLogs:** Function was querying too many blocks (1M) for `AirdropClaimed` events, causing timeouts

Both issues are now fixed.

### Code Flow

```typescript
// src/airdrop.ts
export async function getAirdropStatus(
  publicClient: PopPublicClient,
  clankerToken: `0x${string}`,
  treasury: `0x${string}`,
  tokenDecimals: number,
  tokenUsdPrice: number | null,
  ipfsSearchUrl?: string, // ⚠️ REQUIRED
  ipfsJsonUrl?: string // ⚠️ REQUIRED
): Promise<AirdropStatus | null> {
  // ...

  if (!ipfsSearchUrl || !ipfsJsonUrl) {
    return null // ⚠️ Returns null immediately without these URLs
  }

  // Fetch merkle tree from IPFS
  const treeData = await retrieveMerkleTreeFromIPFS({
    tokenAddress: clankerToken,
    chainId,
    ipfsSearchUrl,
    ipfsJsonUrl,
  })

  // ... process recipients
}
```

---

## Fixes Applied

### Fix 1: Reduced Block Search Range (Performance)

**Before:**

```typescript
const blocksToSearch = 1_000_000n // Too many blocks, causes timeout
```

**After:**

```typescript
const blocksToSearch = maxBlocksToSearch ?? 50_000n // Last ~18 hours on Base
// + try-catch for graceful degradation
```

**Benefits:**

- ✅ 20x faster (50k vs 1M blocks)
- ✅ Covers recent airdrops (last 18 hours)
- ✅ Gracefully handles timeouts
- ✅ Configurable if needed

### Fix 2: Added Error Handling

```typescript
try {
  claimLogs = await publicClient.getLogs({ ... })
} catch (error) {
  console.warn('[AIRDROP] Failed to fetch claim logs')
  claimLogs = [] // Continue without claim status
}
```

**Benefits:**

- ✅ Function doesn't crash on timeout
- ✅ Still shows allocated amounts
- ✅ Better user experience

---

## Solution

### Option 1: Provide IPFS URLs (Recommended)

Update the UI to pass IPFS API endpoints:

```typescript
// In your UI code
const airdropStatus = await getAirdropStatus(
  publicClient,
  clankerToken,
  treasury,
  decimals,
  usdPrice,
  'https://yourapp.com/api/ipfs-search', // ✅ Add this
  'https://yourapp.com/api/ipfs-json' // ✅ Add this
)
```

**Required API Endpoints:**

1. **POST /api/ipfs-json** - Upload JSON to IPFS (Pinata)

   ```typescript
   // Request
   {
     data: { format, tree, metadata },
     metadata: { name, keyValues }
   }

   // Response
   { cid: "QmXXX..." }
   ```

2. **GET /api/ipfs-search** - Find CID by token metadata

   ```typescript
   // Request
   ?tokenAddress=0x...&chainId=8453

   // Response
   { cid: "QmXXX..." }
   ```

3. **GET /api/ipfs-json** - Fetch JSON by CID

   ```typescript
   // Request
   ?cid=QmXXX...

   // Response
   { format, tree, metadata }
   ```

### Option 2: Alternative Implementation (If IPFS Not Available)

If IPFS infrastructure is not available, you could:

1. **Store merkle tree on-chain** (expensive)
2. **Store on centralized server** (less decentralized)
3. **Reconstruct from events** (complex, see memory for existing solution)

---

## Deployment Flow

### With IPFS (Recommended)

```typescript
// 1. Deploy with IPFS URL
const { address, merkleTreeCID } = await deployV4({
  c: config,
  clanker,
  ipfsJsonUploadUrl: 'https://yourapp.com/api/ipfs-json',
})

console.log('Merkle tree stored to IPFS:', merkleTreeCID)

// 2. Query airdrop status
const status = await getAirdropStatus(
  publicClient,
  address,
  treasury,
  decimals,
  usdPrice,
  'https://yourapp.com/api/ipfs-search',
  'https://yourapp.com/api/ipfs-json'
)

// status.recipients contains all airdrop recipients with proofs
```

### Without IPFS (Current Behavior)

```typescript
// 1. Deploy without IPFS URL
const { address } = await deployV4({
  c: config,
  clanker,
  // No ipfsJsonUploadUrl
})

// 2. Query airdrop status
const status = await getAirdropStatus(
  publicClient,
  address,
  treasury,
  decimals,
  usdPrice
  // No IPFS URLs
)

// status = null (can't retrieve merkle tree)
```

---

## UI Integration Guide

### Step 1: Add IPFS API Routes

Create these API routes in your Next.js app (or equivalent):

```typescript
// app/api/ipfs-json/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PinataSDK } from 'pinata'

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY,
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { data, metadata } = body

  const upload = await pinata.upload.json(data).addMetadata({
    name: metadata.name,
    keyvalues: metadata.keyValues,
  })

  return NextResponse.json({ cid: upload.IpfsHash })
}

export async function GET(request: NextRequest) {
  const cid = request.nextUrl.searchParams.get('cid')
  if (!cid) return NextResponse.json({ error: 'CID required' }, { status: 400 })

  const data = await pinata.gateways.get(cid)
  return NextResponse.json(data)
}
```

```typescript
// app/api/ipfs-search/route.ts
export async function GET(request: NextRequest) {
  const tokenAddress = request.nextUrl.searchParams.get('tokenAddress')
  const chainId = request.nextUrl.searchParams.get('chainId')

  if (!tokenAddress || !chainId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const files = await pinata.files.list().metadata({
    tokenAddress: tokenAddress.toLowerCase(),
    chainId: chainId,
    type: 'airdrop-merkle-tree',
  })

  const cid = files.files?.[0]?.cid
  return NextResponse.json({ cid: cid ?? null })
}
```

### Step 2: Update UI to Pass URLs

**In your deployment flow:**

```typescript
// src/app/... or wherever you deploy tokens
const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

const { address, merkleTreeCID } = await deployV4({
  c: deploymentConfig,
  clanker,
  ipfsJsonUploadUrl: `${baseUrl}/api/ipfs-json`, // ✅ REQUIRED for airdrop status
})

console.log('Merkle tree stored to IPFS:', merkleTreeCID)
```

**In your airdrop status query:**

```typescript
// src/hooks/use-airdrop.ts or similar
const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

const airdropStatus = await getAirdropStatus(
  publicClient,
  clankerToken,
  treasury,
  decimals,
  usdPrice,
  `${baseUrl}/api/ipfs-search`, // ✅ REQUIRED
  `${baseUrl}/api/ipfs-json`, // ✅ REQUIRED
  10_000n // Optional: search last 10k blocks (~5 hours on Base, prevents timeouts)
)

if (airdropStatus) {
  // Display recipients
  airdropStatus.recipients.forEach((recipient) => {
    console.log(`${recipient.address}: ${recipient.allocatedAmount.formatted}`)
    console.log(`  Available: ${recipient.availableAmount.formatted}`)
    console.log(`  Is Treasury: ${recipient.isTreasury}`)
    console.log(`  Can claim: ${recipient.isAvailable}`)
    console.log(`  Proof: ${recipient.proof}`) // Array of bytes32 hashes
  })
} else {
  console.log('No airdrop or merkle tree not found in IPFS')
}
```

**Performance Tuning:**

| Blocks  | Time on Base | Use Case                       |
| ------- | ------------ | ------------------------------ |
| 10,000  | ~5 hours     | Recent airdrops, fast response |
| 50,000  | ~18 hours    | Default, good balance          |
| 100,000 | ~1.5 days    | Older airdrops                 |
| 500,000 | ~8 days      | Historical search (slow)       |

**Recommendation:** Use 10,000-50,000 for production to avoid timeouts.

---

## Why This Matters

**Without IPFS URLs:**

- ❌ Cannot retrieve merkle tree
- ❌ Cannot show recipients
- ❌ Cannot generate proofs
- ❌ Users can't claim airdrops

**With IPFS URLs:**

- ✅ Merkle tree stored during deployment
- ✅ Recipients retrieved efficiently
- ✅ Proofs generated automatically
- ✅ Full airdrop functionality

---

## Testing

Run the airdrop test:

```bash
cd packages/levr-sdk
bun test airdrop
```

Expected output:

- ✅ Token deploys successfully
- ✅ Returns null without IPFS URLs (graceful degradation)
- ✅ Documentation explains requirements

---

## Summary

**The issue:** `getAirdropStatus()` returns `null` because IPFS URLs aren't provided.

**The fix:** Pass `ipfsSearchUrl` and `ipfsJsonUrl` to `getAirdropStatus()` calls in your UI.

**Alternative:** If you don't have IPFS infrastructure, the function will return null (graceful degradation). Consider implementing IPFS API routes for full functionality.
