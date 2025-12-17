import { CLANKERS } from 'clanker-sdk'
import { anvil, base, baseSepolia, bsc } from 'viem/chains'

/**
 * Get the LP locker address for a given chain ID
 * @param chainId - The chain ID
 * @returns The LP locker address
 */
export const GET_LP_LOCKER_ADDRESS = (chainId?: number): `0x${string}` | undefined => {
  if (!chainId) return undefined

  const chainMap = {
    // In our dev monorepo, we have a clanker_v4_anvil contract, but in the remote package, it's not defined
    [anvil.id]: (CLANKERS as any)?.clanker_v4_anvil?.related?.locker,
    [base.id]: CLANKERS.clanker_v4.related.locker,
    [baseSepolia.id]: CLANKERS.clanker_v4_sepolia.related.locker,
    [bsc.id]: (CLANKERS as any)?.clanker_v4_bnb?.related?.locker,
  } as Record<number, `0x${string}` | undefined>

  return chainMap?.[chainId]
}

/**
 * Get the Fee locker address for a given chain ID
 * @param chainId - The chain ID
 * @returns The Fee locker address
 */
export const GET_FEE_LOCKER_ADDRESS = (chainId?: number): `0x${string}` | undefined => {
  if (!chainId) return undefined

  const chainMap = {
    // In our dev monorepo, we have a clanker_v4_anvil contract, but in the remote package, it's not defined
    [anvil.id]: (CLANKERS as any)?.clanker_v4_anvil?.related?.feeLocker,
    [base.id]: CLANKERS.clanker_v4.related.feeLocker,
    [baseSepolia.id]: CLANKERS.clanker_v4_sepolia.related.feeLocker,
    [bsc.id]: (CLANKERS as any)?.clanker_v4_bnb?.related?.feeLocker,
  } as Record<number, `0x${string}` | undefined>

  return chainMap?.[chainId]
}

/**
 * Get the Clanker Factory address for a given chain ID
 * @param chainId - The chain ID
 * @returns The Clanker Factory address
 */
export const GET_CLANKER_FACTORY_ADDRESS = (chainId?: number): `0x${string}` | undefined => {
  if (!chainId) return undefined

  const chainMap = {
    // In our dev monorepo, we have a clanker_v4_anvil contract, but in the remote package, it's not defined
    [anvil.id]: (CLANKERS as any)?.clanker_v4_anvil?.factoryAddress,
    // Same address on both Base mainnet (8453) and Base Sepolia (84532)
    [base.id]: '0xE85A59c628F7d27878ACeB4bf3b35733630083a9',
    [baseSepolia.id]: '0xE85A59c628F7d27878ACeB4bf3b35733630083a9',
    [bsc.id]: '0xFb28402068d716C82D8Cd80567d1B0e2539AdFB2',
  } as Record<number, `0x${string}` | undefined>

  return chainMap?.[chainId]
}

/**
 * Get the Clanker Airdrop address for a given chain ID
 * @param chainId - The chain ID
 * @returns The Clanker Airdrop address
 */
export const GET_CLANKER_AIRDROP_ADDRESS = (chainId?: number): `0x${string}` | undefined => {
  if (!chainId) return undefined

  const chainMap = {
    // In our dev monorepo, we have a clanker_v4_anvil contract, but in the remote package, it's not defined
    [anvil.id]: (CLANKERS as any)?.clanker_v4_anvil?.related?.airdrop,
    [base.id]: CLANKERS.clanker_v4.related.airdrop,
    [baseSepolia.id]: CLANKERS.clanker_v4_sepolia.related.airdrop,
    [bsc.id]: (CLANKERS as any)?.clanker_v4_bnb?.related?.airdrop,
  } as Record<number, `0x${string}` | undefined>

  return chainMap?.[chainId]
}

/**
 * Get the Vault address for a given chain ID
 * @param chainId - The chain ID
 * @returns The Vault address
 */
export const GET_VAULT_ADDRESS = (chainId?: number): `0x${string}` | undefined => {
  if (!chainId) return undefined

  const chainMap = {
    // In our dev monorepo, we have a clanker_v4_anvil contract, but in the remote package, it's not defined
    [anvil.id]: (CLANKERS as any)?.clanker_v4_anvil?.related?.vault,
    [base.id]: CLANKERS.clanker_v4.related.vault,
    [baseSepolia.id]: CLANKERS.clanker_v4_sepolia.related.vault,
    [bsc.id]: (CLANKERS as any)?.clanker_v4_bnb?.related?.vault,
  } as Record<number, `0x${string}` | undefined>

  return chainMap?.[chainId]
}
