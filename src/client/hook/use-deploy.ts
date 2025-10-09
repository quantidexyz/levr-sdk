import { useMutation } from '@tanstack/react-query'
import type { TransactionReceipt } from 'viem'

import { TREASURY_AIRDROP_AMOUNTS } from '../../constants'
import { deployV4 } from '../../deploy-v4'
import type { LevrClankerDeploymentSchemaType } from '../../schema'
import { useClanker } from './use-clanker'

export type UseDeployParams = {
  treasuryAirdropAmount?: number
  onSuccess?: (params: { receipt: TransactionReceipt; address: `0x${string}` }) => void
  onError?: (error: unknown) => void
}

/**
 * Deploys a Clanker token and registers it with the Levr factory.
 * Returns tx hash and deployed address.
 */
export function useDeploy({
  treasuryAirdropAmount = TREASURY_AIRDROP_AMOUNTS['30B'], // Use first amount as default
  onSuccess,
  onError,
}: UseDeployParams) {
  const { clanker } = useClanker()

  return useMutation({
    mutationFn: (c: LevrClankerDeploymentSchemaType) =>
      deployV4({ c, clanker: clanker.data, treasuryAirdropAmount }),
    onSuccess,
    onError,
  })
}
