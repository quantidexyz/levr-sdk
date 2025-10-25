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

### `claimAirdrop(recipient)`

Claim airdrop for a single recipient.

```typescript
import { getAirdropStatus } from 'levr-sdk'

// First fetch airdrop status
const airdropStatus = await getAirdropStatus(
  publicClient,
  projectData.token.address,
  projectData.treasury,
  projectData.token.decimals,
  null, // or tokenUsdPrice
  'https://your-app.com/api/ipfs-search',
  'https://your-app.com/api/ipfs-json'
)

if (!airdropStatus) {
  console.log('No airdrop found')
  return
}

// Claim treasury airdrop
const treasuryRecipient = airdropStatus.recipients.find((r) => r.isTreasury)
if (treasuryRecipient?.isAvailable) {
  const receipt = await governance.claimAirdrop(treasuryRecipient)
  console.log('Claimed airdrop:', receipt.transactionHash)
}
```

**Parameters:**

- `recipient` (required): Airdrop recipient from `getAirdropStatus().recipients`

**Returns:** `TransactionReceipt`

### `claimAirdropBatch(recipients)`

Claim airdrops for multiple recipients in a single transaction.

```typescript
import { getAirdropStatus } from 'levr-sdk'

const airdropStatus = await getAirdropStatus(/* ... */)

if (!airdropStatus) return

// Filter available recipients
const availableRecipients = airdropStatus.recipients.filter((r) => r.isAvailable)

if (availableRecipients.length > 0) {
  const receipt = await governance.claimAirdropBatch(availableRecipients)
  console.log('Claimed', availableRecipients.length, 'airdrops:', receipt.transactionHash)
}
```

**Parameters:**

- `recipients` (required): Array of airdrop recipients from `getAirdropStatus().recipients`

**Returns:** `TransactionReceipt`

**Notes:**

- Single recipient: Direct claim transaction
- Multiple recipients: Uses forwarder multicall for batch execution
- Each recipient must have valid proof and be available
- Validates availability before claiming
- Throws error if any recipient has errors or is not available
