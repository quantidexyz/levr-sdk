// ============================================================================
// Airdrop Claim Field Definitions
// ============================================================================
// NOTE: These fields will be usable once the indexer schema is deployed
// and the GraphQL types are regenerated with `pnpm codegen:graphql`

/**
 * Fields for airdrop claim records
 */
export const levrAirdropClaimFields = {
  id: true,
  chainId: true,
  user: true,
  totalAmountClaimed: true,
  amountStillLocked: true,
  blockNumber: true,
  blockTimestamp: true,
  transactionHash: true,
  token: {
    address: true,
  },
} as const

// ============================================================================
// Query Field Builders
// ============================================================================

/**
 * Get fields for querying airdrop claims by token address
 * Returns all claims for a specific token
 */
export const getAirdropClaimsByTokenFields = (chainId: number, tokenAddress: string) => {
  return {
    LevrAirdropClaim: {
      __args: {
        where: {
          chainId: { _eq: chainId },
          token: { address: { _eq: tokenAddress.toLowerCase() } },
        },
      },
      ...levrAirdropClaimFields,
    },
  }
}

/**
 * Get fields for querying airdrop claims by user and token
 * Returns claims for a specific user on a specific token
 */
export const getAirdropClaimByUserAndTokenFields = (
  chainId: number,
  tokenAddress: string,
  userAddress: string
) => {
  const compositeId = `${chainId}-${tokenAddress.toLowerCase()}-${userAddress.toLowerCase()}`
  return {
    LevrAirdropClaim_by_pk: {
      __args: {
        id: compositeId,
      },
      ...levrAirdropClaimFields,
    },
  }
}
