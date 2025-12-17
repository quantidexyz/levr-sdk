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
 * Get fields for querying the factory config singleton
 * Factory config is stored as a singleton with id "1"
 */
export const getLevrFactoryFields = () => {
  return {
    LevrFactory_by_pk: {
      __args: {
        id: '1',
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
