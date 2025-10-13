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

    // Data from context
    user,
    project,
    currentCycleId,
    addresses,

    // Dynamic queries (optional)
    proposal, // Pass proposalId to params
    proposalsForCycle, // Pass cycleId to params

    // Convenience accessors
    userVotingPower,
    airdropStatusData,
    availableAirdropAmount,
    treasuryAddress,
    factoryAddress,

    // Loading states
    isProposing,
    isVoting,
    isExecuting,
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

  return (
    <div>
      <h2>Governance</h2>
      <p>Current Cycle: {currentCycleId?.data?.toString()}</p>
      <p>Treasury: {treasuryAddress}</p>
      <p>Your Voting Power: {userVotingPower?.formatted}</p>

      {airdropStatusData?.isAvailable && (
        <button onClick={() => claimAirdrop.mutate()}>
          Claim {availableAirdropAmount?.formatted} Tokens
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
// From project context
project.data?.currentCycleId // Current governance cycle
project.data?.governor // Governor contract address
project.data?.treasury // Treasury contract address
project.data?.factory // Factory contract address

// From user context
user.data?.governance.votingPower // User's voting power
user.data?.governance.airdrop // Airdrop status
```
