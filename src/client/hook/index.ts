import { useLevrContext } from '../levr-provider'

// ========================================
// SIMPLE CONTEXT ACCESSORS (one-liner exports)
// ========================================

/**
 * Hook to access project data from LevrProvider
 */
export const useProject = () => useLevrContext().project

/**
 * Hook to access balance data from LevrProvider
 */
export const useBalance = () => useLevrContext().balances

/**
 * Hook to access proposals from LevrProvider
 */
export const useProposals = () => useLevrContext().proposals

/**
 * Hook to access token metadata from LevrProvider
 * Alias for compatibility
 */
export const useTokenData = () => useLevrContext().tokenData
export const useClankerTokenData = () => useLevrContext().tokenData

/**
 * Hook to access fee receivers from LevrProvider
 */
export const useFeeReceiversData = () => useLevrContext().feeReceivers

// ========================================
// COMPLEX HOOKS (with mutations/callbacks)
// ========================================

export * from './use-clanker'
export * from './use-fee-receivers'
export * from './use-governance'
export * from './use-stake'
export * from './use-swap'

// ========================================
// OTHER HOOKS (not part of Levr context)
// ========================================

export * from './use-deploy'
export * from './use-prepare'
export * from './use-projects'
export * from './use-register'
