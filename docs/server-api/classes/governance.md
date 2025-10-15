# Governance Class

Manage governance operations including proposals, voting, and airdrop claims.

## Constructor

```typescript
import { Governance, getProject } from 'levr-sdk'

// First get project data
const projectData = await getProject({
  publicClient,
  clankerToken: '0x...',
})

// Then create governance instance
const governance = new Governance({
  wallet: walletClient,
  publicClient,
  project: projectData,
})
```

## Methods

### `proposeTransfer(recipient, amount, description)`

Propose a treasury transfer.

```typescript
import { parseUnits } from 'viem'

const { receipt, proposalId } = await governance.proposeTransfer(
  '0x...', // recipient
  parseUnits('1000', 18), // amount (can also be string or number)
  'Fund development team' // description
)

console.log('Proposal ID:', proposalId.toString())
console.log('Transaction:', receipt.transactionHash)
```

**Parameters:**

- `recipient` (required): Recipient address
- `amount` (required): Amount in wei (bigint, string, or number)
- `description` (required): Proposal description

**Returns:**

```typescript
{
  receipt: TransactionReceipt
  proposalId: bigint
}
```

### `proposeBoost(amount)`

Propose a staking reward boost from treasury.

```typescript
const { receipt, proposalId } = await governance.proposeBoost(
  parseUnits('500', 18) // amount to boost
)

console.log('Proposal ID:', proposalId.toString())
```

**Parameters:**

- `amount` (required): Amount in wei (bigint, string, or number)

**Returns:**

```typescript
{
  receipt: TransactionReceipt
  proposalId: bigint
}
```

### `vote(proposalId, support)`

Vote on a proposal.

```typescript
const receipt = await governance.vote(
  123n, // proposalId (can be bigint or number)
  true // support (true = yes, false = no)
)

console.log('Voted:', receipt.transactionHash)
```

**Parameters:**

- `proposalId` (required): Proposal ID (bigint or number)
- `support` (required): Vote direction (true = yes, false = no)

**Returns:** `TransactionReceipt`

### `executeProposal(proposalId)`

Execute a passed proposal.

```typescript
const receipt = await governance.executeProposal(123n)
console.log('Executed:', receipt.transactionHash)
```

**Parameters:**

- `proposalId` (required): Proposal ID (bigint or number)

**Returns:** `TransactionReceipt`

### `getVoteReceipt(proposalId, voter?)`

Get vote receipt for a user on a proposal.

```typescript
const receipt = await governance.getVoteReceipt(
  123n, // proposalId
  '0x...' // voter (optional, defaults to wallet address)
)

console.log('Has Voted:', receipt.hasVoted)
console.log('Support:', receipt.support ? 'Yes' : 'No')
console.log('Votes:', receipt.votes.toString())
```

**Parameters:**

- `proposalId` (required): Proposal ID (bigint or number)
- `voter` (optional): Voter address (defaults to wallet account address)

**Returns:**

```typescript
{
  hasVoted: boolean
  support: boolean
  votes: bigint
}
```

### `claimAirdrop(airdropStatus)`

Claim treasury airdrop.

```typescript
import { getTreasuryAirdropStatus } from 'levr-sdk'

// First fetch airdrop status
const airdropStatus = await getTreasuryAirdropStatus(
  publicClient,
  projectData.token.address,
  projectData.treasury,
  projectData.token.decimals,
  null // or tokenUsdPrice
)

if (airdropStatus?.isAvailable) {
  const receipt = await governance.claimAirdrop(airdropStatus)
  console.log('Claimed airdrop:', receipt.transactionHash)
}
```

**Parameters:**

- `airdropStatus` (required): Airdrop status from `getTreasuryAirdropStatus()`

**Returns:** `TransactionReceipt`

**Notes:**

- Requires airdrop status to be fetched first using `getTreasuryAirdropStatus()`
- Validates airdrop availability before claiming
- Throws error if airdrop has errors or is not available
