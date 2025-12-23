import type { GraphQLQueryArgs, GraphQLQueryResult } from '..'
import type { LevrFactoryGenqlSelection } from '../gen/schema'

// ============================================================================
// Base Field Definitions
// ============================================================================

export const levrFactoryFields = {
  __scalar: true,
} as const satisfies LevrFactoryGenqlSelection

// ============================================================================
// Query/Subscription Field Builders
// ============================================================================

/**
 * Get fields for querying the factory config by chainId
 * Factory config is stored with chainId as the primary key
 */
export const getLevrFactoryFields = (chainId: number) => {
  return {
    LevrFactory_by_pk: {
      __args: {
        id: chainId.toString(),
      },
      ...levrFactoryFields,
    },
  }
}

// ============================================================================
// Types
// ============================================================================

type LevrFactoryFields = ReturnType<typeof getLevrFactoryFields>
export type LevrFactoryQueryFields = LevrFactoryFields & GraphQLQueryArgs
export type LevrFactoryResult = GraphQLQueryResult<LevrFactoryQueryFields>
export type LevrFactoryData = NonNullable<LevrFactoryResult['LevrFactory_by_pk']>
