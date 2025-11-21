export default [
  {
    type: 'function',
    name: 'feePreferences',
    inputs: [
      {
        name: 'token',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'index',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
    outputs: [
      {
        name: 'feePreference',
        type: 'uint8',
        internalType: 'enum IClankerLpLockerFeeConversion.FeeIn',
      },
    ],
    stateMutability: 'view',
  },
] as const

