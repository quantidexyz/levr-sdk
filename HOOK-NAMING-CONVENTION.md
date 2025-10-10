# Hook Naming Convention

## Pattern Overview

Clean, consistent naming across all hooks with clear separation between internal and public APIs.

## Internal Hooks (Used by Provider)

Internal hooks contain query logic and are used by `LevrProvider`. They have a `Query` or `Queries` suffix:

| Hook                   | File                   | Purpose                   |
| ---------------------- | ---------------------- | ------------------------- |
| `useProjectQuery`      | `use-project.ts`       | Project data query        |
| `useBalanceQuery`      | `use-balance.ts`       | Token balances query      |
| `useClankerTokenQuery` | `use-clanker.ts`       | Token metadata query      |
| `useStakingQueries`    | `use-stake.ts`         | All staking queries       |
| `useGovernanceQueries` | `use-governance.ts`    | Global governance queries |
| `useProposalsQuery`    | `use-proposals.ts`     | Proposals list query      |
| `useFeeReceiversQuery` | `use-fee-receivers.ts` | Fee receivers query       |

## Public Hooks (Exported from `hook/index.ts`)

### Simple Context Accessors (One-liner exports)

For query-only hooks with no mutations:

```typescript
export const useProject = () => useLevrContext().project
export const useBalance = () => useLevrContext().balances
export const useProposals = () => useLevrContext().proposals
export const useClankerToken = () => useLevrContext().tokenData
```

### Complex Hooks (Queries + Mutations)

For hooks that include both queries and mutations:

| Hook              | Returns                               | Usage                     |
| ----------------- | ------------------------------------- | ------------------------- |
| `useStake`        | Staking queries + mutations           | All staking operations    |
| `useSwap`         | Balance queries + swap mutation       | Swap operations           |
| `useGovernance`   | Governance queries + mutations        | All governance operations |
| `useFeeReceivers` | Fee receivers query + update mutation | Fee receiver management   |

### Utility Hooks

| Hook                 | Returns              | Usage                       |
| -------------------- | -------------------- | --------------------------- |
| `useClanker`         | Clanker SDK instance | For deploying tokens        |
| `useSetClankerToken` | Setter function      | Update global token context |
| `useLevrRefetch`     | Refetch methods      | Manual refetch control      |

## Usage Examples

### Simple Query Hook

```typescript
import { useProject, useBalance, useClankerToken } from 'levr-sdk/client'

function MyComponent() {
  const { data: project } = useProject()
  const { data: balances } = useBalance()
  const { data: tokenData } = useClankerToken()

  return <div>{project?.token.name}</div>
}
```

### Complex Hook (Query + Mutation)

```typescript
import { useStake, useFeeReceivers } from 'levr-sdk/client'

function MyComponent() {
  // Hook returns both query and mutations
  const { stake, allowance, balances } = useStake({
    onStakeSuccess: () => toast.success('Staked!')
  })

  // Hook returns both query and mutation
  const { query: feeReceivers, mutate: updateFeeReceiver } = useFeeReceivers({
    onSuccess: (hash) => console.log('Updated:', hash)
  })

  return (
    <button onClick={() => stake.mutate(amount)}>
      Stake
    </button>
  )
}
```

### Dynamic Token Management

```typescript
import { useSetClankerToken } from 'levr-sdk/client'

function ProjectPage({ clankerToken }) {
  const setClankerToken = useSetClankerToken()

  useEffect(() => {
    setClankerToken(clankerToken) // Updates global context
  }, [clankerToken, setClankerToken])
}
```

## Naming Rules

1. **Internal query hooks**: Add `Query` or `Queries` suffix
2. **Public query-only hooks**: Use base name, export as one-liner
3. **Public hooks with mutations**: Use base name, include both query + mutations
4. **Mutation-only hooks**: Add `Mutation` suffix (if needed separately)
5. **Utility hooks**: Descriptive names like `useSetClankerToken`, `useLevrRefetch`

## Benefits

✅ **Clear Distinction** - Internal vs public hooks obvious from name  
✅ **No Conflicts** - Query and public versions have different names  
✅ **Easy Discovery** - Pattern is predictable and consistent  
✅ **Self-Documenting** - Names clearly indicate what hooks return  
✅ **Clean Imports** - Simple to use from `levr-sdk/client`

## Complete Export Map

```typescript
// From levr-sdk/client

// Simple query accessors (one-liner)
useProject() // Project data
useBalance() // Token balances
useProposals() // Proposals list
useClankerToken() // Token metadata

// Complex hooks (queries + mutations)
useStake() // Staking queries + stake/unstake/claim mutations
useSwap() // Balance queries + swap mutation
useGovernance() // Governance queries + propose/vote/execute mutations
useFeeReceivers() // Fee receivers query + update mutation

// Utility hooks
useClanker() // Clanker SDK instance (for deployment)
useSetClankerToken() // Update global token
useLevrRefetch() // Manual refetch control

// Other hooks (not in context)
useDeploy()
usePrepare()
useProjects()
useRegister()
```

This convention makes the API intuitive and maintainable! 🎯
