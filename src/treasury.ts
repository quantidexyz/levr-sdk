import { StandardMerkleTree } from '@openzeppelin/merkle-tree'

import ClankerAirdropV2 from './abis/ClankerAirdropV2'
import { formatBalanceWithUsd } from './balance'
import { GET_CLANKER_AIRDROP_ADDRESS } from './constants'
import { type MerkleTreeWithMetadata, retrieveMerkleTreeFromIPFS } from './ipfs-merkle-tree'
import type { BalanceResult, PopPublicClient } from './types'

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

export async function getTreasuryAirdropStatus(
  publicClient: PopPublicClient,
  clankerToken: `0x${string}`,
  treasury: `0x${string}`,
  tokenDecimals: number,
  tokenUsdPrice: number | null,
  ipfsSearchUrl?: string, // Full URL to /api/ipfs-search
  ipfsJsonUrl?: string // Full URL to /api/ipfs-json
): Promise<AirdropStatus | null> {
  console.log('[AIRDROP] Starting airdrop status fetch...')
  const chainId = publicClient.chain?.id
  const airdropAddress = GET_CLANKER_AIRDROP_ADDRESS(chainId)

  if (!airdropAddress) {
    console.log('[AIRDROP] No airdrop address found for chain', chainId)
    return null
  }

  if (!ipfsSearchUrl || !ipfsJsonUrl) {
    console.warn('[AIRDROP] IPFS URLs not provided, cannot fetch airdrop data')
    return null
  }

  try {
    console.log('[AIRDROP] Fetching merkle tree from IPFS...')
    // Fetch merkle tree from IPFS
    const treeData = await retrieveMerkleTreeFromIPFS({
      tokenAddress: clankerToken,
      chainId,
      ipfsSearchUrl,
      ipfsJsonUrl,
    })

    if (!treeData) {
      console.log('[AIRDROP] No merkle tree found on IPFS for this token')
      return null
    }

    console.log('[AIRDROP] Merkle tree retrieved, loading...')
    const treeWithMetadata = treeData as MerkleTreeWithMetadata
    const tree = StandardMerkleTree.load<[string, string]>(treeWithMetadata)

    console.log('[AIRDROP] Tree loaded, processing all recipients...')

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
      console.log('[AIRDROP] ✅ Using metadata from IPFS (fast path)')
    } else {
      // Fallback: Query contract (slower)
      console.log('[AIRDROP] No metadata in IPFS, querying contract...')
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

    console.log('[AIRDROP] Block time:', new Date(currentBlockTime).toISOString())
    console.log('[AIRDROP] Lockup ends:', new Date(lockupEndTime).toISOString())

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

    console.log(`[AIRDROP] Found ${recipientEntries.length} recipients in merkle tree`)

    // Get current block number for claim event search
    const currentBlockNumber = await publicClient.getBlockNumber()
    const blocksToSearch = 1_000_000n
    const fromBlock = currentBlockNumber > blocksToSearch ? currentBlockNumber - blocksToSearch : 0n

    // Get AirdropClaimed events to check who has actually claimed
    const airdropClaimedEvent = ClankerAirdropV2.find(
      (item) => item.type === 'event' && item.name === 'AirdropClaimed'
    )

    const claimLogs = airdropClaimedEvent
      ? await publicClient.getLogs({
          address: airdropAddress,
          event: airdropClaimedEvent,
          args: {
            token: clankerToken,
          },
          fromBlock,
          toBlock: 'latest',
        })
      : []

    // Track which addresses have claimed
    const claimedAddresses = new Set(
      claimLogs.map((log) => (log.args.user as `0x${string}`).toLowerCase())
    )

    console.log(`[AIRDROP] Found ${claimedAddresses.size} addresses that have claimed`)

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
            // Unlocked but 0 available and not claimed - shouldn't happen
            error = 'No airdrop available'
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

      console.log(
        `[AIRDROP] Recipient ${i + 1}/${recipientEntries.length}:`,
        entry.address.slice(0, 10) + '...',
        isTreasury ? '(TREASURY)' : '',
        `claimed: ${hasClaimed}`,
        `allocated: ${entry.allocatedAmount}`,
        `available: ${availableAmount}`,
        error || '✅ Available'
      )
    }

    console.log('[AIRDROP] ✅ All recipients processed')

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
