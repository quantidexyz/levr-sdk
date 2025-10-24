import { useMutation } from '@tanstack/react-query'
import type { TransactionReceipt } from 'viem'

import { deployV4 } from '../../deploy-v4'
import type { LevrClankerDeploymentSchemaType } from '../../schema'
import { useClanker } from './use-clanker'

export type UseDeployParams = {
  treasuryAirdropAmount?: number
  ipfsJsonUploadUrl?: string // Full URL to /api/ipfs-json endpoint
  onSuccess?: (params: {
    receipt: TransactionReceipt
    address: `0x${string}`
    merkleTreeCID?: string
  }) => void
  onError?: (error: unknown) => void
}

/**
 * Deploys a Clanker token and registers it with the Levr factory.
 * Returns tx hash, deployed address, and merkle tree CID (if IPFS URL provided).
 */
export function useDeploy({ ipfsJsonUploadUrl, onSuccess, onError }: UseDeployParams) {
  const clanker = useClanker()

  return useMutation({
    mutationFn: (c: LevrClankerDeploymentSchemaType) =>
      deployV4({ c, clanker: clanker.data, ipfsJsonUploadUrl }),
    onSuccess,
    onError,
  })
}
