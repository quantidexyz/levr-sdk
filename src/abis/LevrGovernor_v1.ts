export default [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'factory_',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'treasury_',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'staking_',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'stakedToken_',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'underlying_',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'trustedForwarder',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'activeProposalCount',
    inputs: [
      {
        name: 'proposalType',
        type: 'uint8',
        internalType: 'enum ILevrGovernor_v1.ProposalType',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'currentCycleId',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'execute',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'factory',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getProposal',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct ILevrGovernor_v1.Proposal',
        components: [
          {
            name: 'id',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'proposalType',
            type: 'uint8',
            internalType: 'enum ILevrGovernor_v1.ProposalType',
          },
          {
            name: 'proposer',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'amount',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'recipient',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'description',
            type: 'string',
            internalType: 'string',
          },
          {
            name: 'createdAt',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'votingStartsAt',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'votingEndsAt',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'yesVotes',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'noVotes',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'totalBalanceVoted',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'executed',
            type: 'bool',
            internalType: 'bool',
          },
          {
            name: 'cycleId',
            type: 'uint256',
            internalType: 'uint256',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getProposalsForCycle',
    inputs: [
      {
        name: 'cycleId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getVoteReceipt',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'voter',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct ILevrGovernor_v1.VoteReceipt',
        components: [
          {
            name: 'hasVoted',
            type: 'bool',
            internalType: 'bool',
          },
          {
            name: 'support',
            type: 'bool',
            internalType: 'bool',
          },
          {
            name: 'votes',
            type: 'uint256',
            internalType: 'uint256',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getVotingPowerSnapshot',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'user',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getWinner',
    inputs: [
      {
        name: 'cycleId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isTrustedForwarder',
    inputs: [
      {
        name: 'forwarder',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'meetsApproval',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'meetsQuorum',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'proposeBoost',
    inputs: [
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'proposeTransfer',
    inputs: [
      {
        name: 'recipient',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'description',
        type: 'string',
        internalType: 'string',
      },
    ],
    outputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'stakedToken',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'staking',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'startNewCycle',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'state',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint8',
        internalType: 'enum ILevrGovernor_v1.ProposalState',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'treasury',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'trustedForwarder',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'underlying',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'vote',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'support',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'CycleStarted',
    inputs: [
      {
        name: 'cycleId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'proposalWindowStart',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'proposalWindowEnd',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'votingWindowEnd',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'ProposalCreated',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'proposer',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'proposalType',
        type: 'uint8',
        indexed: false,
        internalType: 'enum ILevrGovernor_v1.ProposalType',
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'recipient',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
      {
        name: 'description',
        type: 'string',
        indexed: false,
        internalType: 'string',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'ProposalDefeated',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'ProposalExecuted',
    inputs: [
      {
        name: 'proposalId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'executor',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'VoteCast',
    inputs: [
      {
        name: 'voter',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'proposalId',
        type: 'uint256',
        indexed: true,
        internalType: 'uint256',
      },
      {
        name: 'support',
        type: 'bool',
        indexed: false,
        internalType: 'bool',
      },
      {
        name: 'votes',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'AlreadyExecuted',
    inputs: [],
  },
  {
    type: 'error',
    name: 'AlreadyVoted',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InsufficientStake',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidAmount',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidProposalType',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidRecipient',
    inputs: [],
  },
  {
    type: 'error',
    name: 'MaxProposalsReached',
    inputs: [],
  },
  {
    type: 'error',
    name: 'NoActiveCycle',
    inputs: [],
  },
  {
    type: 'error',
    name: 'NotAuthorized',
    inputs: [],
  },
  {
    type: 'error',
    name: 'NotWinner',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ProposalNotSucceeded',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ProposalWindowClosed',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ReentrancyGuardReentrantCall',
    inputs: [],
  },
  {
    type: 'error',
    name: 'VotingNotActive',
    inputs: [],
  },
] as const
