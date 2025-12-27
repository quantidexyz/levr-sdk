import type { Clanker } from 'clanker-sdk/v4'
import type { TransactionReceipt } from 'viem'

import { IClankerToken, LevrFactory_v1, LevrForwarder_v1 } from './abis'
import ClankerAirdropV2 from './abis/ClankerAirdropV2'
import { buildCalldatasV4 } from './build-calldatas-v4'
import { GET_CLANKER_AIRDROP_ADDRESS, GET_FACTORY_ADDRESS } from './constants'
import { storeMerkleTreeToIPFS } from './ipfs-merkle-tree'
import type { LevrClankerDeploymentSchemaType } from './schema'

export type DeployV4Params = {
  c: LevrClankerDeploymentSchemaType
  clanker: Clanker | undefined | null
  ipfsJsonUploadUrl?: string // Optional full URL to /api/ipfs-json endpoint for storing merkle tree
}

export type DeployV4ReturnType = {
  receipt: TransactionReceipt
  address: `0x${string}`
  merkleTreeCID?: string
}

export const deployV4 = async ({
  c,
  clanker,
  ipfsJsonUploadUrl,
}: DeployV4Params): Promise<DeployV4ReturnType> => {
  if (!clanker) throw new Error('Clanker SDK not found')

  const wallet = clanker.wallet
  const publicClient = clanker.publicClient
  if (!publicClient) throw new Error('Public client not found')
  if (!wallet) throw new Error('Wallet not found')

  const chainId = publicClient.chain?.id
  if (!chainId) throw new Error('Chain ID not found')
  const factoryAddress = GET_FACTORY_ADDRESS(chainId)
  if (!factoryAddress) throw new Error('Factory address is required')

  const trustedForwarder = await publicClient.readContract({
    address: factoryAddress,
    abi: LevrFactory_v1,
    functionName: 'trustedForwarder',
  })

  const { callDatas, clankerTokenAddress, totalValue, merkleTree } = await buildCalldatasV4({
    c,
    clanker,
    publicClient,
    wallet,
    factoryAddress,
    forwarderAddress: trustedForwarder,
  })

  const txHash = await wallet.writeContract({
    address: trustedForwarder,
    abi: LevrForwarder_v1,
    functionName: 'executeMulticall',
    args: [callDatas],
    value: totalValue,
  })

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

  if (receipt.status === 'reverted') {
    throw new Error('Deployment transaction reverted')
  }

  // Transfer token admin if adminOverwrite is provided (standalone transaction)
  if (c.adminOverwrite) {
    try {
      const updateAdminTxHash = await wallet.writeContract({
        address: clankerTokenAddress,
        abi: IClankerToken,
        functionName: 'updateAdmin',
        args: [c.adminOverwrite],
        gas: 100_000n, // Explicit gas limit to avoid underestimation
      })

      const updateAdminReceipt = await publicClient.waitForTransactionReceipt({
        hash: updateAdminTxHash,
      })

      if (updateAdminReceipt.status === 'reverted') {
        console.warn('Admin transfer transaction reverted, proceeding with deployer as admin')
      }
    } catch (error) {
      console.warn('Failed to transfer admin, proceeding with deployer as admin:', error)
    }
  }

  // Store merkle tree to IPFS if ipfsJsonUploadUrl is provided and airdrop exists
  let merkleTreeCID: string | undefined

  if (ipfsJsonUploadUrl && merkleTree) {
    // Get airdrop contract info to save metadata
    const airdropAddress = GET_CLANKER_AIRDROP_ADDRESS(chainId)

    if (airdropAddress) {
      // Fetch airdrop info to get lockupEndTime and other metadata
      const airdropInfo = await publicClient.readContract({
        address: airdropAddress,
        abi: ClankerAirdropV2,
        functionName: 'airdrops',
        args: [clankerTokenAddress],
      })

      const lockupEndTime = Number(airdropInfo[4]) * 1000 // index 4 is lockupEndTime (convert to ms)
      const lockupDuration = 86400 // 1 day in seconds

      // Store the merkle tree data to IPFS with minimal metadata
      // This will throw an error if upload fails, which will fail the entire deployment
      const treeData = merkleTree.dump()
      const cid = await storeMerkleTreeToIPFS({
        tokenAddress: clankerTokenAddress,
        chainId,
        treeData,
        ipfsJsonUploadUrl,
        lockupEndTime,
        lockupDuration,
      })

      merkleTreeCID = cid

      console.log(`Merkle tree stored to IPFS with CID: ${cid}`)
      console.log(`Metadata: lockupEndTime=${new Date(lockupEndTime).toISOString()}`)
      console.log(`Retrieve using: tokenAddress=${clankerTokenAddress}, chainId=${chainId}`)
    } else {
      console.warn('No airdrop address found, storing merkle tree with default metadata')
      const treeData = merkleTree.dump()
      const currentBlock = await publicClient.getBlock()
      const lockupDuration = 86400 // 1 day in seconds
      const lockupEndTime = Number(currentBlock.timestamp) * 1000 + lockupDuration * 1000

      const cid = await storeMerkleTreeToIPFS({
        tokenAddress: clankerTokenAddress,
        chainId,
        treeData,
        ipfsJsonUploadUrl,
        lockupEndTime,
        lockupDuration,
      })
      merkleTreeCID = cid
    }
  }

  return {
    receipt,
    address: clankerTokenAddress,
    merkleTreeCID,
  }
}
