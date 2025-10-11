import { Clanker } from 'clanker-sdk/v4'

import { IClankerLPLocker, WETH9 } from '../src/abis'
import { GET_FACTORY_ADDRESS, GET_LP_LOCKER_ADDRESS, WETH } from '../src/constants'
import type { PopPublicClient, PopWalletClient } from '../src/types'
import { getPublicClient, getWallet } from './util'

export type SetupTestReturnType = ReturnType<typeof setupTest>

/**
 * Setup test environment
 */
export const setupTest = (
  { oracleChainId } = {
    oracleChainId: undefined as number | undefined,
  }
): {
  publicClient: PopPublicClient
  wallet: PopWalletClient
  chainId: number
  factoryAddress: `0x${string}`
  lpLockerAddress: `0x${string}`
  clanker: Clanker
  weth: NonNullable<ReturnType<typeof WETH>> & { abi: typeof WETH9 }
  oraclePublicClient: PopPublicClient
} => {
  const publicClient = getPublicClient()
  const wallet = getWallet()

  const _chainId = publicClient.chain?.id
  if (!_chainId) throw new Error('Chain ID not found')
  const chainId = _chainId

  if (!wallet.account) throw new Error('Wallet account not found')

  const _factoryAddress = GET_FACTORY_ADDRESS(_chainId)
  if (!_factoryAddress) throw new Error('Factory address not found')
  const factoryAddress = _factoryAddress

  const _lpLockerAddress = GET_LP_LOCKER_ADDRESS(_chainId)
  if (!_lpLockerAddress) throw new Error('LP Locker address not found')
  const lpLockerAddress = _lpLockerAddress

  const clanker = new Clanker({ publicClient, wallet })

  const _weth = WETH(chainId)
  if (!_weth) throw new Error('WETH not found')
  const weth = { ..._weth, abi: WETH9 }

  return {
    publicClient,
    wallet,
    chainId,
    factoryAddress,
    lpLockerAddress,
    clanker,
    weth,
    oraclePublicClient: oracleChainId ? getPublicClient(undefined, oracleChainId) : publicClient,
  }
}

/**
 * Get token rewards of a deployed token, via LP locker
 */
export const getTokenRewards = async (
  publicClient: PopPublicClient,
  deployedTokenAddress: `0x${string}`
) => {
  const chainId = publicClient.chain?.id
  if (!chainId) throw new Error('Chain ID not found')

  const lpLockerAddress = GET_LP_LOCKER_ADDRESS(chainId)
  if (!lpLockerAddress) throw new Error('LP Locker address not found')

  const tokenRewards = await publicClient.readContract({
    address: lpLockerAddress,
    abi: IClankerLPLocker,
    functionName: 'tokenRewards',
    args: [deployedTokenAddress],
  })

  return tokenRewards
}
