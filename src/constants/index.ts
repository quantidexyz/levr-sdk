import { BigNumber } from 'ethers'

// Re-export all chain configurations
export * from './chain'

// Re-export other constants
export * from './clanker'
export * from './config'
export * from './levr'
export * from './uniswap'

// =============================================================================
// Universal Router Constants
// =============================================================================

/**
 * Contract balance representation, for use in Universal Router
 */
export const CONTRACT_BALANCE = BigNumber.from(
  '0x8000000000000000000000000000000000000000000000000000000000000000'
)

/**
 * MSG_SENDER representation, for use in Universal Router
 */
export const MSG_SENDER = '0x0000000000000000000000000000000000000001'

/**
 * ADDRESS_THIS representation, for use in Universal Router
 */
export const ADDRESS_THIS = '0x0000000000000000000000000000000000000002'
