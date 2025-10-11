# useGovernance

Governance operations including proposals and voting.

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

    // Queries
    currentCycleId,
    addresses,
    airdropStatus,
    proposal,

    // Convenience
    treasuryAddress,
    isAirdropAvailable,

    // Loading states
    isProposing,
    isVoting,
    isExecuting,
  } = useGovernance({
    onVoteSuccess: (receipt) => {
      console.log('Voted!', receipt)
    },
    onExecuteProposalSuccess: (receipt) => {
      console.log('Executed!', receipt)
    },
  })

  const handleProposeTransfer = () => {
    proposeTransfer.mutate({
      recipient: '0x...',
      amount: parseUnits('1000', 18),
      description: 'Fund development team',
    })
  }

  const handleVote = (proposalId: bigint, support: boolean) => {
    vote.mutate({ proposalId, support })
  }

  return (
    <div>
      <h2>Governance</h2>

      <p>Current Cycle: {currentCycleId?.toString()}</p>
      <p>Treasury: {treasuryAddress}</p>

      {isAirdropAvailable && (
        <button onClick={() => claimAirdrop.mutate()}>
          Claim Airdrop
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

- `onVoteSuccess`: Callback after successful vote
- `onExecuteProposalSuccess`: Callback after successful execution
- `onProposeSuccess`: Callback after successful proposal

## Mutations

- `proposeTransfer.mutate({ recipient, amount, description })`: Propose a treasury transfer
- `proposeBoost.mutate({ amount, description })`: Propose staking boost
- `vote.mutate({ proposalId, support })`: Vote on a proposal
- `executeProposal.mutate(proposalId)`: Execute a passed proposal
- `claimAirdrop.mutate()`: Claim airdrop tokens
