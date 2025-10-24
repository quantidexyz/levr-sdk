import type { Clanker } from 'clanker-sdk/v4'
import type { TransactionReceipt } from 'viem'

import { LevrFactory_v1, LevrForwarder_v1 } from './abis'
import { buildCalldatasV4 } from './build-calldatas-v4'
import { GET_FACTORY_ADDRESS } from './constants'
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

  // Store merkle tree to IPFS if ipfsJsonUploadUrl is provided and airdrop exists
  let merkleTreeCID: string | undefined

  if (ipfsJsonUploadUrl && merkleTree) {
    // Store the merkle tree data to IPFS
    // This will throw an error if upload fails, which will fail the entire deployment
    const treeData = merkleTree.dump()
    const cid = await storeMerkleTreeToIPFS({
      tokenAddress: clankerTokenAddress,
      chainId,
      treeData,
      ipfsJsonUploadUrl,
    })

    merkleTreeCID = cid

    console.log(`Merkle tree stored to IPFS with CID: ${cid}`)
    console.log(`Retrieve using: tokenAddress=${clankerTokenAddress}, chainId=${chainId}`)
  }

  return {
    receipt,
    address: clankerTokenAddress,
    merkleTreeCID,
  }
}
