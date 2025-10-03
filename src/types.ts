/**
 * @description Uniswap V4 Pool Key structure
 */
export type PoolKey = {
  currency0: `0x${string}`
  currency1: `0x${string}`
  fee: number
  tickSpacing: number
  hooks: `0x${string}`
}
