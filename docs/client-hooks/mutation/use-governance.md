# useGovernance

Governance operations including proposals and voting. All data comes from context.

## Usage

```typescript
import { useGovernance } from 'levr-sdk/client'

function GovernanceInterface() {
  const {
    // Mutations
    proposeTransfer,
    proposeBoost,
    vote,
    executeProposal,
    claimAirdrop,

    // Helpers
    buildProposeTransferConfig,
    buildProposeBoostConfig,
    buildExecuteProposalConfig,

    // Loading states
    isReady,
    isProposing,
    isVoting,
    isExecuting,
    isClaiming,
  } = useGovernance({
    proposalId: 123n, // Optional: for dynamic proposal query
    cycleId: 5n, // Optional: for cycle proposals
    onVoteSuccess: (receipt) => {
      console.log('Voted!', receipt)
    },
    onExecuteProposalSuccess: (receipt) => {
      console.log('Executed!', receipt)
    },
  })

  const handleProposeTransfer = () => {
    const config = buildProposeTransferConfig({
      recipient: '0x...',
      amount: '1000',
      description: 'Fund development team',
    })
    proposeTransfer.mutate(config)
  }

  const handleVote = (proposalId: bigint, support: boolean) => {
    vote.mutate({ proposalId, support })
  }

  // Get data from context
  const { data: user } = useUser()
  const { data: project } = useProject()

  return (
    <div>
      <h2>Governance</h2>
      <p>Current Cycle: {project?.governanceStats?.currentCycleId.toString()}</p>
      <p>Treasury: {project?.treasury}</p>
      <p>Your Voting Power: {user?.votingPower.formatted}</p>

      {project?.airdrop?.isAvailable && (
        <button onClick={() => claimAirdrop.mutate()} disabled={isClaiming}>
          Claim {project.airdrop.availableAmount.formatted} Tokens
        </button>
      )}

      <button onClick={handleProposeTransfer} disabled={isProposing}>
        Propose Transfer
      </button>
    </div>
  )
}
```

## Options

**Query parameters (optional):**

- `proposalId`: Proposal ID for dynamic proposal query
- `cycleId`: Cycle ID for cycle proposals query
- `userAddress`: Custom user address for vote receipts

**Callback parameters (optional):**

- `onProposeTransferSuccess`: Callback after successful transfer proposal
- `onProposeBoostSuccess`: Callback after successful boost proposal
- `onVoteSuccess`: Callback after successful vote
- `onExecuteProposalSuccess`: Callback after successful execution
- `onClaimAirdropSuccess`: Callback after successful airdrop claim

## Mutations

- `proposeTransfer.mutate(config)`: Propose a treasury transfer
- `proposeBoost.mutate(config)`: Propose staking boost
- `vote.mutate({ proposalId, support })`: Vote on a proposal
- `executeProposal.mutate(config)`: Execute a passed proposal
- `claimAirdrop.mutate()`: Claim airdrop tokens

## Data Access

All governance data comes from `user` and `project` context:

```typescript
import { useUser, useProject } from 'levr-sdk/client'

const { data: user } = useUser()
const { data: project } = useProject()

// From project context
project?.governanceStats?.currentCycleId // Current governance cycle
project?.governanceStats?.activeProposalCount.transfer // Active transfers
project?.governanceStats?.activeProposalCount.boost // Active boosts
project?.governor // Governor contract address
project?.treasury // Treasury contract address
project?.factory // Factory contract address
project?.airdrop // Treasury airdrop status

// From user context
user?.votingPower // User's voting power (token-days)
```
