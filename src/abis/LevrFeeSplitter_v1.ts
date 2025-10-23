export default [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'clankerToken_',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'factory_',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'trustedForwarder_',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'clankerToken',
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
    name: 'configureSplits',
    inputs: [
      {
        name: 'splits',
        type: 'tuple[]',
        internalType: 'struct ILevrFeeSplitter_v1.SplitConfig[]',
        components: [
          {
            name: 'receiver',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'bps',
            type: 'uint16',
            internalType: 'uint16',
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'distribute',
    inputs: [
      {
        name: 'rewardToken',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'distributeBatch',
    inputs: [
      {
        name: 'rewardTokens',
        type: 'address[]',
        internalType: 'address[]',
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
    name: 'getDistributionState',
    inputs: [
      {
        name: 'rewardToken',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: 'state',
        type: 'tuple',
        internalType: 'struct ILevrFeeSplitter_v1.DistributionState',
        components: [
          {
            name: 'totalDistributed',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'lastDistribution',
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
    name: 'getSplits',
    inputs: [],
    outputs: [
      {
        name: 'splits',
        type: 'tuple[]',
        internalType: 'struct ILevrFeeSplitter_v1.SplitConfig[]',
        components: [
          {
            name: 'receiver',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'bps',
            type: 'uint16',
            internalType: 'uint16',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getStakingAddress',
    inputs: [],
    outputs: [
      {
        name: 'staking',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTotalBps',
    inputs: [],
    outputs: [
      {
        name: 'totalBps',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isSplitsConfigured',
    inputs: [],
    outputs: [
      {
        name: 'configured',
        type: 'bool',
        internalType: 'bool',
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
    name: 'pendingFees',
    inputs: [
      {
        name: 'rewardToken',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: 'pending',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'pendingFeesInclBalance',
    inputs: [
      {
        name: 'rewardToken',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: 'pending',
        type: 'uint256',
        internalType: 'uint256',
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
    type: 'event',
    name: 'AutoAccrualFailed',
    inputs: [
      {
        name: 'clankerToken',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'token',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'AutoAccrualSuccess',
    inputs: [
      {
        name: 'clankerToken',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'token',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Distributed',
    inputs: [
      {
        name: 'clankerToken',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'token',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'totalAmount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'FeeDistributed',
    inputs: [
      {
        name: 'clankerToken',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'token',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'receiver',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SplitsConfigured',
    inputs: [
      {
        name: 'clankerToken',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'splits',
        type: 'tuple[]',
        indexed: false,
        internalType: 'struct ILevrFeeSplitter_v1.SplitConfig[]',
        components: [
          {
            name: 'receiver',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'bps',
            type: 'uint16',
            internalType: 'uint16',
          },
        ],
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'StakingDistribution',
    inputs: [
      {
        name: 'clankerToken',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'token',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'ClankerMetadataNotFound',
    inputs: [],
  },
  {
    type: 'error',
    name: 'DuplicateStakingReceiver',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidSplits',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidTotalBps',
    inputs: [],
  },
  {
    type: 'error',
    name: 'LpLockerNotConfigured',
    inputs: [],
  },
  {
    type: 'error',
    name: 'NoPendingFees',
    inputs: [],
  },
  {
    type: 'error',
    name: 'NoReceivers',
    inputs: [],
  },
  {
    type: 'error',
    name: 'OnlyTokenAdmin',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ProjectNotRegistered',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ReentrancyGuardReentrantCall',
    inputs: [],
  },
  {
    type: 'error',
    name: 'SafeERC20FailedOperation',
    inputs: [
      {
        name: 'token',
        type: 'address',
        internalType: 'address',
      },
    ],
  },
  {
    type: 'error',
    name: 'SplitsNotConfigured',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ZeroAddress',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ZeroBps',
    inputs: [],
  },
] as const
