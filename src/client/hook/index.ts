import { useLevrContext } from '../levr-provider'

// ========================================
// SIMPLE CONTEXT ACCESSORS (one-liner exports)
// ========================================

/**
 * Hook to access user data from LevrProvider (hierarchical)
 */
export const useUser = () => useLevrContext().user

/**
 * Hook to access project data from LevrProvider
 */
export const useProject = () => useLevrContext().project

/**
 * Hook to access pool data from LevrProvider
 */
export const usePool = () => useLevrContext().pool

/**
 * Hook to access proposals from LevrProvider
 */
export const useProposals = () => useLevrContext().proposals

/**
 * Hook to access airdrop status from LevrProvider
 */
export const useAirdropStatus = () => useLevrContext().airdropStatus

// ========================================
// COMPLEX HOOKS (with mutations/callbacks)
// ========================================

export * from './use-clanker'
export * from './use-configure-splits'
export * from './use-fee-receivers'
export * from './use-governance'
export * from './use-stake'
export * from './use-swap'

// ========================================
// OTHER HOOKS (not part of Levr context)
// ========================================

export * from './use-airdrop'
export * from './use-deploy'
export * from './use-pool'
export * from './use-prepare'
export * from './use-project'
export * from './use-proposal'
export * from './use-register'
