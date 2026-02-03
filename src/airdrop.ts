import { StandardMerkleTree } from '@openzeppelin/merkle-tree'

import ClankerAirdropV2 from './abis/ClankerAirdropV2'
import { formatBalanceWithUsd } from './balance'
import { GET_CLANKER_AIRDROP_ADDRESS } from './constants'
import { query } from './graphql'
import { type MerkleTreeWithMetadata, retrieveMerkleTreeFromIPFS } from './ipfs-merkle-tree'
import type { BalanceResult, PopPublicClient } from './types'

/**
 * Query the indexer for airdrop claims on a specific token
 * Returns a Set of addresses that have claimed (lowercase)
 */
async function getClaimedAddressesFromIndexer(
  chainId: number,
  tokenAddress: string
): Promise<Set<string>> {
  try {
    // Query the indexer for all claims on this token
    // Using raw query since types may not be generated yet
    const result = await query({
      LevrAirdropClaim: {
        __args: {
          where: {
            chainId: { _eq: chainId },
            token: { address: { _eq: tokenAddress.toLowerCase() } },
          },
        },
        user: true,
      },
    } as any)

    const claims = (result as any)?.LevrAirdropClaim ?? []
    return new Set(claims.map((claim: { user: string }) => claim.user.toLowerCase()))
  } catch (error) {
    console.warn('[AIRDROP] Failed to query indexer for claims:', (error as Error).message)
    return new Set()
  }
}

export type AirdropRecipient = {
  address: `0x${string}`
  allocatedAmount: BalanceResult
  availableAmount: BalanceResult
  isAvailable: boolean
  proof: `0x${string}`[]
  isTreasury: boolean
  error?: string
}

export type AirdropStatus = {
  recipients: AirdropRecipient[]
  deploymentTimestamp?: number
  lockupDurationHours?: number
}

export async function getAirdropStatus(
  publicClient: PopPublicClient,
  clankerToken: `0x${string}`,
  treasury: `0x${string}`,
  tokenDecimals: number,
  tokenUsdPrice: number | null,
  ipfsSearchUrl?: string, // Full URL to /api/ipfs-search
  ipfsJsonUrl?: string // Full URL to /api/ipfs-json
): Promise<AirdropStatus | null> {
  const chainId = publicClient.chain?.id
  const airdropAddress = GET_CLANKER_AIRDROP_ADDRESS(chainId)

  if (!airdropAddress) {
    return null
  }

  if (!ipfsSearchUrl || !ipfsJsonUrl) {
    return null
  }

  try {
    // Fetch merkle tree from IPFS
    const treeData = await retrieveMerkleTreeFromIPFS({
      tokenAddress: clankerToken,
      chainId,
      ipfsSearchUrl,
      ipfsJsonUrl,
    })

    if (!treeData) {
      return null
    }

    const treeWithMetadata = treeData as MerkleTreeWithMetadata
    const tree = StandardMerkleTree.load<[string, string]>(treeWithMetadata)

    // Get current block time for accurate comparison (always needed)
    const currentBlock = await publicClient.getBlock()
    const currentBlockTime = Number(currentBlock.timestamp) * 1000

    // Try to get metadata from IPFS first to avoid RPC calls
    let lockupEndTime: number
    let lockupDuration: number

    if (treeWithMetadata.metadata?.lockupEndTime) {
      // Use saved metadata from IPFS (fast path!)
      lockupEndTime = treeWithMetadata.metadata.lockupEndTime
      lockupDuration = treeWithMetadata.metadata.lockupDuration
    } else {
      // Fallback: Query contract (slower)
      const airdropInfo = await publicClient.readContract({
        address: airdropAddress,
        abi: ClankerAirdropV2,
        functionName: 'airdrops',
        args: [clankerToken],
      })

      lockupEndTime = Number(airdropInfo[4]) * 1000
      lockupDuration = 86400 // 1 day in seconds
    }

    // Calculate derived values from saved metadata
    const deploymentTimestamp = lockupEndTime - lockupDuration * 1000
    const lockupDurationHours = lockupDuration / 3600

    // Process ALL recipients in the merkle tree
    const recipients: AirdropRecipient[] = []

    // Collect all recipients first to batch the multicall
    const recipientEntries: Array<{
      address: `0x${string}`
      allocatedAmount: bigint
      index: number
    }> = []

    for (const [i, value] of tree.entries()) {
      const [address, amount] = value
      recipientEntries.push({
        address: address as `0x${string}`,
        allocatedAmount: BigInt(amount),
        index: i,
      })
    }

    // Query the indexer for claimed addresses (covers all historical claims)
    const claimedAddresses = await getClaimedAddressesFromIndexer(chainId!, clankerToken)

    // Batch check available amounts for all recipients
    const availableAmounts = (await publicClient.multicall({
      contracts: recipientEntries.map((entry) => ({
        address: airdropAddress,
        abi: ClankerAirdropV2,
        functionName: 'amountAvailableToClaim',
        args: [clankerToken, entry.address, entry.allocatedAmount],
      })),
      allowFailure: true,
    })) as Array<{ result?: bigint; status: string }>

    // Process each recipient
    for (let i = 0; i < recipientEntries.length; i++) {
      const entry = recipientEntries[i]
      const availableResult = availableAmounts[i]
      const availableAmount = availableResult?.result ?? 0n
      const isTreasury = entry.address.toLowerCase() === treasury.toLowerCase()
      const hasClaimed = claimedAddresses.has(entry.address.toLowerCase())

      // Generate proof for this recipient
      const proof = tree.getProof(entry.index) as `0x${string}`[]

      // Log for debugging single recipient case
      if (recipientEntries.length === 1) {
        console.log('[AIRDROP] Single recipient detected:', {
          address: entry.address,
          proofLength: proof.length,
          proof,
          index: entry.index,
          allocatedAmount: entry.allocatedAmount.toString(),
          availableAmount: availableAmount.toString(),
        })
      }

      // Determine status
      let error: string | undefined
      let isAvailable = availableAmount > 0n

      if (availableAmount === 0n) {
        if (hasClaimed) {
          // Actually claimed
          error = 'Airdrop already claimed'
          isAvailable = false
        } else {
          // Not claimed but 0 available = still locked
          const isLocked = currentBlockTime < lockupEndTime
          if (isLocked) {
            error = 'Airdrop is still locked (lockup period not passed)'
            isAvailable = false
          } else {
            // Unlocked but 0 available - this means already claimed
            // (claim event may not be found if it's older than our block search range)
            error = 'Airdrop already claimed'
            isAvailable = false
          }
        }
      }

      recipients.push({
        address: entry.address,
        allocatedAmount: formatBalanceWithUsd(entry.allocatedAmount, tokenDecimals, tokenUsdPrice),
        availableAmount: formatBalanceWithUsd(availableAmount, tokenDecimals, tokenUsdPrice),
        isAvailable,
        proof,
        isTreasury,
        error,
      })
    }

    return {
      recipients,
      deploymentTimestamp,
      lockupDurationHours,
    }
  } catch (error) {
    console.error('[AIRDROP] Failed to fetch airdrop:', error)
    return null
  }
}
