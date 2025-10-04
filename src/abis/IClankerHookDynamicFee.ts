export default [
  {
    type: 'function',
    name: 'poolConfigVars',
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
        type: 'tuple',
        internalType: 'struct IClankerHookDynamicFee.PoolDynamicConfigVars',
        components: [
          {
            name: 'baseFee',
            type: 'uint24',
            internalType: 'uint24',
          },
          {
            name: 'maxLpFee',
            type: 'uint24',
            internalType: 'uint24',
          },
          {
            name: 'referenceTickFilterPeriod',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'resetPeriod',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'resetTickFilter',
            type: 'int24',
            internalType: 'int24',
          },
          {
            name: 'feeControlNumerator',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'decayFilterBps',
            type: 'uint24',
            internalType: 'uint24',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'poolFeeVars',
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
        type: 'tuple',
        internalType: 'struct IClankerHookDynamicFee.PoolDynamicFeeVars',
        components: [
          {
            name: 'referenceTick',
            type: 'int24',
            internalType: 'int24',
          },
          {
            name: 'resetTick',
            type: 'int24',
            internalType: 'int24',
          },
          {
            name: 'resetTickTimestamp',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'lastSwapTimestamp',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'appliedVR',
            type: 'uint24',
            internalType: 'uint24',
          },
          {
            name: 'prevVA',
            type: 'uint24',
            internalType: 'uint24',
          },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'EstimatedTickDifference',
    inputs: [
      {
        name: 'beforeTick',
        type: 'int24',
        indexed: false,
        internalType: 'int24',
      },
      {
        name: 'afterTick',
        type: 'int24',
        indexed: false,
        internalType: 'int24',
      },
    ],
    anonymous: false,
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
        name: 'baseFee',
        type: 'uint24',
        indexed: false,
        internalType: 'uint24',
      },
      {
        name: 'maxLpFee',
        type: 'uint24',
        indexed: false,
        internalType: 'uint24',
      },
      {
        name: 'referenceTickFilterPeriod',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'resetPeriod',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'resetTickFilter',
        type: 'int24',
        indexed: false,
        internalType: 'int24',
      },
      {
        name: 'feeControlNumerator',
        type: 'uint256',
        indexed: false,
        internalType: 'uint256',
      },
      {
        name: 'decayFilterBps',
        type: 'uint24',
        indexed: false,
        internalType: 'uint24',
      },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'BaseFeeGreaterThanMaxLpFee',
    inputs: [],
  },
  {
    type: 'error',
    name: 'BaseFeeTooLow',
    inputs: [],
  },
  {
    type: 'error',
    name: 'MaxLpFeeTooHigh',
    inputs: [],
  },
] as const
