'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'

import { IClankerLpLockerMultiple } from '../../abis'
import { GET_LP_LOCKER_ADDRESS } from '../../constants'

/**
 * The parameters for the useFeeReceivers hook.
 * @param clankerToken - The clanker token address.
 * @param enabled - Whether the hook is enabled.
 * @param onSuccess - The callback function to call when the mutation is successful.
 * @param onError - The callback function to call when the mutation is errored.
 */
export type UseFeeReceiversParams = {
  clankerToken: `0x${string}` | undefined
  enabled?: boolean
  onSuccess?: (hash: `0x${string}`) => void
  onError?: (error: unknown) => void
}

/**
 * The parameters for the updateFeeReceiver mutation.
 * @param clankerToken - The clanker token address.
 * @param rewardIndex - The index of the reward.
 * @param newRecipient - The new recipient address.
 */
export type UpdateFeeReceiverParams = {
  clankerToken: `0x${string}`
  rewardIndex: bigint | number // usually 0 for primary recipient
  newRecipient: `0x${string}` // staking contract
}

/**
 * The fee receiver admin.
 * @param areYouAnAdmin - Whether the admin is the current user.
 * @param admin - The admin address.
 * @param recipient - The recipient address.
 * @param percentage - The percentage of the fee.
 */
export type FeeReceiverAdmin = {
  areYouAnAdmin: boolean
  admin: `0x${string}`
  recipient: `0x${string}`
  percentage: number
}

/**
 * Hook to get the fee receivers and update them.
 * @param FeeReceiversParams - The parameters for the hook.
 * @returns The query and mutate functions.
 */
export function useFeeReceivers({
  clankerToken,
  enabled: e,
  onSuccess,
  onError,
}: UseFeeReceiversParams) {
  const { address, chainId } = useAccount()
  const lpLockerAddress = GET_LP_LOCKER_ADDRESS(chainId)
  const publicClient = usePublicClient()
  const wallet = useWalletClient()

  const enabled = !!publicClient && !!lpLockerAddress && !!clankerToken && (e ?? true)

  const query = useQuery({
    queryKey: ['fee-receivers', clankerToken, address, chainId],
    enabled,
    queryFn: async (): Promise<FeeReceiverAdmin[] | undefined> => {
      const info = await publicClient!.readContract({
        address: lpLockerAddress!,
        abi: IClankerLpLockerMultiple,
        functionName: 'tokenRewards',
        args: [clankerToken!],
      })

      const admins = info?.rewardAdmins || []
      const recipients = info?.rewardRecipients || []
      const bps = info?.rewardBps || []

      const feeReceivers = admins.map((admin, index) => ({
        areYouAnAdmin: admin.toLowerCase() === address!.toLowerCase(),
        admin,
        recipient: recipients[index],
        // Convert bps to percentage
        percentage: bps[index] / 100,
      }))

      return feeReceivers
    },
    staleTime: 15_000,
  })

  const mutate = useMutation({
    mutationFn: async (params: UpdateFeeReceiverParams) => {
      if (!wallet.data || !lpLockerAddress)
        throw new Error('Wallet or lp locker address is not set')

      const index = Number(params.rewardIndex)
      const hash = await wallet.data.writeContract({
        address: lpLockerAddress,
        abi: IClankerLpLockerMultiple,
        functionName: 'updateRewardRecipient',
        args: [params.clankerToken, BigInt(index), params.newRecipient],
      })
      return hash
    },
    onSuccess: (hash) => onSuccess?.(hash),
    onError: onError,
  })

  return {
    query,
    mutate,
  }
}
