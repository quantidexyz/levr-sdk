export default [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'cfg',
        type: 'tuple',
        internalType: 'struct ILevrFactory_v1.FactoryConfig',
        components: [
          {
            name: 'protocolFeeBps',
            type: 'uint16',
            internalType: 'uint16',
          },
          {
            name: 'streamWindowSeconds',
            type: 'uint32',
            internalType: 'uint32',
          },
          {
            name: 'protocolTreasury',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'proposalWindowSeconds',
            type: 'uint32',
            internalType: 'uint32',
          },
          {
            name: 'votingWindowSeconds',
            type: 'uint32',
            internalType: 'uint32',
          },
          {
            name: 'maxActiveProposals',
            type: 'uint16',
            internalType: 'uint16',
          },
          {
            name: 'quorumBps',
            type: 'uint16',
            internalType: 'uint16',
          },
          {
            name: 'approvalBps',
            type: 'uint16',
            internalType: 'uint16',
          },
          {
            name: 'minSTokenBpsToSubmit',
            type: 'uint16',
            internalType: 'uint16',
          },
          {
            name: 'maxProposalAmountBps',
            type: 'uint16',
            internalType: 'uint16',
          },
          {
            name: 'minimumQuorumBps',
            type: 'uint16',
            internalType: 'uint16',
          },
          {
            name: 'maxRewardTokens',
            type: 'uint16',
            internalType: 'uint16',
          },
        ],
      },
      {
        name: 'owner_',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'trustedForwarder_',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'levrDeployer_',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'addTrustedClankerFactory',
    inputs: [
      {
        name: 'factory',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'approvalBps',
    inputs: [
      {
        name: 'clankerToken',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint16',
        internalType: 'uint16',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getClankerMetadata',
    inputs: [
      {
        name: 'clankerToken',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: 'metadata',
        type: 'tuple',
        internalType: 'struct ILevrFactory_v1.ClankerMetadata',
        components: [
          {
            name: 'feeLocker',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'lpLocker',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'hook',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'exists',
            type: 'bool',
            internalType: 'bool',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getProjectContracts',
    inputs: [
      {
        name: 'clankerToken',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: 'project',
        type: 'tuple',
        internalType: 'struct ILevrFactory_v1.Project',
        components: [
          {
            name: 'treasury',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'governor',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'staking',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'stakedToken',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'verified',
            type: 'bool',
            internalType: 'bool',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getProjects',
    inputs: [
      {
        name: 'offset',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'limit',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'projects',
        type: 'tuple[]',
        internalType: 'struct ILevrFactory_v1.ProjectInfo[]',
        components: [
          {
            name: 'clankerToken',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'project',
            type: 'tuple',
            internalType: 'struct ILevrFactory_v1.Project',
            components: [
              {
                name: 'treasury',
                type: 'address',
                internalType: 'address',
              },
              {
                name: 'governor',
                type: 'address',
                internalType: 'address',
              },
              {
                name: 'staking',
                type: 'address',
                internalType: 'address',
              },
              {
                name: 'stakedToken',
                type: 'address',
                internalType: 'address',
              },
              {
                name: 'verified',
                type: 'bool',
                internalType: 'bool',
              },
            ],
          },
        ],
      },
      {
        name: 'total',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTrustedClankerFactories',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address[]',
        internalType: 'address[]',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isTrustedClankerFactory',
    inputs: [
      {
        name: 'factory',
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
    name: 'levrDeployer',
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
    name: 'maxActiveProposals',
    inputs: [
      {
        name: 'clankerToken',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint16',
        internalType: 'uint16',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'maxProposalAmountBps',
    inputs: [
      {
        name: 'clankerToken',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint16',
        internalType: 'uint16',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'maxRewardTokens',
    inputs: [
      {
        name: 'clankerToken',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint16',
        internalType: 'uint16',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'minSTokenBpsToSubmit',
    inputs: [
      {
        name: 'clankerToken',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint16',
        internalType: 'uint16',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'minimumQuorumBps',
    inputs: [
      {
        name: 'clankerToken',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint16',
        internalType: 'uint16',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'owner',
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
    name: 'prepareForDeployment',
    inputs: [],
    outputs: [
      {
        name: 'treasury',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'staking',
        type: 'address',
        internalType: 'address',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'proposalWindowSeconds',
    inputs: [
      {
        name: 'clankerToken',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint32',
        internalType: 'uint32',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'protocolFeeBps',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint16',
        internalType: 'uint16',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'protocolTreasury',
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
    name: 'quorumBps',
    inputs: [
      {
        name: 'clankerToken',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint16',
        internalType: 'uint16',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'register',
    inputs: [
      {
        name: 'clankerToken',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: 'project',
        type: 'tuple',
        internalType: 'struct ILevrFactory_v1.Project',
        components: [
          {
            name: 'treasury',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'governor',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'staking',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'stakedToken',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'verified',
            type: 'bool',
            internalType: 'bool',
          },
        ],
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'removeTrustedClankerFactory',
    inputs: [
      {
        name: 'factory',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'renounceOwnership',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'streamWindowSeconds',
    inputs: [
      {
        name: 'clankerToken',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint32',
        internalType: 'uint32',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'transferOwnership',
    inputs: [
      {
        name: 'newOwner',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
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
    name: 'unverifyProject',
    inputs: [
      {
        name: 'clankerToken',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'updateConfig',
    inputs: [
      {
        name: 'cfg',
        type: 'tuple',
        internalType: 'struct ILevrFactory_v1.FactoryConfig',
        components: [
          {
            name: 'protocolFeeBps',
            type: 'uint16',
            internalType: 'uint16',
          },
          {
            name: 'streamWindowSeconds',
            type: 'uint32',
            internalType: 'uint32',
          },
          {
            name: 'protocolTreasury',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'proposalWindowSeconds',
            type: 'uint32',
            internalType: 'uint32',
          },
          {
            name: 'votingWindowSeconds',
            type: 'uint32',
            internalType: 'uint32',
          },
          {
            name: 'maxActiveProposals',
            type: 'uint16',
            internalType: 'uint16',
          },
          {
            name: 'quorumBps',
            type: 'uint16',
            internalType: 'uint16',
          },
          {
            name: 'approvalBps',
            type: 'uint16',
            internalType: 'uint16',
          },
          {
            name: 'minSTokenBpsToSubmit',
            type: 'uint16',
            internalType: 'uint16',
          },
          {
            name: 'maxProposalAmountBps',
            type: 'uint16',
            internalType: 'uint16',
          },
          {
            name: 'minimumQuorumBps',
            type: 'uint16',
            internalType: 'uint16',
          },
          {
            name: 'maxRewardTokens',
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
    name: 'updateProjectConfig',
    inputs: [
      {
        name: 'clankerToken',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'cfg',
        type: 'tuple',
        internalType: 'struct ILevrFactory_v1.ProjectConfig',
        components: [
          {
            name: 'streamWindowSeconds',
            type: 'uint32',
            internalType: 'uint32',
          },
          {
            name: 'proposalWindowSeconds',
            type: 'uint32',
            internalType: 'uint32',
          },
          {
            name: 'votingWindowSeconds',
            type: 'uint32',
            internalType: 'uint32',
          },
          {
            name: 'maxActiveProposals',
            type: 'uint16',
            internalType: 'uint16',
          },
          {
            name: 'quorumBps',
            type: 'uint16',
            internalType: 'uint16',
          },
          {
            name: 'approvalBps',
            type: 'uint16',
            internalType: 'uint16',
          },
          {
            name: 'minSTokenBpsToSubmit',
            type: 'uint16',
            internalType: 'uint16',
          },
          {
            name: 'maxProposalAmountBps',
            type: 'uint16',
            internalType: 'uint16',
          },
          {
            name: 'minimumQuorumBps',
            type: 'uint16',
            internalType: 'uint16',
          },
          {
            name: 'maxRewardTokens',
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
    name: 'verifyProject',
    inputs: [
      {
        name: 'clankerToken',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'votingWindowSeconds',
    inputs: [
      {
        name: 'clankerToken',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'uint32',
        internalType: 'uint32',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'ConfigUpdated',
    inputs: [],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'OwnershipTransferred',
    inputs: [
      {
        name: 'previousOwner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'newOwner',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'PreparationComplete',
    inputs: [
      {
        name: 'deployer',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'treasury',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'staking',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'ProjectConfigUpdated',
    inputs: [
      {
        name: 'clankerToken',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'ProjectUnverified',
    inputs: [
      {
        name: 'clankerToken',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'ProjectVerified',
    inputs: [
      {
        name: 'clankerToken',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'Registered',
    inputs: [
      {
        name: 'clankerToken',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'treasury',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'governor',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
      {
        name: 'staking',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
      {
        name: 'stakedToken',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'TrustedClankerFactoryAdded',
    inputs: [
      {
        name: 'factory',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'TrustedClankerFactoryRemoved',
    inputs: [
      {
        name: 'factory',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'OwnableInvalidOwner',
    inputs: [
      {
        name: 'owner',
        type: 'address',
        internalType: 'address',
      },
    ],
  },
  {
    type: 'error',
    name: 'OwnableUnauthorizedAccount',
    inputs: [
      {
        name: 'account',
        type: 'address',
        internalType: 'address',
      },
    ],
  },
  {
    type: 'error',
    name: 'ProjectNotFound',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ProjectNotVerified',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ReentrancyGuardReentrantCall',
    inputs: [],
  },
  {
    type: 'error',
    name: 'UnauthorizedCaller',
    inputs: [],
  },
] as const
