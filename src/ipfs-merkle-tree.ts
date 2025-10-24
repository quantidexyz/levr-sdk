/**
 * IPFS Merkle Tree Storage Utilities
 * Stores and retrieves merkle tree data for airdrops using IPFS
 */

export type MerkleTreeMetadata = {
  lockupEndTime: number // Timestamp in milliseconds
  lockupDuration: number // Duration in seconds
}

// Type for StandardMerkleTree.dump() output
export type StandardMerkleTreeDump = {
  format: 'standard-v1'
  tree: string[]
  values: Array<{
    value: [string, string]
    treeIndex: number
  }>
  leafEncoding: string[]
}

export type StoredMerkleTreeData = {
  format: 'standard-v1'
  tree: StandardMerkleTreeDump
  metadata?: MerkleTreeMetadata
}

export type MerkleTreeWithMetadata = StandardMerkleTreeDump & {
  metadata?: MerkleTreeMetadata
}

export type StoreMerkleTreeParams = {
  tokenAddress: `0x${string}`
  chainId: number
  treeData: StandardMerkleTreeDump // Output from tree.dump()
  ipfsJsonUploadUrl: string // Full URL to /api/ipfs-json endpoint
  lockupEndTime: number // Timestamp in milliseconds
  lockupDuration: number // Duration in seconds
}

export type RetrieveMerkleTreeParams = {
  tokenAddress: `0x${string}`
  chainId: number
  ipfsSearchUrl: string // Full URL to /api/ipfs-search endpoint
  ipfsJsonUrl: string // Full URL to /api/ipfs-json endpoint
}

export type RetrieveMerkleTreeResult = MerkleTreeWithMetadata | null

/**
 * Generates a consistent key for storing merkle tree data
 * Format: chainId-tokenAddress
 */
export function getMerkleTreeKey(tokenAddress: `0x${string}`, chainId: number): string {
  return `${chainId}-${tokenAddress.toLowerCase()}`
}

/**
 * Stores merkle tree data to IPFS via API proxy
 * @param params Storage parameters
 * @returns The IPFS CID where the data was stored
 */
export async function storeMerkleTreeToIPFS(params: StoreMerkleTreeParams): Promise<string> {
  const { tokenAddress, chainId, treeData, ipfsJsonUploadUrl, lockupEndTime, lockupDuration } =
    params

  const key = getMerkleTreeKey(tokenAddress, chainId)

  const payload: StoredMerkleTreeData = {
    format: 'standard-v1',
    tree: treeData,
    metadata: {
      lockupEndTime,
      lockupDuration,
    },
  }

  const response = await fetch(ipfsJsonUploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: payload,
      metadata: {
        name: `merkle-tree-${key}`,
        keyValues: {
          tokenAddress: tokenAddress.toLowerCase(),
          chainId: chainId.toString(),
          type: 'airdrop-merkle-tree',
        },
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to store merkle tree to IPFS: ${error}`)
  }

  const result = await response.json()
  return result.cid
}

/**
 * Retrieves merkle tree data from IPFS by searching for it using metadata
 * @param params Retrieval parameters
 * @returns The merkle tree data with metadata or null if not found
 */
export async function retrieveMerkleTreeFromIPFS(
  params: RetrieveMerkleTreeParams
): Promise<RetrieveMerkleTreeResult> {
  const { tokenAddress, chainId, ipfsSearchUrl, ipfsJsonUrl } = params

  try {
    const searchUrl = `${ipfsSearchUrl}?tokenAddress=${tokenAddress.toLowerCase()}&chainId=${chainId}`

    // Search for the CID using Pinata metadata query
    const searchResponse = await fetch(searchUrl)

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text()
      console.warn('[IPFS] Failed to search for merkle tree on IPFS:', errorText)
      return null
    }

    const result = await searchResponse.json()
    const { cid } = result

    if (!cid) {
      console.warn(
        '[IPFS] No CID found for this token. Was the token deployed with ipfsJsonUploadUrl?'
      )
      return null
    }

    // Fetch the merkle tree data using the CID
    return await fetchMerkleTreeByCID(cid, ipfsJsonUrl)
  } catch (error) {
    console.error('[IPFS] Error retrieving merkle tree from IPFS:', error)
    return null
  }
}

/**
 * Fetches merkle tree data by CID
 * @param cid The IPFS CID
 * @param ipfsJsonUrl Full URL to /api/ipfs-json endpoint
 */
export async function fetchMerkleTreeByCID(
  cid: string,
  ipfsJsonUrl: string
): Promise<RetrieveMerkleTreeResult> {
  try {
    const fetchUrl = `${ipfsJsonUrl}?cid=${cid}`
    const response = await fetch(fetchUrl)

    if (!response.ok) {
      const errorText = await response.text()
      console.warn(`[IPFS] Failed to fetch merkle tree from IPFS: ${errorText}`)
      return null
    }

    const data: StoredMerkleTreeData = await response.json()

    // Return tree data with metadata attached
    const treeWithMetadata: MerkleTreeWithMetadata = {
      ...data.tree,
      metadata: data.metadata,
    }

    return treeWithMetadata
  } catch (error) {
    console.error('[IPFS] Error fetching merkle tree from IPFS:', error)
    return null
  }
}

/**
 * Helper function to get CID for a token by searching IPFS
 * @param tokenAddress Token address
 * @param chainId Chain ID
 * @param ipfsSearchUrl Full URL to /api/ipfs-search endpoint
 * @returns CID if found, null otherwise
 */
export async function getCIDForToken(
  tokenAddress: `0x${string}`,
  chainId: number,
  ipfsSearchUrl: string
): Promise<string | null> {
  try {
    const searchResponse = await fetch(
      `${ipfsSearchUrl}?tokenAddress=${tokenAddress.toLowerCase()}&chainId=${chainId}`
    )

    if (!searchResponse.ok) {
      return null
    }

    const { cid } = await searchResponse.json()
    return cid || null
  } catch (error) {
    console.error('Error fetching CID:', error)
    return null
  }
}
