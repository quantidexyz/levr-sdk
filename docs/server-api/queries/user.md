# getUser()

Get all user-specific data including balances, staking, and voting power.

## Usage

```typescript
import { getUser, getStaticProject, getProject } from 'levr-sdk'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

// First get project data (user query needs it)
const staticProject = await getStaticProject({
  publicClient,
  clankerToken: '0x...',
})

if (!staticProject?.isRegistered) {
  throw new Error('Project not registered')
}

const projectData = await getProject({
  publicClient,
  staticProject,
})

if (!projectData) {
  throw new Error('Project not found')
}

// Then get user data
const userData = await getUser({
  publicClient,
  userAddress: '0x...',
  project: projectData,
})

console.log('Token Balance:', userData.balances.token.formatted)
console.log('Paired Token Balance:', userData.balances.pairedToken.formatted)
console.log('Staked:', userData.staking.stakedBalance.formatted)
console.log('Voting Power (Token Days):', userData.votingPower)
console.log('Claimable Rewards:', userData.staking.claimableRewards.staking.formatted)
```

## Parameters

- `publicClient` (required): Viem public client
- `userAddress` (required): User address to fetch data for
- `project` (required): Project data from `getProject()`

## Returns

```typescript
{
  balances: {
    token: BalanceResult
    pairedToken: BalanceResult
    nativeEth?: BalanceResult // Only present when pairedToken.isNative (e.g., WETH)
  }
  staking: {
    stakedBalance: BalanceResult
    allowance: BalanceResult
    claimableRewards: {
      staking: BalanceResult
      pairedToken: BalanceResult | null
    }
  }
  votingPower: string
}
```

## Notes

- All data fetched in a single multicall for efficiency
- USD values included if pricing is available in project
- Requires project data for token decimals, addresses, and pricing
- Pool-level stats (APR, total staked, outstanding rewards) are in `project.stakingStats`
- `nativeEth` balance is only included when the paired token is native (e.g., WETH on Base)
