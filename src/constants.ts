import { CLANKERS } from 'clanker-sdk'
import { anvil, base, baseSepolia } from 'viem/chains'

export const GET_LP_LOCKER_ADDRESS = (chainId?: number): `0x${string}` | undefined => {
  if (!chainId) return undefined

  const chainMap = {
    // @ts-expect-error - clanker_v4_anvil is not defined in the remote package
    [anvil.id]: CLANKERS.clanker_v4_anvil.related.locker,
    [base.id]: CLANKERS.clanker_v4.related.locker,
    [baseSepolia.id]: CLANKERS.clanker_v4_sepolia.related.locker,
  } as Record<number, `0x${string}` | undefined>

  return chainMap?.[chainId]
}

export const GET_FACTORY_ADDRESS = (chainId?: number): `0x${string}` | undefined => {
  if (!chainId) return undefined

  return {
    [anvil.id]: process.env.NEXT_PUBLIC_LEVR_FACTORY_V1_ANVIL,
  }[chainId] as `0x${string}` | undefined
}
