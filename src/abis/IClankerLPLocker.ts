export default [
  {
    type: 'function',
    name: 'collectRewards',
    inputs: [
      {
        name: 'token',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'collectRewardsWithoutUnlock',
    inputs: [
      {
        name: 'token',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'placeLiquidity',
    inputs: [
      {
        name: 'lockerConfig',
        type: 'tuple',
        internalType: 'struct IClanker.LockerConfig',
        components: [
          {
            name: 'locker',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'rewardAdmins',
            type: 'address[]',
            internalType: 'address[]',
          },
          {
            name: 'rewardRecipients',
            type: 'address[]',
            internalType: 'address[]',
          },
          {
            name: 'rewardBps',
            type: 'uint16[]',
            internalType: 'uint16[]',
          },
          {
            name: 'tickLower',
            type: 'int24[]',
            internalType: 'int24[]',
          },
          {
            name: 'tickUpper',
            type: 'int24[]',
            internalType: 'int24[]',
          },
          {
            name: 'positionBps',
            type: 'uint16[]',
            internalType: 'uint16[]',
          },
          {
            name: 'lockerData',
            type: 'bytes',
            internalType: 'bytes',
          },
        ],
      },
      {
        name: 'poolConfig',
        type: 'tuple',
        internalType: 'struct IClanker.PoolConfig',
        components: [
          {
            name: 'hook',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'pairedToken',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'tickIfToken0IsClanker',
            type: 'int24',
            internalType: 'int24',
          },
          {
            name: 'tickSpacing',
            type: 'int24',
            internalType: 'int24',
          },
          {
            name: 'poolData',
            type: 'bytes',
            internalType: 'bytes',
          },
        ],
      },
      {
        name: 'poolKey',
        type: 'tuple',
        internalType: 'struct PoolKey',
        components: [
          {
            name: 'currency0',
            type: 'address',
            internalType: 'Currency',
          },
          {
            name: 'currency1',
            type: 'address',
            internalType: 'Currency',
          },
          {
            name: 'fee',
            type: 'uint24',
            internalType: 'uint24',
          },
          {
            name: 'tickSpacing',
            type: 'int24',
            internalType: 'int24',
          },
          {
            name: 'hooks',
            type: 'address',
            internalType: 'contract IHooks',
          },
        ],
      },
      {
        name: 'poolSupply',
        type: 'uint256',
        internalType: 'uint256',
      },
      {
        name: 'token',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: 'tokenId',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'supportsInterface',
    inputs: [
      {
        name: 'interfaceId',
        type: 'bytes4',
        internalType: 'bytes4',
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
    name: 'tokenRewards',
    inputs: [
      {
        name: 'token',
        type: 'address',
        internalType: 'address',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct IClankerLpLocker.TokenRewardInfo',
        components: [
          {
            name: 'token',
            type: 'address',
            internalType: 'address',
          },
          {
            name: 'poolKey',
            type: 'tuple',
            internalType: 'struct PoolKey',
            components: [
              {
                name: 'currency0',
                type: 'address',
                internalType: 'Currency',
              },
              {
                name: 'currency1',
                type: 'address',
                internalType: 'Currency',
              },
              {
                name: 'fee',
                type: 'uint24',
                internalType: 'uint24',
              },
              {
                name: 'tickSpacing',
                type: 'int24',
                internalType: 'int24',
              },
              {
                name: 'hooks',
                type: 'address',
                internalType: 'contract IHooks',
              },
            ],
          },
          {
            name: 'positionId',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'numPositions',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'rewardBps',
            type: 'uint16[]',
            internalType: 'uint16[]',
          },
          {
            name: 'rewardAdmins',
            type: 'address[]',
            internalType: 'address[]',
          },
          {
            name: 'rewardRecipients',
            type: 'address[]',
            internalType: 'address[]',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'ClaimedRewards',
    inputs: [
      {
        name: 'token',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'amount0',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'amount1',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'rewards0',
        type: 'uint256[]',
        indexed: false,
        internalType: 'uint256[]',
      },
      {
        name: 'rewards1',
        type: 'uint256[]',
        indexed: false,
        internalType: 'uint256[]',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'TokenRewardAdded',
    inputs: [
      {
        name: 'token',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
      {
        name: 'poolKey',
        type: 'tuple',
        indexed: false,
        internalType: 'struct PoolKey',
        components: [
          {
            name: 'currency0',
            type: 'address',
            internalType: 'Currency',
          },
          {
            name: 'currency1',
            type: 'address',
            internalType: 'Currency',
          },
          {
            name: 'fee',
            type: 'uint24',
            internalType: 'uint24',
          },
          {
            name: 'tickSpacing',
            type: 'int24',
            internalType: 'int24',
          },
          {
            name: 'hooks',
            type: 'address',
            internalType: 'contract IHooks',
          },
        ],
      },
      {
        name: 'poolSupply',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'positionId',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'numPositions',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'rewardBps',
        type: 'uint16[]',
        indexed: false,
        internalType: 'uint16[]',
      },
      {
        name: 'rewardAdmins',
        type: 'address[]',
        indexed: false,
        internalType: 'address[]',
      },
      {
        name: 'rewardRecipients',
        type: 'address[]',
        indexed: false,
        internalType: 'address[]',
      },
      {
        name: 'tickLower',
        type: 'int24[]',
        indexed: false,
        internalType: 'int24[]',
      },
      {
        name: 'tickUpper',
        type: 'int24[]',
        indexed: false,
        internalType: 'int24[]',
      },
      {
        name: 'positionBps',
        type: 'uint16[]',
        indexed: false,
        internalType: 'uint16[]',
      },
    ],
    anonymous: false,
  },
] as const
