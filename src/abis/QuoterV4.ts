export default [
  // Common errors
  {
    type: 'error',
    name: 'PoolNotInitialized',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidPool',
    inputs: [],
  },
  {
    type: 'error',
    name: 'LockFailure',
    inputs: [],
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              { internalType: 'address', name: 'currency0', type: 'address' },
              { internalType: 'address', name: 'currency1', type: 'address' },
              { internalType: 'uint24', name: 'fee', type: 'uint24' },
              { internalType: 'int24', name: 'tickSpacing', type: 'int24' },
              { internalType: 'address', name: 'hooks', type: 'address' },
            ],
            internalType: 'struct PoolKey',
            name: 'poolKey',
            type: 'tuple',
          },
          { internalType: 'bool', name: 'zeroForOne', type: 'bool' },
          { internalType: 'uint128', name: 'exactAmount', type: 'uint128' },
          { internalType: 'bytes', name: 'hookData', type: 'bytes' },
        ],
        internalType: 'struct IQuoter.QuoteExactSingleParams',
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'quoteExactInputSingle',
    outputs: [
      { internalType: 'int128[]', name: 'deltaAmounts', type: 'int128[]' },
      { internalType: 'uint256', name: 'intakeAmounts', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              { internalType: 'address', name: 'currency0', type: 'address' },
              { internalType: 'address', name: 'currency1', type: 'address' },
              { internalType: 'uint24', name: 'fee', type: 'uint24' },
              { internalType: 'int24', name: 'tickSpacing', type: 'int24' },
              { internalType: 'address', name: 'hooks', type: 'address' },
            ],
            internalType: 'struct PoolKey',
            name: 'poolKey',
            type: 'tuple',
          },
          { internalType: 'bool', name: 'zeroForOne', type: 'bool' },
          { internalType: 'uint128', name: 'exactAmount', type: 'uint128' },
          { internalType: 'bytes', name: 'hookData', type: 'bytes' },
        ],
        internalType: 'struct IQuoter.QuoteExactSingleParams',
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'quoteExactOutputSingle',
    outputs: [
      { internalType: 'int128[]', name: 'deltaAmounts', type: 'int128[]' },
      { internalType: 'uint256', name: 'intakeAmounts', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const
