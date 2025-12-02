import type { Address } from 'viem'

// ============================================================
// ELIGIBLE USERS TYPES
// ============================================================

export type ProjectDeployer = {
  clankerToken: Address
  tokenName: string
  tokenSymbol: string
  originalAdmin: Address
}

export type Staker = {
  address: Address
  clankerToken: Address
  tokenName: string
  tokenSymbol: string
  stakedBalance: string
  stakedBalanceRaw: string // String for JSON serialization
  votingPower: string
}

export type DaoParticipant = {
  address: Address
  clankerToken: Address
  tokenSymbol: string
  proposalsCreated: number
  votesCast: number
}

export type UserScore = {
  address: Address
  deploymentsCount: number
  stakingPositionsCount: number
  proposalsCreatedCount: number
  votesCastCount: number
  totalParticipation: number
  scorePercentage: string
}

export type EligibleUsers = {
  chainId: number
  factoryAddress: Address
  timestamp: string
  deployers: ProjectDeployer[]
  stakers: Staker[]
  daoParticipants: DaoParticipant[]
  summary: {
    totalProjects: number
    uniqueDeployers: number
    uniqueStakers: number
    uniqueDaoParticipants: number
    totalStakedBalanceByToken: Record<string, string>
    totalUniqueUsers: number
    userScores: UserScore[]
  }
}

// ============================================================
// AIRDROP DISTRIBUTION TYPES
// ============================================================

export type AirdropAllocation = {
  recipient: Address
  amount: bigint
  amountFormatted: string
  percentage: string
}

export type AirdropSimulationResult = {
  success: boolean
  allocations: AirdropAllocation[]
  totalAmount: string
  tokenAddress: Address
  tokenSymbol: string
  tokenDecimals: number
  senderBalance: string
  senderBalanceAfter: string
  errors: string[]
}

export type AirdropExecutionResult = AirdropSimulationResult & {
  transactionHash: string
  blockNumber: string
  gasUsed: string
  status: 'success' | 'reverted'
}

// ============================================================
// CONTRACT ABIS
// ============================================================

// Inline ABI for getProjects - testnet version without verified boolean
export const getProjectsAbi = [
  {
    type: 'function',
    name: 'getProjects',
    inputs: [
      { name: 'offset', type: 'uint256', internalType: 'uint256' },
      { name: 'limit', type: 'uint256', internalType: 'uint256' },
    ],
    outputs: [
      {
        name: 'projects',
        type: 'tuple[]',
        internalType: 'struct ILevrFactory_v1.ProjectInfo[]',
        components: [
          { name: 'clankerToken', type: 'address', internalType: 'address' },
          {
            name: 'project',
            type: 'tuple',
            internalType: 'struct ILevrFactory_v1.Project',
            components: [
              { name: 'treasury', type: 'address', internalType: 'address' },
              { name: 'governor', type: 'address', internalType: 'address' },
              { name: 'staking', type: 'address', internalType: 'address' },
              { name: 'stakedToken', type: 'address', internalType: 'address' },
            ],
          },
        ],
      },
      { name: 'total', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
] as const
