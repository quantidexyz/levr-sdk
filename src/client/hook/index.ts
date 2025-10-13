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
 * Hook to access clanker token metadata from LevrProvider
 */
export const useClankerToken = () => useLevrContext().tokenData

// ========================================
// COMPLEX HOOKS (with mutations/callbacks)
// ========================================

export * from './use-clanker'
export * from './use-fee-receivers'
export * from './use-governance'
export * from './use-stake'
export * from './use-swap'

// ========================================
// INTERNAL HOOKS (used by LevrProvider)
// ========================================

export { usePoolQuery } from './use-pool'
export { useUserQuery } from './use-user'

// ========================================
// OTHER HOOKS (not part of Levr context)
// ========================================

export * from './use-deploy'
export * from './use-prepare'
export * from './use-projects'
export * from './use-register'
