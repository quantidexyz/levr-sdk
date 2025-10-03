export default [
  {
    type: 'function',
    name: 'MAX_LP_FEE',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint24',
        internalType: 'uint24',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'MAX_MEV_LP_FEE',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'uint24',
        internalType: 'uint24',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'MAX_MEV_MODULE_DELAY',
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
    name: 'initializeMevModule',
    inputs: [
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
        name: 'mevModuleData',
        type: 'bytes',
        internalType: 'bytes',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'initializePool',
    inputs: [
      {
        name: 'clanker',
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
        name: 'locker',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'mevModule',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'poolData',
        type: 'bytes',
        internalType: 'bytes',
      },
    ],
    outputs: [
      {
        name: '',
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
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'initializePoolOpen',
    inputs: [
      {
        name: 'clanker',
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
    outputs: [
      {
        name: '',
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
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'mevModuleEnabled',
    inputs: [
      {
        name: 'poolId',
        type: 'bytes32',
        internalType: 'PoolId',
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
    name: 'mevModuleOperational',
    inputs: [
      {
        name: 'poolId',
        type: 'bytes32',
        internalType: 'PoolId',
      },
    ],
    outputs: [
      {
        name: '',
        type: 'bool',
        internalType: 'bool',
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'mevModuleSetFee',
    inputs: [
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
        name: 'fee',
        type: 'uint24',
        internalType: 'uint24',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'poolCreationTimestamp',
    inputs: [
      {
        name: 'poolId',
        type: 'bytes32',
        internalType: 'PoolId',
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
    stateMutability: 'pure',
  },
  {
    type: 'event',
    name: 'ClaimProtocolFees',
    inputs: [
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
    type: 'event',
    name: 'MevModuleDisabled',
    inputs: [
      {
        name: '',
        type: 'bytes32',
        indexed: false,
        internalType: 'PoolId',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'MevModuleSetFee',
    inputs: [
      {
        name: 'poolId',
        type: 'bytes32',
        indexed: false,
        internalType: 'PoolId',
      },
      {
        name: 'fee',
        type: 'uint24',
        indexed: false,
        internalType: 'uint24',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'PoolCreatedFactory',
    inputs: [
      {
        name: 'pairedToken',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'clanker',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'poolId',
        type: 'bytes32',
        indexed: false,
        internalType: 'PoolId',
      },
      {
        name: 'tickIfToken0IsClanker',
        type: 'int24',
        indexed: false,
        internalType: 'int24',
      },
      {
        name: 'tickSpacing',
        type: 'int24',
        indexed: false,
        internalType: 'int24',
      },
      {
        name: 'locker',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
      {
        name: 'mevModule',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'PoolCreatedOpen',
    inputs: [
      {
        name: 'pairedToken',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'clanker',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'poolId',
        type: 'bytes32',
        indexed: false,
        internalType: 'PoolId',
      },
      {
        name: 'tickIfToken0IsClanker',
        type: 'int24',
        indexed: false,
        internalType: 'int24',
      },
      {
        name: 'tickSpacing',
        type: 'int24',
        indexed: false,
        internalType: 'int24',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'PoolExtensionFailed',
    inputs: [
      {
        name: 'poolId',
        type: 'bytes32',
        indexed: false,
        internalType: 'PoolId',
      },
      {
        name: 'swapParams',
        type: 'tuple',
        indexed: false,
        internalType: 'struct IPoolManager.SwapParams',
        components: [
          {
            name: 'zeroForOne',
            type: 'bool',
            internalType: 'bool',
          },
          {
            name: 'amountSpecified',
            type: 'int256',
            internalType: 'int256',
          },
          {
            name: 'sqrtPriceLimitX96',
            type: 'uint160',
            internalType: 'uint160',
          },
        ],
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'PoolExtensionRegistered',
    inputs: [
      {
        name: 'poolId',
        type: 'bytes32',
        indexed: true,
        internalType: 'PoolId',
      },
      {
        name: 'extension',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'PoolExtensionSuccess',
    inputs: [
      {
        name: 'poolId',
        type: 'bytes32',
        indexed: false,
        internalType: 'PoolId',
      },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'ETHPoolNotAllowed',
    inputs: [],
  },
  {
    type: 'error',
    name: 'MevModuleEnabled',
    inputs: [],
  },
  {
    type: 'error',
    name: 'MevModuleNotOperational',
    inputs: [],
  },
  {
    type: 'error',
    name: 'OnlyFactory',
    inputs: [],
  },
  {
    type: 'error',
    name: 'OnlyFactoryPoolsCanHaveExtensions',
    inputs: [],
  },
  {
    type: 'error',
    name: 'OnlyThis',
    inputs: [],
  },
  {
    type: 'error',
    name: 'PastCreationTimestamp',
    inputs: [],
  },
  {
    type: 'error',
    name: 'PoolExtensionNotEnabled',
    inputs: [],
  },
  {
    type: 'error',
    name: 'Unauthorized',
    inputs: [],
  },
  {
    type: 'error',
    name: 'UnsupportedInitializePath',
    inputs: [],
  },
  {
    type: 'error',
    name: 'WethCannotBeClanker',
    inputs: [],
  },
] as const
