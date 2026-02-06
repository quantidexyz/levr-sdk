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
    claimAirdropBatch,

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
  const { data: airdrop } = useAirdropStatus()

  // Find treasury airdrop
  const treasuryRecipient = airdrop?.recipients.find(r => r.isTreasury)

  return (
    <div>
      <h2>Governance</h2>
      <p>Current Cycle: {project?.governanceStats?.currentCycleId.toString()}</p>
      <p>Treasury: {project?.treasury}</p>
      <p>Your Voting Power: {user?.votingPower} Token Days</p>

      {treasuryRecipient?.isAvailable && (
        <button onClick={() => claimAirdrop.mutate(treasuryRecipient)} disabled={isClaiming}>
          Claim {treasuryRecipient.availableAmount.formatted} Tokens
        </button>
      )}

      {/* Batch claim all available recipients */}
      {airdrop?.recipients.some(r => r.isAvailable) && (
        <button
          onClick={() => claimAirdropBatch.mutate(airdrop.recipients.filter(r => r.isAvailable))}
          disabled={isClaiming}
        >
          Claim All Available Airdrops
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
- `claimAirdrop.mutate(recipient)`: Claim airdrop for a single recipient
- `claimAirdropBatch.mutate(recipients)`: Claim airdrops for multiple recipients in one transaction

## Data Access

All governance data comes from `user`, `project`, and `airdropStatus` context queries:

```typescript
import { useUser, useProject, useAirdropStatus } from 'levr-sdk/client'

const { data: user } = useUser()
const { data: project } = useProject()
const { data: airdrop } = useAirdropStatus()

// From project context
project?.governanceStats?.currentCycleId // Current governance cycle
project?.governanceStats?.activeProposalCount.transfer // Active transfers
project?.governanceStats?.activeProposalCount.boost // Active boosts
project?.governor // Governor contract address
project?.treasury // Treasury contract address
project?.factory // Factory contract address

// From user context
user?.votingPower // User's voting power in Token Days (string)

// From airdrop context (multi-recipient support)
airdrop?.recipients // Array of all recipients
airdrop?.recipients[0].isAvailable // Is this recipient available
airdrop?.recipients[0].availableAmount // Available amount for recipient
airdrop?.recipients[0].proof // Merkle proof for recipient
airdrop?.recipients.find((r) => r.isTreasury) // Find treasury recipient
```
