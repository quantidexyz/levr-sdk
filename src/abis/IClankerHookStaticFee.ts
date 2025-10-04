export default [
  {
    type: 'function',
    name: 'clankerFee',
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
        type: 'uint24',
        internalType: 'uint24',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'pairedFee',
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
        type: 'uint24',
        internalType: 'uint24',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'PoolInitialized',
    inputs: [
      {
        name: 'poolId',
        type: 'bytes32',
        indexed: false,
        internalType: 'PoolId',
      },
      {
        name: 'clankerFee',
        type: 'uint24',
        indexed: false,
        internalType: 'uint24',
      },
      {
        name: 'pairedFee',
        type: 'uint24',
        indexed: false,
        internalType: 'uint24',
      },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'ClankerFeeTooHigh',
    inputs: [],
  },
  {
    type: 'error',
    name: 'PairedFeeTooHigh',
    inputs: [],
  },
] as const
