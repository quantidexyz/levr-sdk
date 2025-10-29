export default [
  {
    type: 'function',
    name: 'authorizedFactory',
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
    name: 'deployProject',
    inputs: [
      {
        name: 'clankerToken',
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
        name: 'factory_',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'trustedForwarder',
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
        ],
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'error',
    name: 'UnauthorizedFactory',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ZeroAddress',
    inputs: [],
  },
] as const
