# Governance Class

Manage governance operations.

## Constructor

```typescript
import { Governance } from 'levr-sdk'

const governance = new Governance({
  wallet: walletClient,
  publicClient,
  governorAddress: '0x...',
  tokenDecimals: 18,
  clankerToken: '0x...',
})
```

## Methods

### `getCurrentCycleId()`

Get the current governance cycle ID.

```typescript
const cycleId = await governance.getCurrentCycleId()
console.log('Current Cycle:', cycleId.toString())
```

### `getTreasury()`

Get the treasury address.

```typescript
const treasury = await governance.getTreasury()
console.log('Treasury:', treasury)
```

### `getAddresses(params?)`

Get all governance-related addresses with optional USD values.

```typescript
const addresses = await governance.getAddresses({
  pricing: { wethUsd: '2543.21', tokenUsd: '0.05' },
})

console.log('Treasury:', addresses.treasury.address)
console.log('Balance:', addresses.treasury.balance.formatted, 'Tokens')
console.log('USD Value:', addresses.treasury.balance.usd, 'USD')
```

**Parameters:**

- `pricing` (optional): USD pricing for balance calculations

**Returns:**

```typescript
{
  treasury: {
    address: `0x${string}`
    balance: {
      raw: bigint
      formatted: string
      usd?: string
    }
  }
  weth: `0x${string}`
}
```

### `getAirdropStatus()`

Check if airdrop is available for the user.

```typescript
const status = await governance.getAirdropStatus()
console.log('Airdrop Available:', status.available)
console.log('Amount:', status.amount ? formatUnits(status.amount, 18) : '0')
```

**Returns:**

```typescript
{
  available: boolean
  amount?: bigint
}
```

### `proposeTransfer(recipient, amount, description)`

Propose a treasury transfer.

```typescript
const { receipt, proposalId } = await governance.proposeTransfer(
  '0x...', // recipient
  parseUnits('1000', 18), // amount
  'Fund development team' // description
)

console.log('Proposal ID:', proposalId.toString())
console.log('Transaction:', receipt.transactionHash)
```

**Returns:**

```typescript
{
  receipt: TransactionReceipt
  proposalId: bigint
}
```

### `proposeBoost(rewardIndex, amount, description)`

Propose a staking reward boost.

```typescript
const { receipt, proposalId } = await governance.proposeBoost(
  0, // rewardIndex (0 = WETH)
  parseUnits('500', 18), // amount
  'Boost WETH rewards' // description
)

console.log('Proposal ID:', proposalId.toString())
```

### `vote(proposalId, support)`

Vote on a proposal.

```typescript
const receipt = await governance.vote(
  123n, // proposalId
  true // support (true = for, false = against)
)

console.log('Voted:', receipt.transactionHash)
```

### `executeProposal(proposalId)`

Execute a passed proposal.

```typescript
const receipt = await governance.executeProposal(123n)
console.log('Executed:', receipt.transactionHash)
```

### `claimAirdrop()`

Claim airdrop tokens.

```typescript
const receipt = await governance.claimAirdrop()
console.log('Claimed airdrop:', receipt.transactionHash)
```
