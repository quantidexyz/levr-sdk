// @ts-nocheck
/* istanbul ignore file */
/* tslint:disable */

export type Scalars = {
  Boolean: boolean
  Int: number
  String: string
  jsonb: any
  numeric: any
  timestamptz: any
}

/** columns and relationships of "LevrContractMapping" */
export interface LevrContractMapping {
  id: Scalars['String']
  /** An object relationship */
  project: LevrProject | null
  project_id: Scalars['String']
  __typename: 'LevrContractMapping'
}

/** select columns of table "LevrContractMapping" */
export type LevrContractMapping_select_column = 'id' | 'project_id'

/** columns and relationships of "LevrFactory" */
export interface LevrFactory {
  approvalBps: Scalars['numeric']
  createdAt: Scalars['numeric']
  id: Scalars['String']
  maxActiveProposals: Scalars['numeric']
  maxProposalAmountBps: Scalars['numeric']
  minSTokenBpsToSubmit: Scalars['numeric']
  minimumQuorumBps: Scalars['numeric']
  proposalWindowSeconds: Scalars['numeric']
  protocolFeeBps: Scalars['numeric']
  protocolTreasury: Scalars['String']
  quorumBps: Scalars['numeric']
  streamWindowSeconds: Scalars['numeric']
  updatedAt: Scalars['numeric']
  votingWindowSeconds: Scalars['numeric']
  __typename: 'LevrFactory'
}

/** select columns of table "LevrFactory" */
export type LevrFactory_select_column =
  | 'approvalBps'
  | 'createdAt'
  | 'id'
  | 'maxActiveProposals'
  | 'maxProposalAmountBps'
  | 'minSTokenBpsToSubmit'
  | 'minimumQuorumBps'
  | 'proposalWindowSeconds'
  | 'protocolFeeBps'
  | 'protocolTreasury'
  | 'quorumBps'
  | 'streamWindowSeconds'
  | 'updatedAt'
  | 'votingWindowSeconds'

/** columns and relationships of "LevrGovernanceCycle" */
export interface LevrGovernanceCycle {
  createdAt: Scalars['numeric']
  executed: Scalars['Boolean']
  id: Scalars['String']
  /** An object relationship */
  project: LevrProject | null
  project_id: Scalars['String']
  proposalWindowEnd: Scalars['numeric']
  proposalWindowStart: Scalars['numeric']
  updatedAt: Scalars['numeric']
  votingWindowEnd: Scalars['numeric']
  __typename: 'LevrGovernanceCycle'
}

/** select columns of table "LevrGovernanceCycle" */
export type LevrGovernanceCycle_select_column =
  | 'createdAt'
  | 'executed'
  | 'id'
  | 'project_id'
  | 'proposalWindowEnd'
  | 'proposalWindowStart'
  | 'updatedAt'
  | 'votingWindowEnd'

/** columns and relationships of "LevrMetrics" */
export interface LevrMetrics {
  createdAt: Scalars['numeric']
  id: Scalars['String']
  lastStakedAt: Scalars['numeric'] | null
  lastStakedProject_id: Scalars['String'] | null
  projectCount: Scalars['numeric']
  totalStaked: Scalars['numeric']
  totalStakers: Scalars['numeric']
  updatedAt: Scalars['numeric']
  __typename: 'LevrMetrics'
}

/** select columns of table "LevrMetrics" */
export type LevrMetrics_select_column =
  | 'createdAt'
  | 'id'
  | 'lastStakedAt'
  | 'lastStakedProject_id'
  | 'projectCount'
  | 'totalStaked'
  | 'totalStakers'
  | 'updatedAt'

/** columns and relationships of "LevrProject" */
export interface LevrProject {
  /** An object relationship */
  clankerToken: Token | null
  clankerToken_id: Scalars['String']
  createdAt: Scalars['numeric']
  /** An array relationship */
  cycles: LevrGovernanceCycle[]
  governor_id: Scalars['String']
  id: Scalars['String']
  /** An array relationship */
  proposals: LevrProposal[]
  /** An array relationship */
  rewardStreams: LevrRewardStream[]
  /** An array relationship */
  stakeActions: LevrStakeAction[]
  stakedToken_id: Scalars['String']
  /** An array relationship */
  stakers: LevrStaker[]
  staking_id: Scalars['String']
  totalProposals: Scalars['numeric']
  totalStaked: Scalars['numeric']
  /** An array relationship */
  transfers: LevrTreasuryTransfer[]
  treasury_id: Scalars['String']
  updatedAt: Scalars['numeric']
  verified: Scalars['Boolean']
  __typename: 'LevrProject'
}

/** select columns of table "LevrProject" */
export type LevrProject_select_column =
  | 'clankerToken_id'
  | 'createdAt'
  | 'governor_id'
  | 'id'
  | 'stakedToken_id'
  | 'staking_id'
  | 'totalProposals'
  | 'totalStaked'
  | 'treasury_id'
  | 'updatedAt'
  | 'verified'

/** columns and relationships of "LevrProposal" */
export interface LevrProposal {
  amount: Scalars['numeric']
  createdAt: Scalars['numeric']
  cycleId: Scalars['numeric']
  description: Scalars['String'] | null
  executed: Scalars['Boolean']
  id: Scalars['String']
  meetsApproval: Scalars['Boolean']
  meetsQuorum: Scalars['Boolean']
  noVotes: Scalars['numeric']
  /** An object relationship */
  project: LevrProject | null
  project_id: Scalars['String']
  proposalType: Scalars['String']
  proposer: Scalars['String']
  recipient: Scalars['String'] | null
  state: Scalars['String']
  /** An object relationship */
  token: Token | null
  token_id: Scalars['String']
  totalBalanceVoted: Scalars['numeric']
  updatedAt: Scalars['numeric']
  /** An array relationship */
  votes: LevrVote[]
  votingEndsAt: Scalars['numeric']
  votingStartsAt: Scalars['numeric']
  yesVotes: Scalars['numeric']
  __typename: 'LevrProposal'
}

/** select columns of table "LevrProposal" */
export type LevrProposal_select_column =
  | 'amount'
  | 'createdAt'
  | 'cycleId'
  | 'description'
  | 'executed'
  | 'id'
  | 'meetsApproval'
  | 'meetsQuorum'
  | 'noVotes'
  | 'project_id'
  | 'proposalType'
  | 'proposer'
  | 'recipient'
  | 'state'
  | 'token_id'
  | 'totalBalanceVoted'
  | 'updatedAt'
  | 'votingEndsAt'
  | 'votingStartsAt'
  | 'yesVotes'

/** columns and relationships of "LevrRewardStream" */
export interface LevrRewardStream {
  createdAt: Scalars['numeric']
  id: Scalars['String']
  /** An object relationship */
  project: LevrProject | null
  project_id: Scalars['String']
  /** An object relationship */
  rewardToken: Token | null
  rewardToken_id: Scalars['String']
  streamEnd: Scalars['numeric']
  streamStart: Scalars['numeric']
  streamTotal: Scalars['numeric']
  totalDistributed: Scalars['numeric']
  totalVested: Scalars['numeric']
  updatedAt: Scalars['numeric']
  __typename: 'LevrRewardStream'
}

/** select columns of table "LevrRewardStream" */
export type LevrRewardStream_select_column =
  | 'createdAt'
  | 'id'
  | 'project_id'
  | 'rewardToken_id'
  | 'streamEnd'
  | 'streamStart'
  | 'streamTotal'
  | 'totalDistributed'
  | 'totalVested'
  | 'updatedAt'

/** columns and relationships of "LevrStakeAction" */
export interface LevrStakeAction {
  actionType: Scalars['String']
  amount: Scalars['numeric']
  blockNumber: Scalars['numeric']
  blockTimestamp: Scalars['numeric']
  id: Scalars['String']
  /** An object relationship */
  project: LevrProject | null
  project_id: Scalars['String']
  /** An object relationship */
  staker: LevrStaker | null
  staker_id: Scalars['String']
  transactionHash: Scalars['String']
  __typename: 'LevrStakeAction'
}

/** select columns of table "LevrStakeAction" */
export type LevrStakeAction_select_column =
  | 'actionType'
  | 'amount'
  | 'blockNumber'
  | 'blockTimestamp'
  | 'id'
  | 'project_id'
  | 'staker_id'
  | 'transactionHash'

/** columns and relationships of "LevrStaker" */
export interface LevrStaker {
  createdAt: Scalars['numeric']
  id: Scalars['String']
  /** An object relationship */
  project: LevrProject | null
  project_id: Scalars['String']
  /** An array relationship */
  stakeActions: LevrStakeAction[]
  stakeStartTime: Scalars['numeric']
  stakedBalance: Scalars['numeric']
  stakerAddress: Scalars['String']
  totalClaimed: Scalars['numeric']
  updatedAt: Scalars['numeric']
  votingPower: Scalars['numeric']
  __typename: 'LevrStaker'
}

/** select columns of table "LevrStaker" */
export type LevrStaker_select_column =
  | 'createdAt'
  | 'id'
  | 'project_id'
  | 'stakeStartTime'
  | 'stakedBalance'
  | 'stakerAddress'
  | 'totalClaimed'
  | 'updatedAt'
  | 'votingPower'

/** columns and relationships of "LevrTreasuryTransfer" */
export interface LevrTreasuryTransfer {
  amount: Scalars['numeric']
  blockNumber: Scalars['numeric']
  blockTimestamp: Scalars['numeric']
  id: Scalars['String']
  /** An object relationship */
  project: LevrProject | null
  project_id: Scalars['String']
  to: Scalars['String']
  /** An object relationship */
  token: Token | null
  token_id: Scalars['String']
  transactionHash: Scalars['String']
  __typename: 'LevrTreasuryTransfer'
}

/** select columns of table "LevrTreasuryTransfer" */
export type LevrTreasuryTransfer_select_column =
  | 'amount'
  | 'blockNumber'
  | 'blockTimestamp'
  | 'id'
  | 'project_id'
  | 'to'
  | 'token_id'
  | 'transactionHash'

/** columns and relationships of "LevrVote" */
export interface LevrVote {
  blockTimestamp: Scalars['numeric']
  id: Scalars['String']
  /** An object relationship */
  proposal: LevrProposal | null
  proposal_id: Scalars['String']
  support: Scalars['Boolean']
  transactionHash: Scalars['String']
  voter: Scalars['String']
  votes: Scalars['numeric']
  __typename: 'LevrVote'
}

/** select columns of table "LevrVote" */
export type LevrVote_select_column =
  | 'blockTimestamp'
  | 'id'
  | 'proposal_id'
  | 'support'
  | 'transactionHash'
  | 'voter'
  | 'votes'

/** columns and relationships of "MoneyMachine" */
export interface MoneyMachine {
  activePositions: Scalars['numeric']
  id: Scalars['String']
  lastHeartbeatBlock: Scalars['numeric']
  totalHeartbeats: Scalars['numeric']
  totalPositions: Scalars['numeric']
  totalRebalances: Scalars['numeric']
  updatedAt: Scalars['numeric']
  __typename: 'MoneyMachine'
}

/** columns and relationships of "MoneyMachineConfig" */
export interface MoneyMachineConfig {
  callerIncentive: Scalars['numeric']
  feeRecipient: Scalars['String'] | null
  formula: Scalars['String'] | null
  heartbeatInterval: Scalars['numeric']
  hook: Scalars['String'] | null
  id: Scalars['String']
  poolManager: Scalars['String'] | null
  protocolFeeBps: Scalars['numeric']
  rebalanceGas: Scalars['numeric']
  tickAggregator: Scalars['String'] | null
  updatedAt: Scalars['numeric']
  __typename: 'MoneyMachineConfig'
}

/** select columns of table "MoneyMachineConfig" */
export type MoneyMachineConfig_select_column =
  | 'callerIncentive'
  | 'feeRecipient'
  | 'formula'
  | 'heartbeatInterval'
  | 'hook'
  | 'id'
  | 'poolManager'
  | 'protocolFeeBps'
  | 'rebalanceGas'
  | 'tickAggregator'
  | 'updatedAt'

/** columns and relationships of "MoneyMachineHeartbeat" */
export interface MoneyMachineHeartbeat {
  blockNumber: Scalars['numeric']
  blockTimestamp: Scalars['numeric']
  caller: Scalars['String']
  id: Scalars['String']
  incentivePaid: Scalars['numeric']
  positionsProcessed: Scalars['numeric']
  rebalancesExecuted: Scalars['numeric']
  transactionHash: Scalars['String']
  __typename: 'MoneyMachineHeartbeat'
}

/** select columns of table "MoneyMachineHeartbeat" */
export type MoneyMachineHeartbeat_select_column =
  | 'blockNumber'
  | 'blockTimestamp'
  | 'caller'
  | 'id'
  | 'incentivePaid'
  | 'positionsProcessed'
  | 'rebalancesExecuted'
  | 'transactionHash'

/** columns and relationships of "MoneyMachinePosition" */
export interface MoneyMachinePosition {
  active: Scalars['Boolean']
  amountQuote: Scalars['numeric']
  amountToken: Scalars['numeric']
  closedAt: Scalars['numeric'] | null
  createdAt: Scalars['numeric']
  createdTxHash: Scalars['String']
  feesPaidQuote: Scalars['numeric']
  feesPaidToken: Scalars['numeric']
  id: Scalars['String']
  originalTickLower: Scalars['Int']
  /** An object relationship */
  owner: MoneyMachineUser | null
  owner_id: Scalars['String']
  /** An object relationship */
  pool: UniswapV4Pool | null
  pool_id: Scalars['String']
  proceedsQuote: Scalars['numeric']
  proceedsToken: Scalars['numeric']
  /** An object relationship */
  quoteToken: Token | null
  quoteToken_id: Scalars['String']
  rebalanceCount: Scalars['numeric']
  /** An array relationship */
  rebalances: MoneyMachineRebalance[]
  tickLower: Scalars['Int']
  tickUpper: Scalars['Int']
  /** An object relationship */
  token: Token | null
  token_id: Scalars['String']
  updatedAt: Scalars['numeric']
  /** An array relationship */
  v3PriceSources: MoneyMachinePositionV3PriceSource[]
  /** An array relationship */
  v4PriceSources: MoneyMachinePositionV4PriceSource[]
  /** An array relationship */
  withdrawals: MoneyMachineWithdrawal[]
  withdrawnQuote: Scalars['numeric']
  withdrawnToken: Scalars['numeric']
  __typename: 'MoneyMachinePosition'
}

/** columns and relationships of "MoneyMachinePositionV3PriceSource" */
export interface MoneyMachinePositionV3PriceSource {
  id: Scalars['String']
  /** An object relationship */
  pool: UniswapV3Pool | null
  pool_id: Scalars['String']
  /** An object relationship */
  position: MoneyMachinePosition | null
  position_id: Scalars['String']
  __typename: 'MoneyMachinePositionV3PriceSource'
}

/** select columns of table "MoneyMachinePositionV3PriceSource" */
export type MoneyMachinePositionV3PriceSource_select_column = 'id' | 'pool_id' | 'position_id'

/** columns and relationships of "MoneyMachinePositionV4PriceSource" */
export interface MoneyMachinePositionV4PriceSource {
  id: Scalars['String']
  /** An object relationship */
  pool: UniswapV4Pool | null
  pool_id: Scalars['String']
  /** An object relationship */
  position: MoneyMachinePosition | null
  position_id: Scalars['String']
  __typename: 'MoneyMachinePositionV4PriceSource'
}

/** select columns of table "MoneyMachinePositionV4PriceSource" */
export type MoneyMachinePositionV4PriceSource_select_column = 'id' | 'pool_id' | 'position_id'

/** select columns of table "MoneyMachinePosition" */
export type MoneyMachinePosition_select_column =
  | 'active'
  | 'amountQuote'
  | 'amountToken'
  | 'closedAt'
  | 'createdAt'
  | 'createdTxHash'
  | 'feesPaidQuote'
  | 'feesPaidToken'
  | 'id'
  | 'originalTickLower'
  | 'owner_id'
  | 'pool_id'
  | 'proceedsQuote'
  | 'proceedsToken'
  | 'quoteToken_id'
  | 'rebalanceCount'
  | 'tickLower'
  | 'tickUpper'
  | 'token_id'
  | 'updatedAt'
  | 'withdrawnQuote'
  | 'withdrawnToken'

/** columns and relationships of "MoneyMachineRebalance" */
export interface MoneyMachineRebalance {
  blockNumber: Scalars['numeric']
  blockTimestamp: Scalars['numeric']
  id: Scalars['String']
  newTickLower: Scalars['Int']
  newTickUpper: Scalars['Int']
  oldTickLower: Scalars['Int']
  oldTickUpper: Scalars['Int']
  /** An object relationship */
  position: MoneyMachinePosition | null
  position_id: Scalars['String']
  proceedsQuote: Scalars['numeric']
  proceedsToken: Scalars['numeric']
  transactionHash: Scalars['String']
  __typename: 'MoneyMachineRebalance'
}

/** select columns of table "MoneyMachineRebalance" */
export type MoneyMachineRebalance_select_column =
  | 'blockNumber'
  | 'blockTimestamp'
  | 'id'
  | 'newTickLower'
  | 'newTickUpper'
  | 'oldTickLower'
  | 'oldTickUpper'
  | 'position_id'
  | 'proceedsQuote'
  | 'proceedsToken'
  | 'transactionHash'

/** columns and relationships of "MoneyMachineUser" */
export interface MoneyMachineUser {
  activePositionCount: Scalars['numeric']
  createdAt: Scalars['numeric']
  gasBalance: Scalars['numeric']
  id: Scalars['String']
  positionCount: Scalars['numeric']
  /** An array relationship */
  positions: MoneyMachinePosition[]
  totalGasConsumed: Scalars['numeric']
  totalGasDeposited: Scalars['numeric']
  totalGasWithdrawn: Scalars['numeric']
  updatedAt: Scalars['numeric']
  __typename: 'MoneyMachineUser'
}

/** select columns of table "MoneyMachineUser" */
export type MoneyMachineUser_select_column =
  | 'activePositionCount'
  | 'createdAt'
  | 'gasBalance'
  | 'id'
  | 'positionCount'
  | 'totalGasConsumed'
  | 'totalGasDeposited'
  | 'totalGasWithdrawn'
  | 'updatedAt'

/** columns and relationships of "MoneyMachineWithdrawal" */
export interface MoneyMachineWithdrawal {
  amountQuote: Scalars['numeric']
  amountToken: Scalars['numeric']
  blockNumber: Scalars['numeric']
  blockTimestamp: Scalars['numeric']
  id: Scalars['String']
  isFullWithdrawal: Scalars['Boolean']
  /** An object relationship */
  position: MoneyMachinePosition | null
  position_id: Scalars['String']
  protocolFeeQuote: Scalars['numeric']
  transactionHash: Scalars['String']
  __typename: 'MoneyMachineWithdrawal'
}

/** select columns of table "MoneyMachineWithdrawal" */
export type MoneyMachineWithdrawal_select_column =
  | 'amountQuote'
  | 'amountToken'
  | 'blockNumber'
  | 'blockTimestamp'
  | 'id'
  | 'isFullWithdrawal'
  | 'position_id'
  | 'protocolFeeQuote'
  | 'transactionHash'

/** select columns of table "MoneyMachine" */
export type MoneyMachine_select_column =
  | 'activePositions'
  | 'id'
  | 'lastHeartbeatBlock'
  | 'totalHeartbeats'
  | 'totalPositions'
  | 'totalRebalances'
  | 'updatedAt'

/** columns and relationships of "Token" */
export interface Token {
  address: Scalars['String']
  chainId: Scalars['numeric']
  createdAt: Scalars['numeric']
  decimals: Scalars['Int'] | null
  id: Scalars['String']
  name: Scalars['String'] | null
  symbol: Scalars['String'] | null
  totalSupply: Scalars['numeric'] | null
  updatedAt: Scalars['numeric']
  __typename: 'Token'
}

/** select columns of table "Token" */
export type Token_select_column =
  | 'address'
  | 'chainId'
  | 'createdAt'
  | 'decimals'
  | 'id'
  | 'name'
  | 'symbol'
  | 'totalSupply'
  | 'updatedAt'

/** columns and relationships of "UniswapV3Pool" */
export interface UniswapV3Pool {
  address: Scalars['String']
  amount0: Scalars['numeric']
  amount1: Scalars['numeric']
  chainId: Scalars['numeric']
  createdAt: Scalars['numeric']
  fee: Scalars['Int']
  id: Scalars['String']
  liquidity: Scalars['numeric'] | null
  sqrtPriceX96: Scalars['numeric'] | null
  tick: Scalars['Int'] | null
  tickSpacing: Scalars['Int']
  /** An object relationship */
  token0: Token | null
  token0_id: Scalars['String']
  /** An object relationship */
  token1: Token | null
  token1_id: Scalars['String']
  updatedAt: Scalars['numeric']
  __typename: 'UniswapV3Pool'
}

/** select columns of table "UniswapV3Pool" */
export type UniswapV3Pool_select_column =
  | 'address'
  | 'amount0'
  | 'amount1'
  | 'chainId'
  | 'createdAt'
  | 'fee'
  | 'id'
  | 'liquidity'
  | 'sqrtPriceX96'
  | 'tick'
  | 'tickSpacing'
  | 'token0_id'
  | 'token1_id'
  | 'updatedAt'

/** columns and relationships of "UniswapV4Pool" */
export interface UniswapV4Pool {
  amount0: Scalars['numeric']
  amount1: Scalars['numeric']
  chainId: Scalars['numeric']
  createdAt: Scalars['numeric']
  fee: Scalars['Int']
  hooks: Scalars['String']
  id: Scalars['String']
  liquidity: Scalars['numeric'] | null
  poolId: Scalars['String']
  /** An array relationship */
  positions: MoneyMachinePosition[]
  sqrtPriceX96: Scalars['numeric'] | null
  tick: Scalars['Int'] | null
  tickSpacing: Scalars['Int']
  /** An object relationship */
  token0: Token | null
  token0_id: Scalars['String']
  /** An object relationship */
  token1: Token | null
  token1_id: Scalars['String']
  updatedAt: Scalars['numeric']
  __typename: 'UniswapV4Pool'
}

/** select columns of table "UniswapV4Pool" */
export type UniswapV4Pool_select_column =
  | 'amount0'
  | 'amount1'
  | 'chainId'
  | 'createdAt'
  | 'fee'
  | 'hooks'
  | 'id'
  | 'liquidity'
  | 'poolId'
  | 'sqrtPriceX96'
  | 'tick'
  | 'tickSpacing'
  | 'token0_id'
  | 'token1_id'
  | 'updatedAt'

/** columns and relationships of "_meta" */
export interface _meta {
  bufferBlock: Scalars['Int'] | null
  chainId: Scalars['Int'] | null
  endBlock: Scalars['Int'] | null
  eventsProcessed: Scalars['Int'] | null
  firstEventBlock: Scalars['Int'] | null
  isReady: Scalars['Boolean'] | null
  progressBlock: Scalars['Int'] | null
  readyAt: Scalars['timestamptz'] | null
  sourceBlock: Scalars['Int'] | null
  startBlock: Scalars['Int'] | null
  __typename: '_meta'
}

/** select columns of table "_meta" */
export type _meta_select_column =
  | 'bufferBlock'
  | 'chainId'
  | 'endBlock'
  | 'eventsProcessed'
  | 'firstEventBlock'
  | 'isReady'
  | 'progressBlock'
  | 'readyAt'
  | 'sourceBlock'
  | 'startBlock'

/** columns and relationships of "chain_metadata" */
export interface chain_metadata {
  block_height: Scalars['Int'] | null
  chain_id: Scalars['Int'] | null
  end_block: Scalars['Int'] | null
  first_event_block_number: Scalars['Int'] | null
  is_hyper_sync: Scalars['Boolean'] | null
  latest_fetched_block_number: Scalars['Int'] | null
  latest_processed_block: Scalars['Int'] | null
  num_batches_fetched: Scalars['Int'] | null
  num_events_processed: Scalars['Int'] | null
  start_block: Scalars['Int'] | null
  timestamp_caught_up_to_head_or_endblock: Scalars['timestamptz'] | null
  __typename: 'chain_metadata'
}

/** select columns of table "chain_metadata" */
export type chain_metadata_select_column =
  | 'block_height'
  | 'chain_id'
  | 'end_block'
  | 'first_event_block_number'
  | 'is_hyper_sync'
  | 'latest_fetched_block_number'
  | 'latest_processed_block'
  | 'num_batches_fetched'
  | 'num_events_processed'
  | 'start_block'
  | 'timestamp_caught_up_to_head_or_endblock'

/** ordering argument of a cursor */
export type cursor_ordering = 'ASC' | 'DESC'

/** column ordering options */
export type order_by =
  | 'asc'
  | 'asc_nulls_first'
  | 'asc_nulls_last'
  | 'desc'
  | 'desc_nulls_first'
  | 'desc_nulls_last'

export interface query_root {
  /** fetch data from the table: "LevrContractMapping" */
  LevrContractMapping: LevrContractMapping[]
  /** fetch data from the table: "LevrContractMapping" using primary key columns */
  LevrContractMapping_by_pk: LevrContractMapping | null
  /** fetch data from the table: "LevrFactory" */
  LevrFactory: LevrFactory[]
  /** fetch data from the table: "LevrFactory" using primary key columns */
  LevrFactory_by_pk: LevrFactory | null
  /** fetch data from the table: "LevrGovernanceCycle" */
  LevrGovernanceCycle: LevrGovernanceCycle[]
  /** fetch data from the table: "LevrGovernanceCycle" using primary key columns */
  LevrGovernanceCycle_by_pk: LevrGovernanceCycle | null
  /** fetch data from the table: "LevrMetrics" */
  LevrMetrics: LevrMetrics[]
  /** fetch data from the table: "LevrMetrics" using primary key columns */
  LevrMetrics_by_pk: LevrMetrics | null
  /** fetch data from the table: "LevrProject" */
  LevrProject: LevrProject[]
  /** fetch data from the table: "LevrProject" using primary key columns */
  LevrProject_by_pk: LevrProject | null
  /** fetch data from the table: "LevrProposal" */
  LevrProposal: LevrProposal[]
  /** fetch data from the table: "LevrProposal" using primary key columns */
  LevrProposal_by_pk: LevrProposal | null
  /** fetch data from the table: "LevrRewardStream" */
  LevrRewardStream: LevrRewardStream[]
  /** fetch data from the table: "LevrRewardStream" using primary key columns */
  LevrRewardStream_by_pk: LevrRewardStream | null
  /** fetch data from the table: "LevrStakeAction" */
  LevrStakeAction: LevrStakeAction[]
  /** fetch data from the table: "LevrStakeAction" using primary key columns */
  LevrStakeAction_by_pk: LevrStakeAction | null
  /** fetch data from the table: "LevrStaker" */
  LevrStaker: LevrStaker[]
  /** fetch data from the table: "LevrStaker" using primary key columns */
  LevrStaker_by_pk: LevrStaker | null
  /** fetch data from the table: "LevrTreasuryTransfer" */
  LevrTreasuryTransfer: LevrTreasuryTransfer[]
  /** fetch data from the table: "LevrTreasuryTransfer" using primary key columns */
  LevrTreasuryTransfer_by_pk: LevrTreasuryTransfer | null
  /** fetch data from the table: "LevrVote" */
  LevrVote: LevrVote[]
  /** fetch data from the table: "LevrVote" using primary key columns */
  LevrVote_by_pk: LevrVote | null
  /** fetch data from the table: "MoneyMachine" */
  MoneyMachine: MoneyMachine[]
  /** fetch data from the table: "MoneyMachineConfig" */
  MoneyMachineConfig: MoneyMachineConfig[]
  /** fetch data from the table: "MoneyMachineConfig" using primary key columns */
  MoneyMachineConfig_by_pk: MoneyMachineConfig | null
  /** fetch data from the table: "MoneyMachineHeartbeat" */
  MoneyMachineHeartbeat: MoneyMachineHeartbeat[]
  /** fetch data from the table: "MoneyMachineHeartbeat" using primary key columns */
  MoneyMachineHeartbeat_by_pk: MoneyMachineHeartbeat | null
  /** fetch data from the table: "MoneyMachinePosition" */
  MoneyMachinePosition: MoneyMachinePosition[]
  /** fetch data from the table: "MoneyMachinePositionV3PriceSource" */
  MoneyMachinePositionV3PriceSource: MoneyMachinePositionV3PriceSource[]
  /** fetch data from the table: "MoneyMachinePositionV3PriceSource" using primary key columns */
  MoneyMachinePositionV3PriceSource_by_pk: MoneyMachinePositionV3PriceSource | null
  /** fetch data from the table: "MoneyMachinePositionV4PriceSource" */
  MoneyMachinePositionV4PriceSource: MoneyMachinePositionV4PriceSource[]
  /** fetch data from the table: "MoneyMachinePositionV4PriceSource" using primary key columns */
  MoneyMachinePositionV4PriceSource_by_pk: MoneyMachinePositionV4PriceSource | null
  /** fetch data from the table: "MoneyMachinePosition" using primary key columns */
  MoneyMachinePosition_by_pk: MoneyMachinePosition | null
  /** fetch data from the table: "MoneyMachineRebalance" */
  MoneyMachineRebalance: MoneyMachineRebalance[]
  /** fetch data from the table: "MoneyMachineRebalance" using primary key columns */
  MoneyMachineRebalance_by_pk: MoneyMachineRebalance | null
  /** fetch data from the table: "MoneyMachineUser" */
  MoneyMachineUser: MoneyMachineUser[]
  /** fetch data from the table: "MoneyMachineUser" using primary key columns */
  MoneyMachineUser_by_pk: MoneyMachineUser | null
  /** fetch data from the table: "MoneyMachineWithdrawal" */
  MoneyMachineWithdrawal: MoneyMachineWithdrawal[]
  /** fetch data from the table: "MoneyMachineWithdrawal" using primary key columns */
  MoneyMachineWithdrawal_by_pk: MoneyMachineWithdrawal | null
  /** fetch data from the table: "MoneyMachine" using primary key columns */
  MoneyMachine_by_pk: MoneyMachine | null
  /** fetch data from the table: "Token" */
  Token: Token[]
  /** fetch data from the table: "Token" using primary key columns */
  Token_by_pk: Token | null
  /** fetch data from the table: "UniswapV3Pool" */
  UniswapV3Pool: UniswapV3Pool[]
  /** fetch data from the table: "UniswapV3Pool" using primary key columns */
  UniswapV3Pool_by_pk: UniswapV3Pool | null
  /** fetch data from the table: "UniswapV4Pool" */
  UniswapV4Pool: UniswapV4Pool[]
  /** fetch data from the table: "UniswapV4Pool" using primary key columns */
  UniswapV4Pool_by_pk: UniswapV4Pool | null
  /** fetch data from the table: "_meta" */
  _meta: _meta[]
  /** fetch data from the table: "chain_metadata" */
  chain_metadata: chain_metadata[]
  /** fetch data from the table: "raw_events" */
  raw_events: raw_events[]
  /** fetch data from the table: "raw_events" using primary key columns */
  raw_events_by_pk: raw_events | null
  __typename: 'query_root'
}

/** columns and relationships of "raw_events" */
export interface raw_events {
  block_fields: Scalars['jsonb']
  block_hash: Scalars['String']
  block_number: Scalars['Int']
  block_timestamp: Scalars['Int']
  chain_id: Scalars['Int']
  contract_name: Scalars['String']
  event_id: Scalars['numeric']
  event_name: Scalars['String']
  log_index: Scalars['Int']
  params: Scalars['jsonb']
  serial: Scalars['Int']
  src_address: Scalars['String']
  transaction_fields: Scalars['jsonb']
  __typename: 'raw_events'
}

/** select columns of table "raw_events" */
export type raw_events_select_column =
  | 'block_fields'
  | 'block_hash'
  | 'block_number'
  | 'block_timestamp'
  | 'chain_id'
  | 'contract_name'
  | 'event_id'
  | 'event_name'
  | 'log_index'
  | 'params'
  | 'serial'
  | 'src_address'
  | 'transaction_fields'

export interface subscription_root {
  /** fetch data from the table: "LevrContractMapping" */
  LevrContractMapping: LevrContractMapping[]
  /** fetch data from the table: "LevrContractMapping" using primary key columns */
  LevrContractMapping_by_pk: LevrContractMapping | null
  /** fetch data from the table in a streaming manner: "LevrContractMapping" */
  LevrContractMapping_stream: LevrContractMapping[]
  /** fetch data from the table: "LevrFactory" */
  LevrFactory: LevrFactory[]
  /** fetch data from the table: "LevrFactory" using primary key columns */
  LevrFactory_by_pk: LevrFactory | null
  /** fetch data from the table in a streaming manner: "LevrFactory" */
  LevrFactory_stream: LevrFactory[]
  /** fetch data from the table: "LevrGovernanceCycle" */
  LevrGovernanceCycle: LevrGovernanceCycle[]
  /** fetch data from the table: "LevrGovernanceCycle" using primary key columns */
  LevrGovernanceCycle_by_pk: LevrGovernanceCycle | null
  /** fetch data from the table in a streaming manner: "LevrGovernanceCycle" */
  LevrGovernanceCycle_stream: LevrGovernanceCycle[]
  /** fetch data from the table: "LevrMetrics" */
  LevrMetrics: LevrMetrics[]
  /** fetch data from the table: "LevrMetrics" using primary key columns */
  LevrMetrics_by_pk: LevrMetrics | null
  /** fetch data from the table in a streaming manner: "LevrMetrics" */
  LevrMetrics_stream: LevrMetrics[]
  /** fetch data from the table: "LevrProject" */
  LevrProject: LevrProject[]
  /** fetch data from the table: "LevrProject" using primary key columns */
  LevrProject_by_pk: LevrProject | null
  /** fetch data from the table in a streaming manner: "LevrProject" */
  LevrProject_stream: LevrProject[]
  /** fetch data from the table: "LevrProposal" */
  LevrProposal: LevrProposal[]
  /** fetch data from the table: "LevrProposal" using primary key columns */
  LevrProposal_by_pk: LevrProposal | null
  /** fetch data from the table in a streaming manner: "LevrProposal" */
  LevrProposal_stream: LevrProposal[]
  /** fetch data from the table: "LevrRewardStream" */
  LevrRewardStream: LevrRewardStream[]
  /** fetch data from the table: "LevrRewardStream" using primary key columns */
  LevrRewardStream_by_pk: LevrRewardStream | null
  /** fetch data from the table in a streaming manner: "LevrRewardStream" */
  LevrRewardStream_stream: LevrRewardStream[]
  /** fetch data from the table: "LevrStakeAction" */
  LevrStakeAction: LevrStakeAction[]
  /** fetch data from the table: "LevrStakeAction" using primary key columns */
  LevrStakeAction_by_pk: LevrStakeAction | null
  /** fetch data from the table in a streaming manner: "LevrStakeAction" */
  LevrStakeAction_stream: LevrStakeAction[]
  /** fetch data from the table: "LevrStaker" */
  LevrStaker: LevrStaker[]
  /** fetch data from the table: "LevrStaker" using primary key columns */
  LevrStaker_by_pk: LevrStaker | null
  /** fetch data from the table in a streaming manner: "LevrStaker" */
  LevrStaker_stream: LevrStaker[]
  /** fetch data from the table: "LevrTreasuryTransfer" */
  LevrTreasuryTransfer: LevrTreasuryTransfer[]
  /** fetch data from the table: "LevrTreasuryTransfer" using primary key columns */
  LevrTreasuryTransfer_by_pk: LevrTreasuryTransfer | null
  /** fetch data from the table in a streaming manner: "LevrTreasuryTransfer" */
  LevrTreasuryTransfer_stream: LevrTreasuryTransfer[]
  /** fetch data from the table: "LevrVote" */
  LevrVote: LevrVote[]
  /** fetch data from the table: "LevrVote" using primary key columns */
  LevrVote_by_pk: LevrVote | null
  /** fetch data from the table in a streaming manner: "LevrVote" */
  LevrVote_stream: LevrVote[]
  /** fetch data from the table: "MoneyMachine" */
  MoneyMachine: MoneyMachine[]
  /** fetch data from the table: "MoneyMachineConfig" */
  MoneyMachineConfig: MoneyMachineConfig[]
  /** fetch data from the table: "MoneyMachineConfig" using primary key columns */
  MoneyMachineConfig_by_pk: MoneyMachineConfig | null
  /** fetch data from the table in a streaming manner: "MoneyMachineConfig" */
  MoneyMachineConfig_stream: MoneyMachineConfig[]
  /** fetch data from the table: "MoneyMachineHeartbeat" */
  MoneyMachineHeartbeat: MoneyMachineHeartbeat[]
  /** fetch data from the table: "MoneyMachineHeartbeat" using primary key columns */
  MoneyMachineHeartbeat_by_pk: MoneyMachineHeartbeat | null
  /** fetch data from the table in a streaming manner: "MoneyMachineHeartbeat" */
  MoneyMachineHeartbeat_stream: MoneyMachineHeartbeat[]
  /** fetch data from the table: "MoneyMachinePosition" */
  MoneyMachinePosition: MoneyMachinePosition[]
  /** fetch data from the table: "MoneyMachinePositionV3PriceSource" */
  MoneyMachinePositionV3PriceSource: MoneyMachinePositionV3PriceSource[]
  /** fetch data from the table: "MoneyMachinePositionV3PriceSource" using primary key columns */
  MoneyMachinePositionV3PriceSource_by_pk: MoneyMachinePositionV3PriceSource | null
  /** fetch data from the table in a streaming manner: "MoneyMachinePositionV3PriceSource" */
  MoneyMachinePositionV3PriceSource_stream: MoneyMachinePositionV3PriceSource[]
  /** fetch data from the table: "MoneyMachinePositionV4PriceSource" */
  MoneyMachinePositionV4PriceSource: MoneyMachinePositionV4PriceSource[]
  /** fetch data from the table: "MoneyMachinePositionV4PriceSource" using primary key columns */
  MoneyMachinePositionV4PriceSource_by_pk: MoneyMachinePositionV4PriceSource | null
  /** fetch data from the table in a streaming manner: "MoneyMachinePositionV4PriceSource" */
  MoneyMachinePositionV4PriceSource_stream: MoneyMachinePositionV4PriceSource[]
  /** fetch data from the table: "MoneyMachinePosition" using primary key columns */
  MoneyMachinePosition_by_pk: MoneyMachinePosition | null
  /** fetch data from the table in a streaming manner: "MoneyMachinePosition" */
  MoneyMachinePosition_stream: MoneyMachinePosition[]
  /** fetch data from the table: "MoneyMachineRebalance" */
  MoneyMachineRebalance: MoneyMachineRebalance[]
  /** fetch data from the table: "MoneyMachineRebalance" using primary key columns */
  MoneyMachineRebalance_by_pk: MoneyMachineRebalance | null
  /** fetch data from the table in a streaming manner: "MoneyMachineRebalance" */
  MoneyMachineRebalance_stream: MoneyMachineRebalance[]
  /** fetch data from the table: "MoneyMachineUser" */
  MoneyMachineUser: MoneyMachineUser[]
  /** fetch data from the table: "MoneyMachineUser" using primary key columns */
  MoneyMachineUser_by_pk: MoneyMachineUser | null
  /** fetch data from the table in a streaming manner: "MoneyMachineUser" */
  MoneyMachineUser_stream: MoneyMachineUser[]
  /** fetch data from the table: "MoneyMachineWithdrawal" */
  MoneyMachineWithdrawal: MoneyMachineWithdrawal[]
  /** fetch data from the table: "MoneyMachineWithdrawal" using primary key columns */
  MoneyMachineWithdrawal_by_pk: MoneyMachineWithdrawal | null
  /** fetch data from the table in a streaming manner: "MoneyMachineWithdrawal" */
  MoneyMachineWithdrawal_stream: MoneyMachineWithdrawal[]
  /** fetch data from the table: "MoneyMachine" using primary key columns */
  MoneyMachine_by_pk: MoneyMachine | null
  /** fetch data from the table in a streaming manner: "MoneyMachine" */
  MoneyMachine_stream: MoneyMachine[]
  /** fetch data from the table: "Token" */
  Token: Token[]
  /** fetch data from the table: "Token" using primary key columns */
  Token_by_pk: Token | null
  /** fetch data from the table in a streaming manner: "Token" */
  Token_stream: Token[]
  /** fetch data from the table: "UniswapV3Pool" */
  UniswapV3Pool: UniswapV3Pool[]
  /** fetch data from the table: "UniswapV3Pool" using primary key columns */
  UniswapV3Pool_by_pk: UniswapV3Pool | null
  /** fetch data from the table in a streaming manner: "UniswapV3Pool" */
  UniswapV3Pool_stream: UniswapV3Pool[]
  /** fetch data from the table: "UniswapV4Pool" */
  UniswapV4Pool: UniswapV4Pool[]
  /** fetch data from the table: "UniswapV4Pool" using primary key columns */
  UniswapV4Pool_by_pk: UniswapV4Pool | null
  /** fetch data from the table in a streaming manner: "UniswapV4Pool" */
  UniswapV4Pool_stream: UniswapV4Pool[]
  /** fetch data from the table: "_meta" */
  _meta: _meta[]
  /** fetch data from the table in a streaming manner: "_meta" */
  _meta_stream: _meta[]
  /** fetch data from the table: "chain_metadata" */
  chain_metadata: chain_metadata[]
  /** fetch data from the table in a streaming manner: "chain_metadata" */
  chain_metadata_stream: chain_metadata[]
  /** fetch data from the table: "raw_events" */
  raw_events: raw_events[]
  /** fetch data from the table: "raw_events" using primary key columns */
  raw_events_by_pk: raw_events | null
  /** fetch data from the table in a streaming manner: "raw_events" */
  raw_events_stream: raw_events[]
  __typename: 'subscription_root'
}

export type Query = query_root
export type Subscription = subscription_root

/** Boolean expression to compare columns of type "Boolean". All fields are combined with logical 'AND'. */
export interface Boolean_comparison_exp {
  _eq?: Scalars['Boolean'] | null
  _gt?: Scalars['Boolean'] | null
  _gte?: Scalars['Boolean'] | null
  _in?: Scalars['Boolean'][] | null
  _is_null?: Scalars['Boolean'] | null
  _lt?: Scalars['Boolean'] | null
  _lte?: Scalars['Boolean'] | null
  _neq?: Scalars['Boolean'] | null
  _nin?: Scalars['Boolean'][] | null
}

/** Boolean expression to compare columns of type "Int". All fields are combined with logical 'AND'. */
export interface Int_comparison_exp {
  _eq?: Scalars['Int'] | null
  _gt?: Scalars['Int'] | null
  _gte?: Scalars['Int'] | null
  _in?: Scalars['Int'][] | null
  _is_null?: Scalars['Boolean'] | null
  _lt?: Scalars['Int'] | null
  _lte?: Scalars['Int'] | null
  _neq?: Scalars['Int'] | null
  _nin?: Scalars['Int'][] | null
}

/** columns and relationships of "LevrContractMapping" */
export interface LevrContractMappingGenqlSelection {
  id?: boolean | number
  /** An object relationship */
  project?: LevrProjectGenqlSelection
  project_id?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

/** Boolean expression to filter rows from the table "LevrContractMapping". All fields are combined with a logical 'AND'. */
export interface LevrContractMapping_bool_exp {
  _and?: LevrContractMapping_bool_exp[] | null
  _not?: LevrContractMapping_bool_exp | null
  _or?: LevrContractMapping_bool_exp[] | null
  id?: String_comparison_exp | null
  project?: LevrProject_bool_exp | null
  project_id?: String_comparison_exp | null
}

/** Ordering options when selecting data from "LevrContractMapping". */
export interface LevrContractMapping_order_by {
  id?: order_by | null
  project?: LevrProject_order_by | null
  project_id?: order_by | null
}

/** Streaming cursor of the table "LevrContractMapping" */
export interface LevrContractMapping_stream_cursor_input {
  /** Stream column input with initial value */
  initial_value: LevrContractMapping_stream_cursor_value_input
  /** cursor ordering */
  ordering?: cursor_ordering | null
}

/** Initial value of the column from where the streaming should start */
export interface LevrContractMapping_stream_cursor_value_input {
  id?: Scalars['String'] | null
  project_id?: Scalars['String'] | null
}

/** columns and relationships of "LevrFactory" */
export interface LevrFactoryGenqlSelection {
  approvalBps?: boolean | number
  createdAt?: boolean | number
  id?: boolean | number
  maxActiveProposals?: boolean | number
  maxProposalAmountBps?: boolean | number
  minSTokenBpsToSubmit?: boolean | number
  minimumQuorumBps?: boolean | number
  proposalWindowSeconds?: boolean | number
  protocolFeeBps?: boolean | number
  protocolTreasury?: boolean | number
  quorumBps?: boolean | number
  streamWindowSeconds?: boolean | number
  updatedAt?: boolean | number
  votingWindowSeconds?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

/** Boolean expression to filter rows from the table "LevrFactory". All fields are combined with a logical 'AND'. */
export interface LevrFactory_bool_exp {
  _and?: LevrFactory_bool_exp[] | null
  _not?: LevrFactory_bool_exp | null
  _or?: LevrFactory_bool_exp[] | null
  approvalBps?: numeric_comparison_exp | null
  createdAt?: numeric_comparison_exp | null
  id?: String_comparison_exp | null
  maxActiveProposals?: numeric_comparison_exp | null
  maxProposalAmountBps?: numeric_comparison_exp | null
  minSTokenBpsToSubmit?: numeric_comparison_exp | null
  minimumQuorumBps?: numeric_comparison_exp | null
  proposalWindowSeconds?: numeric_comparison_exp | null
  protocolFeeBps?: numeric_comparison_exp | null
  protocolTreasury?: String_comparison_exp | null
  quorumBps?: numeric_comparison_exp | null
  streamWindowSeconds?: numeric_comparison_exp | null
  updatedAt?: numeric_comparison_exp | null
  votingWindowSeconds?: numeric_comparison_exp | null
}

/** Ordering options when selecting data from "LevrFactory". */
export interface LevrFactory_order_by {
  approvalBps?: order_by | null
  createdAt?: order_by | null
  id?: order_by | null
  maxActiveProposals?: order_by | null
  maxProposalAmountBps?: order_by | null
  minSTokenBpsToSubmit?: order_by | null
  minimumQuorumBps?: order_by | null
  proposalWindowSeconds?: order_by | null
  protocolFeeBps?: order_by | null
  protocolTreasury?: order_by | null
  quorumBps?: order_by | null
  streamWindowSeconds?: order_by | null
  updatedAt?: order_by | null
  votingWindowSeconds?: order_by | null
}

/** Streaming cursor of the table "LevrFactory" */
export interface LevrFactory_stream_cursor_input {
  /** Stream column input with initial value */
  initial_value: LevrFactory_stream_cursor_value_input
  /** cursor ordering */
  ordering?: cursor_ordering | null
}

/** Initial value of the column from where the streaming should start */
export interface LevrFactory_stream_cursor_value_input {
  approvalBps?: Scalars['numeric'] | null
  createdAt?: Scalars['numeric'] | null
  id?: Scalars['String'] | null
  maxActiveProposals?: Scalars['numeric'] | null
  maxProposalAmountBps?: Scalars['numeric'] | null
  minSTokenBpsToSubmit?: Scalars['numeric'] | null
  minimumQuorumBps?: Scalars['numeric'] | null
  proposalWindowSeconds?: Scalars['numeric'] | null
  protocolFeeBps?: Scalars['numeric'] | null
  protocolTreasury?: Scalars['String'] | null
  quorumBps?: Scalars['numeric'] | null
  streamWindowSeconds?: Scalars['numeric'] | null
  updatedAt?: Scalars['numeric'] | null
  votingWindowSeconds?: Scalars['numeric'] | null
}

/** columns and relationships of "LevrGovernanceCycle" */
export interface LevrGovernanceCycleGenqlSelection {
  createdAt?: boolean | number
  executed?: boolean | number
  id?: boolean | number
  /** An object relationship */
  project?: LevrProjectGenqlSelection
  project_id?: boolean | number
  proposalWindowEnd?: boolean | number
  proposalWindowStart?: boolean | number
  updatedAt?: boolean | number
  votingWindowEnd?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

/** order by aggregate values of table "LevrGovernanceCycle" */
export interface LevrGovernanceCycle_aggregate_order_by {
  avg?: LevrGovernanceCycle_avg_order_by | null
  count?: order_by | null
  max?: LevrGovernanceCycle_max_order_by | null
  min?: LevrGovernanceCycle_min_order_by | null
  stddev?: LevrGovernanceCycle_stddev_order_by | null
  stddev_pop?: LevrGovernanceCycle_stddev_pop_order_by | null
  stddev_samp?: LevrGovernanceCycle_stddev_samp_order_by | null
  sum?: LevrGovernanceCycle_sum_order_by | null
  var_pop?: LevrGovernanceCycle_var_pop_order_by | null
  var_samp?: LevrGovernanceCycle_var_samp_order_by | null
  variance?: LevrGovernanceCycle_variance_order_by | null
}

/** order by avg() on columns of table "LevrGovernanceCycle" */
export interface LevrGovernanceCycle_avg_order_by {
  createdAt?: order_by | null
  proposalWindowEnd?: order_by | null
  proposalWindowStart?: order_by | null
  updatedAt?: order_by | null
  votingWindowEnd?: order_by | null
}

/** Boolean expression to filter rows from the table "LevrGovernanceCycle". All fields are combined with a logical 'AND'. */
export interface LevrGovernanceCycle_bool_exp {
  _and?: LevrGovernanceCycle_bool_exp[] | null
  _not?: LevrGovernanceCycle_bool_exp | null
  _or?: LevrGovernanceCycle_bool_exp[] | null
  createdAt?: numeric_comparison_exp | null
  executed?: Boolean_comparison_exp | null
  id?: String_comparison_exp | null
  project?: LevrProject_bool_exp | null
  project_id?: String_comparison_exp | null
  proposalWindowEnd?: numeric_comparison_exp | null
  proposalWindowStart?: numeric_comparison_exp | null
  updatedAt?: numeric_comparison_exp | null
  votingWindowEnd?: numeric_comparison_exp | null
}

/** order by max() on columns of table "LevrGovernanceCycle" */
export interface LevrGovernanceCycle_max_order_by {
  createdAt?: order_by | null
  id?: order_by | null
  project_id?: order_by | null
  proposalWindowEnd?: order_by | null
  proposalWindowStart?: order_by | null
  updatedAt?: order_by | null
  votingWindowEnd?: order_by | null
}

/** order by min() on columns of table "LevrGovernanceCycle" */
export interface LevrGovernanceCycle_min_order_by {
  createdAt?: order_by | null
  id?: order_by | null
  project_id?: order_by | null
  proposalWindowEnd?: order_by | null
  proposalWindowStart?: order_by | null
  updatedAt?: order_by | null
  votingWindowEnd?: order_by | null
}

/** Ordering options when selecting data from "LevrGovernanceCycle". */
export interface LevrGovernanceCycle_order_by {
  createdAt?: order_by | null
  executed?: order_by | null
  id?: order_by | null
  project?: LevrProject_order_by | null
  project_id?: order_by | null
  proposalWindowEnd?: order_by | null
  proposalWindowStart?: order_by | null
  updatedAt?: order_by | null
  votingWindowEnd?: order_by | null
}

/** order by stddev() on columns of table "LevrGovernanceCycle" */
export interface LevrGovernanceCycle_stddev_order_by {
  createdAt?: order_by | null
  proposalWindowEnd?: order_by | null
  proposalWindowStart?: order_by | null
  updatedAt?: order_by | null
  votingWindowEnd?: order_by | null
}

/** order by stddev_pop() on columns of table "LevrGovernanceCycle" */
export interface LevrGovernanceCycle_stddev_pop_order_by {
  createdAt?: order_by | null
  proposalWindowEnd?: order_by | null
  proposalWindowStart?: order_by | null
  updatedAt?: order_by | null
  votingWindowEnd?: order_by | null
}

/** order by stddev_samp() on columns of table "LevrGovernanceCycle" */
export interface LevrGovernanceCycle_stddev_samp_order_by {
  createdAt?: order_by | null
  proposalWindowEnd?: order_by | null
  proposalWindowStart?: order_by | null
  updatedAt?: order_by | null
  votingWindowEnd?: order_by | null
}

/** Streaming cursor of the table "LevrGovernanceCycle" */
export interface LevrGovernanceCycle_stream_cursor_input {
  /** Stream column input with initial value */
  initial_value: LevrGovernanceCycle_stream_cursor_value_input
  /** cursor ordering */
  ordering?: cursor_ordering | null
}

/** Initial value of the column from where the streaming should start */
export interface LevrGovernanceCycle_stream_cursor_value_input {
  createdAt?: Scalars['numeric'] | null
  executed?: Scalars['Boolean'] | null
  id?: Scalars['String'] | null
  project_id?: Scalars['String'] | null
  proposalWindowEnd?: Scalars['numeric'] | null
  proposalWindowStart?: Scalars['numeric'] | null
  updatedAt?: Scalars['numeric'] | null
  votingWindowEnd?: Scalars['numeric'] | null
}

/** order by sum() on columns of table "LevrGovernanceCycle" */
export interface LevrGovernanceCycle_sum_order_by {
  createdAt?: order_by | null
  proposalWindowEnd?: order_by | null
  proposalWindowStart?: order_by | null
  updatedAt?: order_by | null
  votingWindowEnd?: order_by | null
}

/** order by var_pop() on columns of table "LevrGovernanceCycle" */
export interface LevrGovernanceCycle_var_pop_order_by {
  createdAt?: order_by | null
  proposalWindowEnd?: order_by | null
  proposalWindowStart?: order_by | null
  updatedAt?: order_by | null
  votingWindowEnd?: order_by | null
}

/** order by var_samp() on columns of table "LevrGovernanceCycle" */
export interface LevrGovernanceCycle_var_samp_order_by {
  createdAt?: order_by | null
  proposalWindowEnd?: order_by | null
  proposalWindowStart?: order_by | null
  updatedAt?: order_by | null
  votingWindowEnd?: order_by | null
}

/** order by variance() on columns of table "LevrGovernanceCycle" */
export interface LevrGovernanceCycle_variance_order_by {
  createdAt?: order_by | null
  proposalWindowEnd?: order_by | null
  proposalWindowStart?: order_by | null
  updatedAt?: order_by | null
  votingWindowEnd?: order_by | null
}

/** columns and relationships of "LevrMetrics" */
export interface LevrMetricsGenqlSelection {
  createdAt?: boolean | number
  id?: boolean | number
  lastStakedAt?: boolean | number
  lastStakedProject_id?: boolean | number
  projectCount?: boolean | number
  totalStaked?: boolean | number
  totalStakers?: boolean | number
  updatedAt?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

/** Boolean expression to filter rows from the table "LevrMetrics". All fields are combined with a logical 'AND'. */
export interface LevrMetrics_bool_exp {
  _and?: LevrMetrics_bool_exp[] | null
  _not?: LevrMetrics_bool_exp | null
  _or?: LevrMetrics_bool_exp[] | null
  createdAt?: numeric_comparison_exp | null
  id?: String_comparison_exp | null
  lastStakedAt?: numeric_comparison_exp | null
  lastStakedProject_id?: String_comparison_exp | null
  projectCount?: numeric_comparison_exp | null
  totalStaked?: numeric_comparison_exp | null
  totalStakers?: numeric_comparison_exp | null
  updatedAt?: numeric_comparison_exp | null
}

/** Ordering options when selecting data from "LevrMetrics". */
export interface LevrMetrics_order_by {
  createdAt?: order_by | null
  id?: order_by | null
  lastStakedAt?: order_by | null
  lastStakedProject_id?: order_by | null
  projectCount?: order_by | null
  totalStaked?: order_by | null
  totalStakers?: order_by | null
  updatedAt?: order_by | null
}

/** Streaming cursor of the table "LevrMetrics" */
export interface LevrMetrics_stream_cursor_input {
  /** Stream column input with initial value */
  initial_value: LevrMetrics_stream_cursor_value_input
  /** cursor ordering */
  ordering?: cursor_ordering | null
}

/** Initial value of the column from where the streaming should start */
export interface LevrMetrics_stream_cursor_value_input {
  createdAt?: Scalars['numeric'] | null
  id?: Scalars['String'] | null
  lastStakedAt?: Scalars['numeric'] | null
  lastStakedProject_id?: Scalars['String'] | null
  projectCount?: Scalars['numeric'] | null
  totalStaked?: Scalars['numeric'] | null
  totalStakers?: Scalars['numeric'] | null
  updatedAt?: Scalars['numeric'] | null
}

/** columns and relationships of "LevrProject" */
export interface LevrProjectGenqlSelection {
  /** An object relationship */
  clankerToken?: TokenGenqlSelection
  clankerToken_id?: boolean | number
  createdAt?: boolean | number
  /** An array relationship */
  cycles?: LevrGovernanceCycleGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrGovernanceCycle_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrGovernanceCycle_order_by[] | null
      /** filter the rows returned */
      where?: LevrGovernanceCycle_bool_exp | null
    }
  }
  governor_id?: boolean | number
  id?: boolean | number
  /** An array relationship */
  proposals?: LevrProposalGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrProposal_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrProposal_order_by[] | null
      /** filter the rows returned */
      where?: LevrProposal_bool_exp | null
    }
  }
  /** An array relationship */
  rewardStreams?: LevrRewardStreamGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrRewardStream_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrRewardStream_order_by[] | null
      /** filter the rows returned */
      where?: LevrRewardStream_bool_exp | null
    }
  }
  /** An array relationship */
  stakeActions?: LevrStakeActionGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrStakeAction_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrStakeAction_order_by[] | null
      /** filter the rows returned */
      where?: LevrStakeAction_bool_exp | null
    }
  }
  stakedToken_id?: boolean | number
  /** An array relationship */
  stakers?: LevrStakerGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrStaker_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrStaker_order_by[] | null
      /** filter the rows returned */
      where?: LevrStaker_bool_exp | null
    }
  }
  staking_id?: boolean | number
  totalProposals?: boolean | number
  totalStaked?: boolean | number
  /** An array relationship */
  transfers?: LevrTreasuryTransferGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrTreasuryTransfer_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrTreasuryTransfer_order_by[] | null
      /** filter the rows returned */
      where?: LevrTreasuryTransfer_bool_exp | null
    }
  }
  treasury_id?: boolean | number
  updatedAt?: boolean | number
  verified?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

/** Boolean expression to filter rows from the table "LevrProject". All fields are combined with a logical 'AND'. */
export interface LevrProject_bool_exp {
  _and?: LevrProject_bool_exp[] | null
  _not?: LevrProject_bool_exp | null
  _or?: LevrProject_bool_exp[] | null
  clankerToken?: Token_bool_exp | null
  clankerToken_id?: String_comparison_exp | null
  createdAt?: numeric_comparison_exp | null
  cycles?: LevrGovernanceCycle_bool_exp | null
  governor_id?: String_comparison_exp | null
  id?: String_comparison_exp | null
  proposals?: LevrProposal_bool_exp | null
  rewardStreams?: LevrRewardStream_bool_exp | null
  stakeActions?: LevrStakeAction_bool_exp | null
  stakedToken_id?: String_comparison_exp | null
  stakers?: LevrStaker_bool_exp | null
  staking_id?: String_comparison_exp | null
  totalProposals?: numeric_comparison_exp | null
  totalStaked?: numeric_comparison_exp | null
  transfers?: LevrTreasuryTransfer_bool_exp | null
  treasury_id?: String_comparison_exp | null
  updatedAt?: numeric_comparison_exp | null
  verified?: Boolean_comparison_exp | null
}

/** Ordering options when selecting data from "LevrProject". */
export interface LevrProject_order_by {
  clankerToken?: Token_order_by | null
  clankerToken_id?: order_by | null
  createdAt?: order_by | null
  cycles_aggregate?: LevrGovernanceCycle_aggregate_order_by | null
  governor_id?: order_by | null
  id?: order_by | null
  proposals_aggregate?: LevrProposal_aggregate_order_by | null
  rewardStreams_aggregate?: LevrRewardStream_aggregate_order_by | null
  stakeActions_aggregate?: LevrStakeAction_aggregate_order_by | null
  stakedToken_id?: order_by | null
  stakers_aggregate?: LevrStaker_aggregate_order_by | null
  staking_id?: order_by | null
  totalProposals?: order_by | null
  totalStaked?: order_by | null
  transfers_aggregate?: LevrTreasuryTransfer_aggregate_order_by | null
  treasury_id?: order_by | null
  updatedAt?: order_by | null
  verified?: order_by | null
}

/** Streaming cursor of the table "LevrProject" */
export interface LevrProject_stream_cursor_input {
  /** Stream column input with initial value */
  initial_value: LevrProject_stream_cursor_value_input
  /** cursor ordering */
  ordering?: cursor_ordering | null
}

/** Initial value of the column from where the streaming should start */
export interface LevrProject_stream_cursor_value_input {
  clankerToken_id?: Scalars['String'] | null
  createdAt?: Scalars['numeric'] | null
  governor_id?: Scalars['String'] | null
  id?: Scalars['String'] | null
  stakedToken_id?: Scalars['String'] | null
  staking_id?: Scalars['String'] | null
  totalProposals?: Scalars['numeric'] | null
  totalStaked?: Scalars['numeric'] | null
  treasury_id?: Scalars['String'] | null
  updatedAt?: Scalars['numeric'] | null
  verified?: Scalars['Boolean'] | null
}

/** columns and relationships of "LevrProposal" */
export interface LevrProposalGenqlSelection {
  amount?: boolean | number
  createdAt?: boolean | number
  cycleId?: boolean | number
  description?: boolean | number
  executed?: boolean | number
  id?: boolean | number
  meetsApproval?: boolean | number
  meetsQuorum?: boolean | number
  noVotes?: boolean | number
  /** An object relationship */
  project?: LevrProjectGenqlSelection
  project_id?: boolean | number
  proposalType?: boolean | number
  proposer?: boolean | number
  recipient?: boolean | number
  state?: boolean | number
  /** An object relationship */
  token?: TokenGenqlSelection
  token_id?: boolean | number
  totalBalanceVoted?: boolean | number
  updatedAt?: boolean | number
  /** An array relationship */
  votes?: LevrVoteGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrVote_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrVote_order_by[] | null
      /** filter the rows returned */
      where?: LevrVote_bool_exp | null
    }
  }
  votingEndsAt?: boolean | number
  votingStartsAt?: boolean | number
  yesVotes?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

/** order by aggregate values of table "LevrProposal" */
export interface LevrProposal_aggregate_order_by {
  avg?: LevrProposal_avg_order_by | null
  count?: order_by | null
  max?: LevrProposal_max_order_by | null
  min?: LevrProposal_min_order_by | null
  stddev?: LevrProposal_stddev_order_by | null
  stddev_pop?: LevrProposal_stddev_pop_order_by | null
  stddev_samp?: LevrProposal_stddev_samp_order_by | null
  sum?: LevrProposal_sum_order_by | null
  var_pop?: LevrProposal_var_pop_order_by | null
  var_samp?: LevrProposal_var_samp_order_by | null
  variance?: LevrProposal_variance_order_by | null
}

/** order by avg() on columns of table "LevrProposal" */
export interface LevrProposal_avg_order_by {
  amount?: order_by | null
  createdAt?: order_by | null
  cycleId?: order_by | null
  noVotes?: order_by | null
  totalBalanceVoted?: order_by | null
  updatedAt?: order_by | null
  votingEndsAt?: order_by | null
  votingStartsAt?: order_by | null
  yesVotes?: order_by | null
}

/** Boolean expression to filter rows from the table "LevrProposal". All fields are combined with a logical 'AND'. */
export interface LevrProposal_bool_exp {
  _and?: LevrProposal_bool_exp[] | null
  _not?: LevrProposal_bool_exp | null
  _or?: LevrProposal_bool_exp[] | null
  amount?: numeric_comparison_exp | null
  createdAt?: numeric_comparison_exp | null
  cycleId?: numeric_comparison_exp | null
  description?: String_comparison_exp | null
  executed?: Boolean_comparison_exp | null
  id?: String_comparison_exp | null
  meetsApproval?: Boolean_comparison_exp | null
  meetsQuorum?: Boolean_comparison_exp | null
  noVotes?: numeric_comparison_exp | null
  project?: LevrProject_bool_exp | null
  project_id?: String_comparison_exp | null
  proposalType?: String_comparison_exp | null
  proposer?: String_comparison_exp | null
  recipient?: String_comparison_exp | null
  state?: String_comparison_exp | null
  token?: Token_bool_exp | null
  token_id?: String_comparison_exp | null
  totalBalanceVoted?: numeric_comparison_exp | null
  updatedAt?: numeric_comparison_exp | null
  votes?: LevrVote_bool_exp | null
  votingEndsAt?: numeric_comparison_exp | null
  votingStartsAt?: numeric_comparison_exp | null
  yesVotes?: numeric_comparison_exp | null
}

/** order by max() on columns of table "LevrProposal" */
export interface LevrProposal_max_order_by {
  amount?: order_by | null
  createdAt?: order_by | null
  cycleId?: order_by | null
  description?: order_by | null
  id?: order_by | null
  noVotes?: order_by | null
  project_id?: order_by | null
  proposalType?: order_by | null
  proposer?: order_by | null
  recipient?: order_by | null
  state?: order_by | null
  token_id?: order_by | null
  totalBalanceVoted?: order_by | null
  updatedAt?: order_by | null
  votingEndsAt?: order_by | null
  votingStartsAt?: order_by | null
  yesVotes?: order_by | null
}

/** order by min() on columns of table "LevrProposal" */
export interface LevrProposal_min_order_by {
  amount?: order_by | null
  createdAt?: order_by | null
  cycleId?: order_by | null
  description?: order_by | null
  id?: order_by | null
  noVotes?: order_by | null
  project_id?: order_by | null
  proposalType?: order_by | null
  proposer?: order_by | null
  recipient?: order_by | null
  state?: order_by | null
  token_id?: order_by | null
  totalBalanceVoted?: order_by | null
  updatedAt?: order_by | null
  votingEndsAt?: order_by | null
  votingStartsAt?: order_by | null
  yesVotes?: order_by | null
}

/** Ordering options when selecting data from "LevrProposal". */
export interface LevrProposal_order_by {
  amount?: order_by | null
  createdAt?: order_by | null
  cycleId?: order_by | null
  description?: order_by | null
  executed?: order_by | null
  id?: order_by | null
  meetsApproval?: order_by | null
  meetsQuorum?: order_by | null
  noVotes?: order_by | null
  project?: LevrProject_order_by | null
  project_id?: order_by | null
  proposalType?: order_by | null
  proposer?: order_by | null
  recipient?: order_by | null
  state?: order_by | null
  token?: Token_order_by | null
  token_id?: order_by | null
  totalBalanceVoted?: order_by | null
  updatedAt?: order_by | null
  votes_aggregate?: LevrVote_aggregate_order_by | null
  votingEndsAt?: order_by | null
  votingStartsAt?: order_by | null
  yesVotes?: order_by | null
}

/** order by stddev() on columns of table "LevrProposal" */
export interface LevrProposal_stddev_order_by {
  amount?: order_by | null
  createdAt?: order_by | null
  cycleId?: order_by | null
  noVotes?: order_by | null
  totalBalanceVoted?: order_by | null
  updatedAt?: order_by | null
  votingEndsAt?: order_by | null
  votingStartsAt?: order_by | null
  yesVotes?: order_by | null
}

/** order by stddev_pop() on columns of table "LevrProposal" */
export interface LevrProposal_stddev_pop_order_by {
  amount?: order_by | null
  createdAt?: order_by | null
  cycleId?: order_by | null
  noVotes?: order_by | null
  totalBalanceVoted?: order_by | null
  updatedAt?: order_by | null
  votingEndsAt?: order_by | null
  votingStartsAt?: order_by | null
  yesVotes?: order_by | null
}

/** order by stddev_samp() on columns of table "LevrProposal" */
export interface LevrProposal_stddev_samp_order_by {
  amount?: order_by | null
  createdAt?: order_by | null
  cycleId?: order_by | null
  noVotes?: order_by | null
  totalBalanceVoted?: order_by | null
  updatedAt?: order_by | null
  votingEndsAt?: order_by | null
  votingStartsAt?: order_by | null
  yesVotes?: order_by | null
}

/** Streaming cursor of the table "LevrProposal" */
export interface LevrProposal_stream_cursor_input {
  /** Stream column input with initial value */
  initial_value: LevrProposal_stream_cursor_value_input
  /** cursor ordering */
  ordering?: cursor_ordering | null
}

/** Initial value of the column from where the streaming should start */
export interface LevrProposal_stream_cursor_value_input {
  amount?: Scalars['numeric'] | null
  createdAt?: Scalars['numeric'] | null
  cycleId?: Scalars['numeric'] | null
  description?: Scalars['String'] | null
  executed?: Scalars['Boolean'] | null
  id?: Scalars['String'] | null
  meetsApproval?: Scalars['Boolean'] | null
  meetsQuorum?: Scalars['Boolean'] | null
  noVotes?: Scalars['numeric'] | null
  project_id?: Scalars['String'] | null
  proposalType?: Scalars['String'] | null
  proposer?: Scalars['String'] | null
  recipient?: Scalars['String'] | null
  state?: Scalars['String'] | null
  token_id?: Scalars['String'] | null
  totalBalanceVoted?: Scalars['numeric'] | null
  updatedAt?: Scalars['numeric'] | null
  votingEndsAt?: Scalars['numeric'] | null
  votingStartsAt?: Scalars['numeric'] | null
  yesVotes?: Scalars['numeric'] | null
}

/** order by sum() on columns of table "LevrProposal" */
export interface LevrProposal_sum_order_by {
  amount?: order_by | null
  createdAt?: order_by | null
  cycleId?: order_by | null
  noVotes?: order_by | null
  totalBalanceVoted?: order_by | null
  updatedAt?: order_by | null
  votingEndsAt?: order_by | null
  votingStartsAt?: order_by | null
  yesVotes?: order_by | null
}

/** order by var_pop() on columns of table "LevrProposal" */
export interface LevrProposal_var_pop_order_by {
  amount?: order_by | null
  createdAt?: order_by | null
  cycleId?: order_by | null
  noVotes?: order_by | null
  totalBalanceVoted?: order_by | null
  updatedAt?: order_by | null
  votingEndsAt?: order_by | null
  votingStartsAt?: order_by | null
  yesVotes?: order_by | null
}

/** order by var_samp() on columns of table "LevrProposal" */
export interface LevrProposal_var_samp_order_by {
  amount?: order_by | null
  createdAt?: order_by | null
  cycleId?: order_by | null
  noVotes?: order_by | null
  totalBalanceVoted?: order_by | null
  updatedAt?: order_by | null
  votingEndsAt?: order_by | null
  votingStartsAt?: order_by | null
  yesVotes?: order_by | null
}

/** order by variance() on columns of table "LevrProposal" */
export interface LevrProposal_variance_order_by {
  amount?: order_by | null
  createdAt?: order_by | null
  cycleId?: order_by | null
  noVotes?: order_by | null
  totalBalanceVoted?: order_by | null
  updatedAt?: order_by | null
  votingEndsAt?: order_by | null
  votingStartsAt?: order_by | null
  yesVotes?: order_by | null
}

/** columns and relationships of "LevrRewardStream" */
export interface LevrRewardStreamGenqlSelection {
  createdAt?: boolean | number
  id?: boolean | number
  /** An object relationship */
  project?: LevrProjectGenqlSelection
  project_id?: boolean | number
  /** An object relationship */
  rewardToken?: TokenGenqlSelection
  rewardToken_id?: boolean | number
  streamEnd?: boolean | number
  streamStart?: boolean | number
  streamTotal?: boolean | number
  totalDistributed?: boolean | number
  totalVested?: boolean | number
  updatedAt?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

/** order by aggregate values of table "LevrRewardStream" */
export interface LevrRewardStream_aggregate_order_by {
  avg?: LevrRewardStream_avg_order_by | null
  count?: order_by | null
  max?: LevrRewardStream_max_order_by | null
  min?: LevrRewardStream_min_order_by | null
  stddev?: LevrRewardStream_stddev_order_by | null
  stddev_pop?: LevrRewardStream_stddev_pop_order_by | null
  stddev_samp?: LevrRewardStream_stddev_samp_order_by | null
  sum?: LevrRewardStream_sum_order_by | null
  var_pop?: LevrRewardStream_var_pop_order_by | null
  var_samp?: LevrRewardStream_var_samp_order_by | null
  variance?: LevrRewardStream_variance_order_by | null
}

/** order by avg() on columns of table "LevrRewardStream" */
export interface LevrRewardStream_avg_order_by {
  createdAt?: order_by | null
  streamEnd?: order_by | null
  streamStart?: order_by | null
  streamTotal?: order_by | null
  totalDistributed?: order_by | null
  totalVested?: order_by | null
  updatedAt?: order_by | null
}

/** Boolean expression to filter rows from the table "LevrRewardStream". All fields are combined with a logical 'AND'. */
export interface LevrRewardStream_bool_exp {
  _and?: LevrRewardStream_bool_exp[] | null
  _not?: LevrRewardStream_bool_exp | null
  _or?: LevrRewardStream_bool_exp[] | null
  createdAt?: numeric_comparison_exp | null
  id?: String_comparison_exp | null
  project?: LevrProject_bool_exp | null
  project_id?: String_comparison_exp | null
  rewardToken?: Token_bool_exp | null
  rewardToken_id?: String_comparison_exp | null
  streamEnd?: numeric_comparison_exp | null
  streamStart?: numeric_comparison_exp | null
  streamTotal?: numeric_comparison_exp | null
  totalDistributed?: numeric_comparison_exp | null
  totalVested?: numeric_comparison_exp | null
  updatedAt?: numeric_comparison_exp | null
}

/** order by max() on columns of table "LevrRewardStream" */
export interface LevrRewardStream_max_order_by {
  createdAt?: order_by | null
  id?: order_by | null
  project_id?: order_by | null
  rewardToken_id?: order_by | null
  streamEnd?: order_by | null
  streamStart?: order_by | null
  streamTotal?: order_by | null
  totalDistributed?: order_by | null
  totalVested?: order_by | null
  updatedAt?: order_by | null
}

/** order by min() on columns of table "LevrRewardStream" */
export interface LevrRewardStream_min_order_by {
  createdAt?: order_by | null
  id?: order_by | null
  project_id?: order_by | null
  rewardToken_id?: order_by | null
  streamEnd?: order_by | null
  streamStart?: order_by | null
  streamTotal?: order_by | null
  totalDistributed?: order_by | null
  totalVested?: order_by | null
  updatedAt?: order_by | null
}

/** Ordering options when selecting data from "LevrRewardStream". */
export interface LevrRewardStream_order_by {
  createdAt?: order_by | null
  id?: order_by | null
  project?: LevrProject_order_by | null
  project_id?: order_by | null
  rewardToken?: Token_order_by | null
  rewardToken_id?: order_by | null
  streamEnd?: order_by | null
  streamStart?: order_by | null
  streamTotal?: order_by | null
  totalDistributed?: order_by | null
  totalVested?: order_by | null
  updatedAt?: order_by | null
}

/** order by stddev() on columns of table "LevrRewardStream" */
export interface LevrRewardStream_stddev_order_by {
  createdAt?: order_by | null
  streamEnd?: order_by | null
  streamStart?: order_by | null
  streamTotal?: order_by | null
  totalDistributed?: order_by | null
  totalVested?: order_by | null
  updatedAt?: order_by | null
}

/** order by stddev_pop() on columns of table "LevrRewardStream" */
export interface LevrRewardStream_stddev_pop_order_by {
  createdAt?: order_by | null
  streamEnd?: order_by | null
  streamStart?: order_by | null
  streamTotal?: order_by | null
  totalDistributed?: order_by | null
  totalVested?: order_by | null
  updatedAt?: order_by | null
}

/** order by stddev_samp() on columns of table "LevrRewardStream" */
export interface LevrRewardStream_stddev_samp_order_by {
  createdAt?: order_by | null
  streamEnd?: order_by | null
  streamStart?: order_by | null
  streamTotal?: order_by | null
  totalDistributed?: order_by | null
  totalVested?: order_by | null
  updatedAt?: order_by | null
}

/** Streaming cursor of the table "LevrRewardStream" */
export interface LevrRewardStream_stream_cursor_input {
  /** Stream column input with initial value */
  initial_value: LevrRewardStream_stream_cursor_value_input
  /** cursor ordering */
  ordering?: cursor_ordering | null
}

/** Initial value of the column from where the streaming should start */
export interface LevrRewardStream_stream_cursor_value_input {
  createdAt?: Scalars['numeric'] | null
  id?: Scalars['String'] | null
  project_id?: Scalars['String'] | null
  rewardToken_id?: Scalars['String'] | null
  streamEnd?: Scalars['numeric'] | null
  streamStart?: Scalars['numeric'] | null
  streamTotal?: Scalars['numeric'] | null
  totalDistributed?: Scalars['numeric'] | null
  totalVested?: Scalars['numeric'] | null
  updatedAt?: Scalars['numeric'] | null
}

/** order by sum() on columns of table "LevrRewardStream" */
export interface LevrRewardStream_sum_order_by {
  createdAt?: order_by | null
  streamEnd?: order_by | null
  streamStart?: order_by | null
  streamTotal?: order_by | null
  totalDistributed?: order_by | null
  totalVested?: order_by | null
  updatedAt?: order_by | null
}

/** order by var_pop() on columns of table "LevrRewardStream" */
export interface LevrRewardStream_var_pop_order_by {
  createdAt?: order_by | null
  streamEnd?: order_by | null
  streamStart?: order_by | null
  streamTotal?: order_by | null
  totalDistributed?: order_by | null
  totalVested?: order_by | null
  updatedAt?: order_by | null
}

/** order by var_samp() on columns of table "LevrRewardStream" */
export interface LevrRewardStream_var_samp_order_by {
  createdAt?: order_by | null
  streamEnd?: order_by | null
  streamStart?: order_by | null
  streamTotal?: order_by | null
  totalDistributed?: order_by | null
  totalVested?: order_by | null
  updatedAt?: order_by | null
}

/** order by variance() on columns of table "LevrRewardStream" */
export interface LevrRewardStream_variance_order_by {
  createdAt?: order_by | null
  streamEnd?: order_by | null
  streamStart?: order_by | null
  streamTotal?: order_by | null
  totalDistributed?: order_by | null
  totalVested?: order_by | null
  updatedAt?: order_by | null
}

/** columns and relationships of "LevrStakeAction" */
export interface LevrStakeActionGenqlSelection {
  actionType?: boolean | number
  amount?: boolean | number
  blockNumber?: boolean | number
  blockTimestamp?: boolean | number
  id?: boolean | number
  /** An object relationship */
  project?: LevrProjectGenqlSelection
  project_id?: boolean | number
  /** An object relationship */
  staker?: LevrStakerGenqlSelection
  staker_id?: boolean | number
  transactionHash?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

/** order by aggregate values of table "LevrStakeAction" */
export interface LevrStakeAction_aggregate_order_by {
  avg?: LevrStakeAction_avg_order_by | null
  count?: order_by | null
  max?: LevrStakeAction_max_order_by | null
  min?: LevrStakeAction_min_order_by | null
  stddev?: LevrStakeAction_stddev_order_by | null
  stddev_pop?: LevrStakeAction_stddev_pop_order_by | null
  stddev_samp?: LevrStakeAction_stddev_samp_order_by | null
  sum?: LevrStakeAction_sum_order_by | null
  var_pop?: LevrStakeAction_var_pop_order_by | null
  var_samp?: LevrStakeAction_var_samp_order_by | null
  variance?: LevrStakeAction_variance_order_by | null
}

/** order by avg() on columns of table "LevrStakeAction" */
export interface LevrStakeAction_avg_order_by {
  amount?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
}

/** Boolean expression to filter rows from the table "LevrStakeAction". All fields are combined with a logical 'AND'. */
export interface LevrStakeAction_bool_exp {
  _and?: LevrStakeAction_bool_exp[] | null
  _not?: LevrStakeAction_bool_exp | null
  _or?: LevrStakeAction_bool_exp[] | null
  actionType?: String_comparison_exp | null
  amount?: numeric_comparison_exp | null
  blockNumber?: numeric_comparison_exp | null
  blockTimestamp?: numeric_comparison_exp | null
  id?: String_comparison_exp | null
  project?: LevrProject_bool_exp | null
  project_id?: String_comparison_exp | null
  staker?: LevrStaker_bool_exp | null
  staker_id?: String_comparison_exp | null
  transactionHash?: String_comparison_exp | null
}

/** order by max() on columns of table "LevrStakeAction" */
export interface LevrStakeAction_max_order_by {
  actionType?: order_by | null
  amount?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
  id?: order_by | null
  project_id?: order_by | null
  staker_id?: order_by | null
  transactionHash?: order_by | null
}

/** order by min() on columns of table "LevrStakeAction" */
export interface LevrStakeAction_min_order_by {
  actionType?: order_by | null
  amount?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
  id?: order_by | null
  project_id?: order_by | null
  staker_id?: order_by | null
  transactionHash?: order_by | null
}

/** Ordering options when selecting data from "LevrStakeAction". */
export interface LevrStakeAction_order_by {
  actionType?: order_by | null
  amount?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
  id?: order_by | null
  project?: LevrProject_order_by | null
  project_id?: order_by | null
  staker?: LevrStaker_order_by | null
  staker_id?: order_by | null
  transactionHash?: order_by | null
}

/** order by stddev() on columns of table "LevrStakeAction" */
export interface LevrStakeAction_stddev_order_by {
  amount?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
}

/** order by stddev_pop() on columns of table "LevrStakeAction" */
export interface LevrStakeAction_stddev_pop_order_by {
  amount?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
}

/** order by stddev_samp() on columns of table "LevrStakeAction" */
export interface LevrStakeAction_stddev_samp_order_by {
  amount?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
}

/** Streaming cursor of the table "LevrStakeAction" */
export interface LevrStakeAction_stream_cursor_input {
  /** Stream column input with initial value */
  initial_value: LevrStakeAction_stream_cursor_value_input
  /** cursor ordering */
  ordering?: cursor_ordering | null
}

/** Initial value of the column from where the streaming should start */
export interface LevrStakeAction_stream_cursor_value_input {
  actionType?: Scalars['String'] | null
  amount?: Scalars['numeric'] | null
  blockNumber?: Scalars['numeric'] | null
  blockTimestamp?: Scalars['numeric'] | null
  id?: Scalars['String'] | null
  project_id?: Scalars['String'] | null
  staker_id?: Scalars['String'] | null
  transactionHash?: Scalars['String'] | null
}

/** order by sum() on columns of table "LevrStakeAction" */
export interface LevrStakeAction_sum_order_by {
  amount?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
}

/** order by var_pop() on columns of table "LevrStakeAction" */
export interface LevrStakeAction_var_pop_order_by {
  amount?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
}

/** order by var_samp() on columns of table "LevrStakeAction" */
export interface LevrStakeAction_var_samp_order_by {
  amount?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
}

/** order by variance() on columns of table "LevrStakeAction" */
export interface LevrStakeAction_variance_order_by {
  amount?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
}

/** columns and relationships of "LevrStaker" */
export interface LevrStakerGenqlSelection {
  createdAt?: boolean | number
  id?: boolean | number
  /** An object relationship */
  project?: LevrProjectGenqlSelection
  project_id?: boolean | number
  /** An array relationship */
  stakeActions?: LevrStakeActionGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrStakeAction_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrStakeAction_order_by[] | null
      /** filter the rows returned */
      where?: LevrStakeAction_bool_exp | null
    }
  }
  stakeStartTime?: boolean | number
  stakedBalance?: boolean | number
  stakerAddress?: boolean | number
  totalClaimed?: boolean | number
  updatedAt?: boolean | number
  votingPower?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

/** order by aggregate values of table "LevrStaker" */
export interface LevrStaker_aggregate_order_by {
  avg?: LevrStaker_avg_order_by | null
  count?: order_by | null
  max?: LevrStaker_max_order_by | null
  min?: LevrStaker_min_order_by | null
  stddev?: LevrStaker_stddev_order_by | null
  stddev_pop?: LevrStaker_stddev_pop_order_by | null
  stddev_samp?: LevrStaker_stddev_samp_order_by | null
  sum?: LevrStaker_sum_order_by | null
  var_pop?: LevrStaker_var_pop_order_by | null
  var_samp?: LevrStaker_var_samp_order_by | null
  variance?: LevrStaker_variance_order_by | null
}

/** order by avg() on columns of table "LevrStaker" */
export interface LevrStaker_avg_order_by {
  createdAt?: order_by | null
  stakeStartTime?: order_by | null
  stakedBalance?: order_by | null
  totalClaimed?: order_by | null
  updatedAt?: order_by | null
  votingPower?: order_by | null
}

/** Boolean expression to filter rows from the table "LevrStaker". All fields are combined with a logical 'AND'. */
export interface LevrStaker_bool_exp {
  _and?: LevrStaker_bool_exp[] | null
  _not?: LevrStaker_bool_exp | null
  _or?: LevrStaker_bool_exp[] | null
  createdAt?: numeric_comparison_exp | null
  id?: String_comparison_exp | null
  project?: LevrProject_bool_exp | null
  project_id?: String_comparison_exp | null
  stakeActions?: LevrStakeAction_bool_exp | null
  stakeStartTime?: numeric_comparison_exp | null
  stakedBalance?: numeric_comparison_exp | null
  stakerAddress?: String_comparison_exp | null
  totalClaimed?: numeric_comparison_exp | null
  updatedAt?: numeric_comparison_exp | null
  votingPower?: numeric_comparison_exp | null
}

/** order by max() on columns of table "LevrStaker" */
export interface LevrStaker_max_order_by {
  createdAt?: order_by | null
  id?: order_by | null
  project_id?: order_by | null
  stakeStartTime?: order_by | null
  stakedBalance?: order_by | null
  stakerAddress?: order_by | null
  totalClaimed?: order_by | null
  updatedAt?: order_by | null
  votingPower?: order_by | null
}

/** order by min() on columns of table "LevrStaker" */
export interface LevrStaker_min_order_by {
  createdAt?: order_by | null
  id?: order_by | null
  project_id?: order_by | null
  stakeStartTime?: order_by | null
  stakedBalance?: order_by | null
  stakerAddress?: order_by | null
  totalClaimed?: order_by | null
  updatedAt?: order_by | null
  votingPower?: order_by | null
}

/** Ordering options when selecting data from "LevrStaker". */
export interface LevrStaker_order_by {
  createdAt?: order_by | null
  id?: order_by | null
  project?: LevrProject_order_by | null
  project_id?: order_by | null
  stakeActions_aggregate?: LevrStakeAction_aggregate_order_by | null
  stakeStartTime?: order_by | null
  stakedBalance?: order_by | null
  stakerAddress?: order_by | null
  totalClaimed?: order_by | null
  updatedAt?: order_by | null
  votingPower?: order_by | null
}

/** order by stddev() on columns of table "LevrStaker" */
export interface LevrStaker_stddev_order_by {
  createdAt?: order_by | null
  stakeStartTime?: order_by | null
  stakedBalance?: order_by | null
  totalClaimed?: order_by | null
  updatedAt?: order_by | null
  votingPower?: order_by | null
}

/** order by stddev_pop() on columns of table "LevrStaker" */
export interface LevrStaker_stddev_pop_order_by {
  createdAt?: order_by | null
  stakeStartTime?: order_by | null
  stakedBalance?: order_by | null
  totalClaimed?: order_by | null
  updatedAt?: order_by | null
  votingPower?: order_by | null
}

/** order by stddev_samp() on columns of table "LevrStaker" */
export interface LevrStaker_stddev_samp_order_by {
  createdAt?: order_by | null
  stakeStartTime?: order_by | null
  stakedBalance?: order_by | null
  totalClaimed?: order_by | null
  updatedAt?: order_by | null
  votingPower?: order_by | null
}

/** Streaming cursor of the table "LevrStaker" */
export interface LevrStaker_stream_cursor_input {
  /** Stream column input with initial value */
  initial_value: LevrStaker_stream_cursor_value_input
  /** cursor ordering */
  ordering?: cursor_ordering | null
}

/** Initial value of the column from where the streaming should start */
export interface LevrStaker_stream_cursor_value_input {
  createdAt?: Scalars['numeric'] | null
  id?: Scalars['String'] | null
  project_id?: Scalars['String'] | null
  stakeStartTime?: Scalars['numeric'] | null
  stakedBalance?: Scalars['numeric'] | null
  stakerAddress?: Scalars['String'] | null
  totalClaimed?: Scalars['numeric'] | null
  updatedAt?: Scalars['numeric'] | null
  votingPower?: Scalars['numeric'] | null
}

/** order by sum() on columns of table "LevrStaker" */
export interface LevrStaker_sum_order_by {
  createdAt?: order_by | null
  stakeStartTime?: order_by | null
  stakedBalance?: order_by | null
  totalClaimed?: order_by | null
  updatedAt?: order_by | null
  votingPower?: order_by | null
}

/** order by var_pop() on columns of table "LevrStaker" */
export interface LevrStaker_var_pop_order_by {
  createdAt?: order_by | null
  stakeStartTime?: order_by | null
  stakedBalance?: order_by | null
  totalClaimed?: order_by | null
  updatedAt?: order_by | null
  votingPower?: order_by | null
}

/** order by var_samp() on columns of table "LevrStaker" */
export interface LevrStaker_var_samp_order_by {
  createdAt?: order_by | null
  stakeStartTime?: order_by | null
  stakedBalance?: order_by | null
  totalClaimed?: order_by | null
  updatedAt?: order_by | null
  votingPower?: order_by | null
}

/** order by variance() on columns of table "LevrStaker" */
export interface LevrStaker_variance_order_by {
  createdAt?: order_by | null
  stakeStartTime?: order_by | null
  stakedBalance?: order_by | null
  totalClaimed?: order_by | null
  updatedAt?: order_by | null
  votingPower?: order_by | null
}

/** columns and relationships of "LevrTreasuryTransfer" */
export interface LevrTreasuryTransferGenqlSelection {
  amount?: boolean | number
  blockNumber?: boolean | number
  blockTimestamp?: boolean | number
  id?: boolean | number
  /** An object relationship */
  project?: LevrProjectGenqlSelection
  project_id?: boolean | number
  to?: boolean | number
  /** An object relationship */
  token?: TokenGenqlSelection
  token_id?: boolean | number
  transactionHash?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

/** order by aggregate values of table "LevrTreasuryTransfer" */
export interface LevrTreasuryTransfer_aggregate_order_by {
  avg?: LevrTreasuryTransfer_avg_order_by | null
  count?: order_by | null
  max?: LevrTreasuryTransfer_max_order_by | null
  min?: LevrTreasuryTransfer_min_order_by | null
  stddev?: LevrTreasuryTransfer_stddev_order_by | null
  stddev_pop?: LevrTreasuryTransfer_stddev_pop_order_by | null
  stddev_samp?: LevrTreasuryTransfer_stddev_samp_order_by | null
  sum?: LevrTreasuryTransfer_sum_order_by | null
  var_pop?: LevrTreasuryTransfer_var_pop_order_by | null
  var_samp?: LevrTreasuryTransfer_var_samp_order_by | null
  variance?: LevrTreasuryTransfer_variance_order_by | null
}

/** order by avg() on columns of table "LevrTreasuryTransfer" */
export interface LevrTreasuryTransfer_avg_order_by {
  amount?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
}

/** Boolean expression to filter rows from the table "LevrTreasuryTransfer". All fields are combined with a logical 'AND'. */
export interface LevrTreasuryTransfer_bool_exp {
  _and?: LevrTreasuryTransfer_bool_exp[] | null
  _not?: LevrTreasuryTransfer_bool_exp | null
  _or?: LevrTreasuryTransfer_bool_exp[] | null
  amount?: numeric_comparison_exp | null
  blockNumber?: numeric_comparison_exp | null
  blockTimestamp?: numeric_comparison_exp | null
  id?: String_comparison_exp | null
  project?: LevrProject_bool_exp | null
  project_id?: String_comparison_exp | null
  to?: String_comparison_exp | null
  token?: Token_bool_exp | null
  token_id?: String_comparison_exp | null
  transactionHash?: String_comparison_exp | null
}

/** order by max() on columns of table "LevrTreasuryTransfer" */
export interface LevrTreasuryTransfer_max_order_by {
  amount?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
  id?: order_by | null
  project_id?: order_by | null
  to?: order_by | null
  token_id?: order_by | null
  transactionHash?: order_by | null
}

/** order by min() on columns of table "LevrTreasuryTransfer" */
export interface LevrTreasuryTransfer_min_order_by {
  amount?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
  id?: order_by | null
  project_id?: order_by | null
  to?: order_by | null
  token_id?: order_by | null
  transactionHash?: order_by | null
}

/** Ordering options when selecting data from "LevrTreasuryTransfer". */
export interface LevrTreasuryTransfer_order_by {
  amount?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
  id?: order_by | null
  project?: LevrProject_order_by | null
  project_id?: order_by | null
  to?: order_by | null
  token?: Token_order_by | null
  token_id?: order_by | null
  transactionHash?: order_by | null
}

/** order by stddev() on columns of table "LevrTreasuryTransfer" */
export interface LevrTreasuryTransfer_stddev_order_by {
  amount?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
}

/** order by stddev_pop() on columns of table "LevrTreasuryTransfer" */
export interface LevrTreasuryTransfer_stddev_pop_order_by {
  amount?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
}

/** order by stddev_samp() on columns of table "LevrTreasuryTransfer" */
export interface LevrTreasuryTransfer_stddev_samp_order_by {
  amount?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
}

/** Streaming cursor of the table "LevrTreasuryTransfer" */
export interface LevrTreasuryTransfer_stream_cursor_input {
  /** Stream column input with initial value */
  initial_value: LevrTreasuryTransfer_stream_cursor_value_input
  /** cursor ordering */
  ordering?: cursor_ordering | null
}

/** Initial value of the column from where the streaming should start */
export interface LevrTreasuryTransfer_stream_cursor_value_input {
  amount?: Scalars['numeric'] | null
  blockNumber?: Scalars['numeric'] | null
  blockTimestamp?: Scalars['numeric'] | null
  id?: Scalars['String'] | null
  project_id?: Scalars['String'] | null
  to?: Scalars['String'] | null
  token_id?: Scalars['String'] | null
  transactionHash?: Scalars['String'] | null
}

/** order by sum() on columns of table "LevrTreasuryTransfer" */
export interface LevrTreasuryTransfer_sum_order_by {
  amount?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
}

/** order by var_pop() on columns of table "LevrTreasuryTransfer" */
export interface LevrTreasuryTransfer_var_pop_order_by {
  amount?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
}

/** order by var_samp() on columns of table "LevrTreasuryTransfer" */
export interface LevrTreasuryTransfer_var_samp_order_by {
  amount?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
}

/** order by variance() on columns of table "LevrTreasuryTransfer" */
export interface LevrTreasuryTransfer_variance_order_by {
  amount?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
}

/** columns and relationships of "LevrVote" */
export interface LevrVoteGenqlSelection {
  blockTimestamp?: boolean | number
  id?: boolean | number
  /** An object relationship */
  proposal?: LevrProposalGenqlSelection
  proposal_id?: boolean | number
  support?: boolean | number
  transactionHash?: boolean | number
  voter?: boolean | number
  votes?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

/** order by aggregate values of table "LevrVote" */
export interface LevrVote_aggregate_order_by {
  avg?: LevrVote_avg_order_by | null
  count?: order_by | null
  max?: LevrVote_max_order_by | null
  min?: LevrVote_min_order_by | null
  stddev?: LevrVote_stddev_order_by | null
  stddev_pop?: LevrVote_stddev_pop_order_by | null
  stddev_samp?: LevrVote_stddev_samp_order_by | null
  sum?: LevrVote_sum_order_by | null
  var_pop?: LevrVote_var_pop_order_by | null
  var_samp?: LevrVote_var_samp_order_by | null
  variance?: LevrVote_variance_order_by | null
}

/** order by avg() on columns of table "LevrVote" */
export interface LevrVote_avg_order_by {
  blockTimestamp?: order_by | null
  votes?: order_by | null
}

/** Boolean expression to filter rows from the table "LevrVote". All fields are combined with a logical 'AND'. */
export interface LevrVote_bool_exp {
  _and?: LevrVote_bool_exp[] | null
  _not?: LevrVote_bool_exp | null
  _or?: LevrVote_bool_exp[] | null
  blockTimestamp?: numeric_comparison_exp | null
  id?: String_comparison_exp | null
  proposal?: LevrProposal_bool_exp | null
  proposal_id?: String_comparison_exp | null
  support?: Boolean_comparison_exp | null
  transactionHash?: String_comparison_exp | null
  voter?: String_comparison_exp | null
  votes?: numeric_comparison_exp | null
}

/** order by max() on columns of table "LevrVote" */
export interface LevrVote_max_order_by {
  blockTimestamp?: order_by | null
  id?: order_by | null
  proposal_id?: order_by | null
  transactionHash?: order_by | null
  voter?: order_by | null
  votes?: order_by | null
}

/** order by min() on columns of table "LevrVote" */
export interface LevrVote_min_order_by {
  blockTimestamp?: order_by | null
  id?: order_by | null
  proposal_id?: order_by | null
  transactionHash?: order_by | null
  voter?: order_by | null
  votes?: order_by | null
}

/** Ordering options when selecting data from "LevrVote". */
export interface LevrVote_order_by {
  blockTimestamp?: order_by | null
  id?: order_by | null
  proposal?: LevrProposal_order_by | null
  proposal_id?: order_by | null
  support?: order_by | null
  transactionHash?: order_by | null
  voter?: order_by | null
  votes?: order_by | null
}

/** order by stddev() on columns of table "LevrVote" */
export interface LevrVote_stddev_order_by {
  blockTimestamp?: order_by | null
  votes?: order_by | null
}

/** order by stddev_pop() on columns of table "LevrVote" */
export interface LevrVote_stddev_pop_order_by {
  blockTimestamp?: order_by | null
  votes?: order_by | null
}

/** order by stddev_samp() on columns of table "LevrVote" */
export interface LevrVote_stddev_samp_order_by {
  blockTimestamp?: order_by | null
  votes?: order_by | null
}

/** Streaming cursor of the table "LevrVote" */
export interface LevrVote_stream_cursor_input {
  /** Stream column input with initial value */
  initial_value: LevrVote_stream_cursor_value_input
  /** cursor ordering */
  ordering?: cursor_ordering | null
}

/** Initial value of the column from where the streaming should start */
export interface LevrVote_stream_cursor_value_input {
  blockTimestamp?: Scalars['numeric'] | null
  id?: Scalars['String'] | null
  proposal_id?: Scalars['String'] | null
  support?: Scalars['Boolean'] | null
  transactionHash?: Scalars['String'] | null
  voter?: Scalars['String'] | null
  votes?: Scalars['numeric'] | null
}

/** order by sum() on columns of table "LevrVote" */
export interface LevrVote_sum_order_by {
  blockTimestamp?: order_by | null
  votes?: order_by | null
}

/** order by var_pop() on columns of table "LevrVote" */
export interface LevrVote_var_pop_order_by {
  blockTimestamp?: order_by | null
  votes?: order_by | null
}

/** order by var_samp() on columns of table "LevrVote" */
export interface LevrVote_var_samp_order_by {
  blockTimestamp?: order_by | null
  votes?: order_by | null
}

/** order by variance() on columns of table "LevrVote" */
export interface LevrVote_variance_order_by {
  blockTimestamp?: order_by | null
  votes?: order_by | null
}

/** columns and relationships of "MoneyMachine" */
export interface MoneyMachineGenqlSelection {
  activePositions?: boolean | number
  id?: boolean | number
  lastHeartbeatBlock?: boolean | number
  totalHeartbeats?: boolean | number
  totalPositions?: boolean | number
  totalRebalances?: boolean | number
  updatedAt?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

/** columns and relationships of "MoneyMachineConfig" */
export interface MoneyMachineConfigGenqlSelection {
  callerIncentive?: boolean | number
  feeRecipient?: boolean | number
  formula?: boolean | number
  heartbeatInterval?: boolean | number
  hook?: boolean | number
  id?: boolean | number
  poolManager?: boolean | number
  protocolFeeBps?: boolean | number
  rebalanceGas?: boolean | number
  tickAggregator?: boolean | number
  updatedAt?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

/** Boolean expression to filter rows from the table "MoneyMachineConfig". All fields are combined with a logical 'AND'. */
export interface MoneyMachineConfig_bool_exp {
  _and?: MoneyMachineConfig_bool_exp[] | null
  _not?: MoneyMachineConfig_bool_exp | null
  _or?: MoneyMachineConfig_bool_exp[] | null
  callerIncentive?: numeric_comparison_exp | null
  feeRecipient?: String_comparison_exp | null
  formula?: String_comparison_exp | null
  heartbeatInterval?: numeric_comparison_exp | null
  hook?: String_comparison_exp | null
  id?: String_comparison_exp | null
  poolManager?: String_comparison_exp | null
  protocolFeeBps?: numeric_comparison_exp | null
  rebalanceGas?: numeric_comparison_exp | null
  tickAggregator?: String_comparison_exp | null
  updatedAt?: numeric_comparison_exp | null
}

/** Ordering options when selecting data from "MoneyMachineConfig". */
export interface MoneyMachineConfig_order_by {
  callerIncentive?: order_by | null
  feeRecipient?: order_by | null
  formula?: order_by | null
  heartbeatInterval?: order_by | null
  hook?: order_by | null
  id?: order_by | null
  poolManager?: order_by | null
  protocolFeeBps?: order_by | null
  rebalanceGas?: order_by | null
  tickAggregator?: order_by | null
  updatedAt?: order_by | null
}

/** Streaming cursor of the table "MoneyMachineConfig" */
export interface MoneyMachineConfig_stream_cursor_input {
  /** Stream column input with initial value */
  initial_value: MoneyMachineConfig_stream_cursor_value_input
  /** cursor ordering */
  ordering?: cursor_ordering | null
}

/** Initial value of the column from where the streaming should start */
export interface MoneyMachineConfig_stream_cursor_value_input {
  callerIncentive?: Scalars['numeric'] | null
  feeRecipient?: Scalars['String'] | null
  formula?: Scalars['String'] | null
  heartbeatInterval?: Scalars['numeric'] | null
  hook?: Scalars['String'] | null
  id?: Scalars['String'] | null
  poolManager?: Scalars['String'] | null
  protocolFeeBps?: Scalars['numeric'] | null
  rebalanceGas?: Scalars['numeric'] | null
  tickAggregator?: Scalars['String'] | null
  updatedAt?: Scalars['numeric'] | null
}

/** columns and relationships of "MoneyMachineHeartbeat" */
export interface MoneyMachineHeartbeatGenqlSelection {
  blockNumber?: boolean | number
  blockTimestamp?: boolean | number
  caller?: boolean | number
  id?: boolean | number
  incentivePaid?: boolean | number
  positionsProcessed?: boolean | number
  rebalancesExecuted?: boolean | number
  transactionHash?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

/** Boolean expression to filter rows from the table "MoneyMachineHeartbeat". All fields are combined with a logical 'AND'. */
export interface MoneyMachineHeartbeat_bool_exp {
  _and?: MoneyMachineHeartbeat_bool_exp[] | null
  _not?: MoneyMachineHeartbeat_bool_exp | null
  _or?: MoneyMachineHeartbeat_bool_exp[] | null
  blockNumber?: numeric_comparison_exp | null
  blockTimestamp?: numeric_comparison_exp | null
  caller?: String_comparison_exp | null
  id?: String_comparison_exp | null
  incentivePaid?: numeric_comparison_exp | null
  positionsProcessed?: numeric_comparison_exp | null
  rebalancesExecuted?: numeric_comparison_exp | null
  transactionHash?: String_comparison_exp | null
}

/** Ordering options when selecting data from "MoneyMachineHeartbeat". */
export interface MoneyMachineHeartbeat_order_by {
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
  caller?: order_by | null
  id?: order_by | null
  incentivePaid?: order_by | null
  positionsProcessed?: order_by | null
  rebalancesExecuted?: order_by | null
  transactionHash?: order_by | null
}

/** Streaming cursor of the table "MoneyMachineHeartbeat" */
export interface MoneyMachineHeartbeat_stream_cursor_input {
  /** Stream column input with initial value */
  initial_value: MoneyMachineHeartbeat_stream_cursor_value_input
  /** cursor ordering */
  ordering?: cursor_ordering | null
}

/** Initial value of the column from where the streaming should start */
export interface MoneyMachineHeartbeat_stream_cursor_value_input {
  blockNumber?: Scalars['numeric'] | null
  blockTimestamp?: Scalars['numeric'] | null
  caller?: Scalars['String'] | null
  id?: Scalars['String'] | null
  incentivePaid?: Scalars['numeric'] | null
  positionsProcessed?: Scalars['numeric'] | null
  rebalancesExecuted?: Scalars['numeric'] | null
  transactionHash?: Scalars['String'] | null
}

/** columns and relationships of "MoneyMachinePosition" */
export interface MoneyMachinePositionGenqlSelection {
  active?: boolean | number
  amountQuote?: boolean | number
  amountToken?: boolean | number
  closedAt?: boolean | number
  createdAt?: boolean | number
  createdTxHash?: boolean | number
  feesPaidQuote?: boolean | number
  feesPaidToken?: boolean | number
  id?: boolean | number
  originalTickLower?: boolean | number
  /** An object relationship */
  owner?: MoneyMachineUserGenqlSelection
  owner_id?: boolean | number
  /** An object relationship */
  pool?: UniswapV4PoolGenqlSelection
  pool_id?: boolean | number
  proceedsQuote?: boolean | number
  proceedsToken?: boolean | number
  /** An object relationship */
  quoteToken?: TokenGenqlSelection
  quoteToken_id?: boolean | number
  rebalanceCount?: boolean | number
  /** An array relationship */
  rebalances?: MoneyMachineRebalanceGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: MoneyMachineRebalance_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: MoneyMachineRebalance_order_by[] | null
      /** filter the rows returned */
      where?: MoneyMachineRebalance_bool_exp | null
    }
  }
  tickLower?: boolean | number
  tickUpper?: boolean | number
  /** An object relationship */
  token?: TokenGenqlSelection
  token_id?: boolean | number
  updatedAt?: boolean | number
  /** An array relationship */
  v3PriceSources?: MoneyMachinePositionV3PriceSourceGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: MoneyMachinePositionV3PriceSource_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: MoneyMachinePositionV3PriceSource_order_by[] | null
      /** filter the rows returned */
      where?: MoneyMachinePositionV3PriceSource_bool_exp | null
    }
  }
  /** An array relationship */
  v4PriceSources?: MoneyMachinePositionV4PriceSourceGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: MoneyMachinePositionV4PriceSource_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: MoneyMachinePositionV4PriceSource_order_by[] | null
      /** filter the rows returned */
      where?: MoneyMachinePositionV4PriceSource_bool_exp | null
    }
  }
  /** An array relationship */
  withdrawals?: MoneyMachineWithdrawalGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: MoneyMachineWithdrawal_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: MoneyMachineWithdrawal_order_by[] | null
      /** filter the rows returned */
      where?: MoneyMachineWithdrawal_bool_exp | null
    }
  }
  withdrawnQuote?: boolean | number
  withdrawnToken?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

/** columns and relationships of "MoneyMachinePositionV3PriceSource" */
export interface MoneyMachinePositionV3PriceSourceGenqlSelection {
  id?: boolean | number
  /** An object relationship */
  pool?: UniswapV3PoolGenqlSelection
  pool_id?: boolean | number
  /** An object relationship */
  position?: MoneyMachinePositionGenqlSelection
  position_id?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

/** order by aggregate values of table "MoneyMachinePositionV3PriceSource" */
export interface MoneyMachinePositionV3PriceSource_aggregate_order_by {
  count?: order_by | null
  max?: MoneyMachinePositionV3PriceSource_max_order_by | null
  min?: MoneyMachinePositionV3PriceSource_min_order_by | null
}

/** Boolean expression to filter rows from the table "MoneyMachinePositionV3PriceSource". All fields are combined with a logical 'AND'. */
export interface MoneyMachinePositionV3PriceSource_bool_exp {
  _and?: MoneyMachinePositionV3PriceSource_bool_exp[] | null
  _not?: MoneyMachinePositionV3PriceSource_bool_exp | null
  _or?: MoneyMachinePositionV3PriceSource_bool_exp[] | null
  id?: String_comparison_exp | null
  pool?: UniswapV3Pool_bool_exp | null
  pool_id?: String_comparison_exp | null
  position?: MoneyMachinePosition_bool_exp | null
  position_id?: String_comparison_exp | null
}

/** order by max() on columns of table "MoneyMachinePositionV3PriceSource" */
export interface MoneyMachinePositionV3PriceSource_max_order_by {
  id?: order_by | null
  pool_id?: order_by | null
  position_id?: order_by | null
}

/** order by min() on columns of table "MoneyMachinePositionV3PriceSource" */
export interface MoneyMachinePositionV3PriceSource_min_order_by {
  id?: order_by | null
  pool_id?: order_by | null
  position_id?: order_by | null
}

/** Ordering options when selecting data from "MoneyMachinePositionV3PriceSource". */
export interface MoneyMachinePositionV3PriceSource_order_by {
  id?: order_by | null
  pool?: UniswapV3Pool_order_by | null
  pool_id?: order_by | null
  position?: MoneyMachinePosition_order_by | null
  position_id?: order_by | null
}

/** Streaming cursor of the table "MoneyMachinePositionV3PriceSource" */
export interface MoneyMachinePositionV3PriceSource_stream_cursor_input {
  /** Stream column input with initial value */
  initial_value: MoneyMachinePositionV3PriceSource_stream_cursor_value_input
  /** cursor ordering */
  ordering?: cursor_ordering | null
}

/** Initial value of the column from where the streaming should start */
export interface MoneyMachinePositionV3PriceSource_stream_cursor_value_input {
  id?: Scalars['String'] | null
  pool_id?: Scalars['String'] | null
  position_id?: Scalars['String'] | null
}

/** columns and relationships of "MoneyMachinePositionV4PriceSource" */
export interface MoneyMachinePositionV4PriceSourceGenqlSelection {
  id?: boolean | number
  /** An object relationship */
  pool?: UniswapV4PoolGenqlSelection
  pool_id?: boolean | number
  /** An object relationship */
  position?: MoneyMachinePositionGenqlSelection
  position_id?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

/** order by aggregate values of table "MoneyMachinePositionV4PriceSource" */
export interface MoneyMachinePositionV4PriceSource_aggregate_order_by {
  count?: order_by | null
  max?: MoneyMachinePositionV4PriceSource_max_order_by | null
  min?: MoneyMachinePositionV4PriceSource_min_order_by | null
}

/** Boolean expression to filter rows from the table "MoneyMachinePositionV4PriceSource". All fields are combined with a logical 'AND'. */
export interface MoneyMachinePositionV4PriceSource_bool_exp {
  _and?: MoneyMachinePositionV4PriceSource_bool_exp[] | null
  _not?: MoneyMachinePositionV4PriceSource_bool_exp | null
  _or?: MoneyMachinePositionV4PriceSource_bool_exp[] | null
  id?: String_comparison_exp | null
  pool?: UniswapV4Pool_bool_exp | null
  pool_id?: String_comparison_exp | null
  position?: MoneyMachinePosition_bool_exp | null
  position_id?: String_comparison_exp | null
}

/** order by max() on columns of table "MoneyMachinePositionV4PriceSource" */
export interface MoneyMachinePositionV4PriceSource_max_order_by {
  id?: order_by | null
  pool_id?: order_by | null
  position_id?: order_by | null
}

/** order by min() on columns of table "MoneyMachinePositionV4PriceSource" */
export interface MoneyMachinePositionV4PriceSource_min_order_by {
  id?: order_by | null
  pool_id?: order_by | null
  position_id?: order_by | null
}

/** Ordering options when selecting data from "MoneyMachinePositionV4PriceSource". */
export interface MoneyMachinePositionV4PriceSource_order_by {
  id?: order_by | null
  pool?: UniswapV4Pool_order_by | null
  pool_id?: order_by | null
  position?: MoneyMachinePosition_order_by | null
  position_id?: order_by | null
}

/** Streaming cursor of the table "MoneyMachinePositionV4PriceSource" */
export interface MoneyMachinePositionV4PriceSource_stream_cursor_input {
  /** Stream column input with initial value */
  initial_value: MoneyMachinePositionV4PriceSource_stream_cursor_value_input
  /** cursor ordering */
  ordering?: cursor_ordering | null
}

/** Initial value of the column from where the streaming should start */
export interface MoneyMachinePositionV4PriceSource_stream_cursor_value_input {
  id?: Scalars['String'] | null
  pool_id?: Scalars['String'] | null
  position_id?: Scalars['String'] | null
}

/** order by aggregate values of table "MoneyMachinePosition" */
export interface MoneyMachinePosition_aggregate_order_by {
  avg?: MoneyMachinePosition_avg_order_by | null
  count?: order_by | null
  max?: MoneyMachinePosition_max_order_by | null
  min?: MoneyMachinePosition_min_order_by | null
  stddev?: MoneyMachinePosition_stddev_order_by | null
  stddev_pop?: MoneyMachinePosition_stddev_pop_order_by | null
  stddev_samp?: MoneyMachinePosition_stddev_samp_order_by | null
  sum?: MoneyMachinePosition_sum_order_by | null
  var_pop?: MoneyMachinePosition_var_pop_order_by | null
  var_samp?: MoneyMachinePosition_var_samp_order_by | null
  variance?: MoneyMachinePosition_variance_order_by | null
}

/** order by avg() on columns of table "MoneyMachinePosition" */
export interface MoneyMachinePosition_avg_order_by {
  amountQuote?: order_by | null
  amountToken?: order_by | null
  closedAt?: order_by | null
  createdAt?: order_by | null
  feesPaidQuote?: order_by | null
  feesPaidToken?: order_by | null
  originalTickLower?: order_by | null
  proceedsQuote?: order_by | null
  proceedsToken?: order_by | null
  rebalanceCount?: order_by | null
  tickLower?: order_by | null
  tickUpper?: order_by | null
  updatedAt?: order_by | null
  withdrawnQuote?: order_by | null
  withdrawnToken?: order_by | null
}

/** Boolean expression to filter rows from the table "MoneyMachinePosition". All fields are combined with a logical 'AND'. */
export interface MoneyMachinePosition_bool_exp {
  _and?: MoneyMachinePosition_bool_exp[] | null
  _not?: MoneyMachinePosition_bool_exp | null
  _or?: MoneyMachinePosition_bool_exp[] | null
  active?: Boolean_comparison_exp | null
  amountQuote?: numeric_comparison_exp | null
  amountToken?: numeric_comparison_exp | null
  closedAt?: numeric_comparison_exp | null
  createdAt?: numeric_comparison_exp | null
  createdTxHash?: String_comparison_exp | null
  feesPaidQuote?: numeric_comparison_exp | null
  feesPaidToken?: numeric_comparison_exp | null
  id?: String_comparison_exp | null
  originalTickLower?: Int_comparison_exp | null
  owner?: MoneyMachineUser_bool_exp | null
  owner_id?: String_comparison_exp | null
  pool?: UniswapV4Pool_bool_exp | null
  pool_id?: String_comparison_exp | null
  proceedsQuote?: numeric_comparison_exp | null
  proceedsToken?: numeric_comparison_exp | null
  quoteToken?: Token_bool_exp | null
  quoteToken_id?: String_comparison_exp | null
  rebalanceCount?: numeric_comparison_exp | null
  rebalances?: MoneyMachineRebalance_bool_exp | null
  tickLower?: Int_comparison_exp | null
  tickUpper?: Int_comparison_exp | null
  token?: Token_bool_exp | null
  token_id?: String_comparison_exp | null
  updatedAt?: numeric_comparison_exp | null
  v3PriceSources?: MoneyMachinePositionV3PriceSource_bool_exp | null
  v4PriceSources?: MoneyMachinePositionV4PriceSource_bool_exp | null
  withdrawals?: MoneyMachineWithdrawal_bool_exp | null
  withdrawnQuote?: numeric_comparison_exp | null
  withdrawnToken?: numeric_comparison_exp | null
}

/** order by max() on columns of table "MoneyMachinePosition" */
export interface MoneyMachinePosition_max_order_by {
  amountQuote?: order_by | null
  amountToken?: order_by | null
  closedAt?: order_by | null
  createdAt?: order_by | null
  createdTxHash?: order_by | null
  feesPaidQuote?: order_by | null
  feesPaidToken?: order_by | null
  id?: order_by | null
  originalTickLower?: order_by | null
  owner_id?: order_by | null
  pool_id?: order_by | null
  proceedsQuote?: order_by | null
  proceedsToken?: order_by | null
  quoteToken_id?: order_by | null
  rebalanceCount?: order_by | null
  tickLower?: order_by | null
  tickUpper?: order_by | null
  token_id?: order_by | null
  updatedAt?: order_by | null
  withdrawnQuote?: order_by | null
  withdrawnToken?: order_by | null
}

/** order by min() on columns of table "MoneyMachinePosition" */
export interface MoneyMachinePosition_min_order_by {
  amountQuote?: order_by | null
  amountToken?: order_by | null
  closedAt?: order_by | null
  createdAt?: order_by | null
  createdTxHash?: order_by | null
  feesPaidQuote?: order_by | null
  feesPaidToken?: order_by | null
  id?: order_by | null
  originalTickLower?: order_by | null
  owner_id?: order_by | null
  pool_id?: order_by | null
  proceedsQuote?: order_by | null
  proceedsToken?: order_by | null
  quoteToken_id?: order_by | null
  rebalanceCount?: order_by | null
  tickLower?: order_by | null
  tickUpper?: order_by | null
  token_id?: order_by | null
  updatedAt?: order_by | null
  withdrawnQuote?: order_by | null
  withdrawnToken?: order_by | null
}

/** Ordering options when selecting data from "MoneyMachinePosition". */
export interface MoneyMachinePosition_order_by {
  active?: order_by | null
  amountQuote?: order_by | null
  amountToken?: order_by | null
  closedAt?: order_by | null
  createdAt?: order_by | null
  createdTxHash?: order_by | null
  feesPaidQuote?: order_by | null
  feesPaidToken?: order_by | null
  id?: order_by | null
  originalTickLower?: order_by | null
  owner?: MoneyMachineUser_order_by | null
  owner_id?: order_by | null
  pool?: UniswapV4Pool_order_by | null
  pool_id?: order_by | null
  proceedsQuote?: order_by | null
  proceedsToken?: order_by | null
  quoteToken?: Token_order_by | null
  quoteToken_id?: order_by | null
  rebalanceCount?: order_by | null
  rebalances_aggregate?: MoneyMachineRebalance_aggregate_order_by | null
  tickLower?: order_by | null
  tickUpper?: order_by | null
  token?: Token_order_by | null
  token_id?: order_by | null
  updatedAt?: order_by | null
  v3PriceSources_aggregate?: MoneyMachinePositionV3PriceSource_aggregate_order_by | null
  v4PriceSources_aggregate?: MoneyMachinePositionV4PriceSource_aggregate_order_by | null
  withdrawals_aggregate?: MoneyMachineWithdrawal_aggregate_order_by | null
  withdrawnQuote?: order_by | null
  withdrawnToken?: order_by | null
}

/** order by stddev() on columns of table "MoneyMachinePosition" */
export interface MoneyMachinePosition_stddev_order_by {
  amountQuote?: order_by | null
  amountToken?: order_by | null
  closedAt?: order_by | null
  createdAt?: order_by | null
  feesPaidQuote?: order_by | null
  feesPaidToken?: order_by | null
  originalTickLower?: order_by | null
  proceedsQuote?: order_by | null
  proceedsToken?: order_by | null
  rebalanceCount?: order_by | null
  tickLower?: order_by | null
  tickUpper?: order_by | null
  updatedAt?: order_by | null
  withdrawnQuote?: order_by | null
  withdrawnToken?: order_by | null
}

/** order by stddev_pop() on columns of table "MoneyMachinePosition" */
export interface MoneyMachinePosition_stddev_pop_order_by {
  amountQuote?: order_by | null
  amountToken?: order_by | null
  closedAt?: order_by | null
  createdAt?: order_by | null
  feesPaidQuote?: order_by | null
  feesPaidToken?: order_by | null
  originalTickLower?: order_by | null
  proceedsQuote?: order_by | null
  proceedsToken?: order_by | null
  rebalanceCount?: order_by | null
  tickLower?: order_by | null
  tickUpper?: order_by | null
  updatedAt?: order_by | null
  withdrawnQuote?: order_by | null
  withdrawnToken?: order_by | null
}

/** order by stddev_samp() on columns of table "MoneyMachinePosition" */
export interface MoneyMachinePosition_stddev_samp_order_by {
  amountQuote?: order_by | null
  amountToken?: order_by | null
  closedAt?: order_by | null
  createdAt?: order_by | null
  feesPaidQuote?: order_by | null
  feesPaidToken?: order_by | null
  originalTickLower?: order_by | null
  proceedsQuote?: order_by | null
  proceedsToken?: order_by | null
  rebalanceCount?: order_by | null
  tickLower?: order_by | null
  tickUpper?: order_by | null
  updatedAt?: order_by | null
  withdrawnQuote?: order_by | null
  withdrawnToken?: order_by | null
}

/** Streaming cursor of the table "MoneyMachinePosition" */
export interface MoneyMachinePosition_stream_cursor_input {
  /** Stream column input with initial value */
  initial_value: MoneyMachinePosition_stream_cursor_value_input
  /** cursor ordering */
  ordering?: cursor_ordering | null
}

/** Initial value of the column from where the streaming should start */
export interface MoneyMachinePosition_stream_cursor_value_input {
  active?: Scalars['Boolean'] | null
  amountQuote?: Scalars['numeric'] | null
  amountToken?: Scalars['numeric'] | null
  closedAt?: Scalars['numeric'] | null
  createdAt?: Scalars['numeric'] | null
  createdTxHash?: Scalars['String'] | null
  feesPaidQuote?: Scalars['numeric'] | null
  feesPaidToken?: Scalars['numeric'] | null
  id?: Scalars['String'] | null
  originalTickLower?: Scalars['Int'] | null
  owner_id?: Scalars['String'] | null
  pool_id?: Scalars['String'] | null
  proceedsQuote?: Scalars['numeric'] | null
  proceedsToken?: Scalars['numeric'] | null
  quoteToken_id?: Scalars['String'] | null
  rebalanceCount?: Scalars['numeric'] | null
  tickLower?: Scalars['Int'] | null
  tickUpper?: Scalars['Int'] | null
  token_id?: Scalars['String'] | null
  updatedAt?: Scalars['numeric'] | null
  withdrawnQuote?: Scalars['numeric'] | null
  withdrawnToken?: Scalars['numeric'] | null
}

/** order by sum() on columns of table "MoneyMachinePosition" */
export interface MoneyMachinePosition_sum_order_by {
  amountQuote?: order_by | null
  amountToken?: order_by | null
  closedAt?: order_by | null
  createdAt?: order_by | null
  feesPaidQuote?: order_by | null
  feesPaidToken?: order_by | null
  originalTickLower?: order_by | null
  proceedsQuote?: order_by | null
  proceedsToken?: order_by | null
  rebalanceCount?: order_by | null
  tickLower?: order_by | null
  tickUpper?: order_by | null
  updatedAt?: order_by | null
  withdrawnQuote?: order_by | null
  withdrawnToken?: order_by | null
}

/** order by var_pop() on columns of table "MoneyMachinePosition" */
export interface MoneyMachinePosition_var_pop_order_by {
  amountQuote?: order_by | null
  amountToken?: order_by | null
  closedAt?: order_by | null
  createdAt?: order_by | null
  feesPaidQuote?: order_by | null
  feesPaidToken?: order_by | null
  originalTickLower?: order_by | null
  proceedsQuote?: order_by | null
  proceedsToken?: order_by | null
  rebalanceCount?: order_by | null
  tickLower?: order_by | null
  tickUpper?: order_by | null
  updatedAt?: order_by | null
  withdrawnQuote?: order_by | null
  withdrawnToken?: order_by | null
}

/** order by var_samp() on columns of table "MoneyMachinePosition" */
export interface MoneyMachinePosition_var_samp_order_by {
  amountQuote?: order_by | null
  amountToken?: order_by | null
  closedAt?: order_by | null
  createdAt?: order_by | null
  feesPaidQuote?: order_by | null
  feesPaidToken?: order_by | null
  originalTickLower?: order_by | null
  proceedsQuote?: order_by | null
  proceedsToken?: order_by | null
  rebalanceCount?: order_by | null
  tickLower?: order_by | null
  tickUpper?: order_by | null
  updatedAt?: order_by | null
  withdrawnQuote?: order_by | null
  withdrawnToken?: order_by | null
}

/** order by variance() on columns of table "MoneyMachinePosition" */
export interface MoneyMachinePosition_variance_order_by {
  amountQuote?: order_by | null
  amountToken?: order_by | null
  closedAt?: order_by | null
  createdAt?: order_by | null
  feesPaidQuote?: order_by | null
  feesPaidToken?: order_by | null
  originalTickLower?: order_by | null
  proceedsQuote?: order_by | null
  proceedsToken?: order_by | null
  rebalanceCount?: order_by | null
  tickLower?: order_by | null
  tickUpper?: order_by | null
  updatedAt?: order_by | null
  withdrawnQuote?: order_by | null
  withdrawnToken?: order_by | null
}

/** columns and relationships of "MoneyMachineRebalance" */
export interface MoneyMachineRebalanceGenqlSelection {
  blockNumber?: boolean | number
  blockTimestamp?: boolean | number
  id?: boolean | number
  newTickLower?: boolean | number
  newTickUpper?: boolean | number
  oldTickLower?: boolean | number
  oldTickUpper?: boolean | number
  /** An object relationship */
  position?: MoneyMachinePositionGenqlSelection
  position_id?: boolean | number
  proceedsQuote?: boolean | number
  proceedsToken?: boolean | number
  transactionHash?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

/** order by aggregate values of table "MoneyMachineRebalance" */
export interface MoneyMachineRebalance_aggregate_order_by {
  avg?: MoneyMachineRebalance_avg_order_by | null
  count?: order_by | null
  max?: MoneyMachineRebalance_max_order_by | null
  min?: MoneyMachineRebalance_min_order_by | null
  stddev?: MoneyMachineRebalance_stddev_order_by | null
  stddev_pop?: MoneyMachineRebalance_stddev_pop_order_by | null
  stddev_samp?: MoneyMachineRebalance_stddev_samp_order_by | null
  sum?: MoneyMachineRebalance_sum_order_by | null
  var_pop?: MoneyMachineRebalance_var_pop_order_by | null
  var_samp?: MoneyMachineRebalance_var_samp_order_by | null
  variance?: MoneyMachineRebalance_variance_order_by | null
}

/** order by avg() on columns of table "MoneyMachineRebalance" */
export interface MoneyMachineRebalance_avg_order_by {
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
  newTickLower?: order_by | null
  newTickUpper?: order_by | null
  oldTickLower?: order_by | null
  oldTickUpper?: order_by | null
  proceedsQuote?: order_by | null
  proceedsToken?: order_by | null
}

/** Boolean expression to filter rows from the table "MoneyMachineRebalance". All fields are combined with a logical 'AND'. */
export interface MoneyMachineRebalance_bool_exp {
  _and?: MoneyMachineRebalance_bool_exp[] | null
  _not?: MoneyMachineRebalance_bool_exp | null
  _or?: MoneyMachineRebalance_bool_exp[] | null
  blockNumber?: numeric_comparison_exp | null
  blockTimestamp?: numeric_comparison_exp | null
  id?: String_comparison_exp | null
  newTickLower?: Int_comparison_exp | null
  newTickUpper?: Int_comparison_exp | null
  oldTickLower?: Int_comparison_exp | null
  oldTickUpper?: Int_comparison_exp | null
  position?: MoneyMachinePosition_bool_exp | null
  position_id?: String_comparison_exp | null
  proceedsQuote?: numeric_comparison_exp | null
  proceedsToken?: numeric_comparison_exp | null
  transactionHash?: String_comparison_exp | null
}

/** order by max() on columns of table "MoneyMachineRebalance" */
export interface MoneyMachineRebalance_max_order_by {
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
  id?: order_by | null
  newTickLower?: order_by | null
  newTickUpper?: order_by | null
  oldTickLower?: order_by | null
  oldTickUpper?: order_by | null
  position_id?: order_by | null
  proceedsQuote?: order_by | null
  proceedsToken?: order_by | null
  transactionHash?: order_by | null
}

/** order by min() on columns of table "MoneyMachineRebalance" */
export interface MoneyMachineRebalance_min_order_by {
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
  id?: order_by | null
  newTickLower?: order_by | null
  newTickUpper?: order_by | null
  oldTickLower?: order_by | null
  oldTickUpper?: order_by | null
  position_id?: order_by | null
  proceedsQuote?: order_by | null
  proceedsToken?: order_by | null
  transactionHash?: order_by | null
}

/** Ordering options when selecting data from "MoneyMachineRebalance". */
export interface MoneyMachineRebalance_order_by {
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
  id?: order_by | null
  newTickLower?: order_by | null
  newTickUpper?: order_by | null
  oldTickLower?: order_by | null
  oldTickUpper?: order_by | null
  position?: MoneyMachinePosition_order_by | null
  position_id?: order_by | null
  proceedsQuote?: order_by | null
  proceedsToken?: order_by | null
  transactionHash?: order_by | null
}

/** order by stddev() on columns of table "MoneyMachineRebalance" */
export interface MoneyMachineRebalance_stddev_order_by {
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
  newTickLower?: order_by | null
  newTickUpper?: order_by | null
  oldTickLower?: order_by | null
  oldTickUpper?: order_by | null
  proceedsQuote?: order_by | null
  proceedsToken?: order_by | null
}

/** order by stddev_pop() on columns of table "MoneyMachineRebalance" */
export interface MoneyMachineRebalance_stddev_pop_order_by {
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
  newTickLower?: order_by | null
  newTickUpper?: order_by | null
  oldTickLower?: order_by | null
  oldTickUpper?: order_by | null
  proceedsQuote?: order_by | null
  proceedsToken?: order_by | null
}

/** order by stddev_samp() on columns of table "MoneyMachineRebalance" */
export interface MoneyMachineRebalance_stddev_samp_order_by {
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
  newTickLower?: order_by | null
  newTickUpper?: order_by | null
  oldTickLower?: order_by | null
  oldTickUpper?: order_by | null
  proceedsQuote?: order_by | null
  proceedsToken?: order_by | null
}

/** Streaming cursor of the table "MoneyMachineRebalance" */
export interface MoneyMachineRebalance_stream_cursor_input {
  /** Stream column input with initial value */
  initial_value: MoneyMachineRebalance_stream_cursor_value_input
  /** cursor ordering */
  ordering?: cursor_ordering | null
}

/** Initial value of the column from where the streaming should start */
export interface MoneyMachineRebalance_stream_cursor_value_input {
  blockNumber?: Scalars['numeric'] | null
  blockTimestamp?: Scalars['numeric'] | null
  id?: Scalars['String'] | null
  newTickLower?: Scalars['Int'] | null
  newTickUpper?: Scalars['Int'] | null
  oldTickLower?: Scalars['Int'] | null
  oldTickUpper?: Scalars['Int'] | null
  position_id?: Scalars['String'] | null
  proceedsQuote?: Scalars['numeric'] | null
  proceedsToken?: Scalars['numeric'] | null
  transactionHash?: Scalars['String'] | null
}

/** order by sum() on columns of table "MoneyMachineRebalance" */
export interface MoneyMachineRebalance_sum_order_by {
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
  newTickLower?: order_by | null
  newTickUpper?: order_by | null
  oldTickLower?: order_by | null
  oldTickUpper?: order_by | null
  proceedsQuote?: order_by | null
  proceedsToken?: order_by | null
}

/** order by var_pop() on columns of table "MoneyMachineRebalance" */
export interface MoneyMachineRebalance_var_pop_order_by {
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
  newTickLower?: order_by | null
  newTickUpper?: order_by | null
  oldTickLower?: order_by | null
  oldTickUpper?: order_by | null
  proceedsQuote?: order_by | null
  proceedsToken?: order_by | null
}

/** order by var_samp() on columns of table "MoneyMachineRebalance" */
export interface MoneyMachineRebalance_var_samp_order_by {
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
  newTickLower?: order_by | null
  newTickUpper?: order_by | null
  oldTickLower?: order_by | null
  oldTickUpper?: order_by | null
  proceedsQuote?: order_by | null
  proceedsToken?: order_by | null
}

/** order by variance() on columns of table "MoneyMachineRebalance" */
export interface MoneyMachineRebalance_variance_order_by {
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
  newTickLower?: order_by | null
  newTickUpper?: order_by | null
  oldTickLower?: order_by | null
  oldTickUpper?: order_by | null
  proceedsQuote?: order_by | null
  proceedsToken?: order_by | null
}

/** columns and relationships of "MoneyMachineUser" */
export interface MoneyMachineUserGenqlSelection {
  activePositionCount?: boolean | number
  createdAt?: boolean | number
  gasBalance?: boolean | number
  id?: boolean | number
  positionCount?: boolean | number
  /** An array relationship */
  positions?: MoneyMachinePositionGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: MoneyMachinePosition_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: MoneyMachinePosition_order_by[] | null
      /** filter the rows returned */
      where?: MoneyMachinePosition_bool_exp | null
    }
  }
  totalGasConsumed?: boolean | number
  totalGasDeposited?: boolean | number
  totalGasWithdrawn?: boolean | number
  updatedAt?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

/** Boolean expression to filter rows from the table "MoneyMachineUser". All fields are combined with a logical 'AND'. */
export interface MoneyMachineUser_bool_exp {
  _and?: MoneyMachineUser_bool_exp[] | null
  _not?: MoneyMachineUser_bool_exp | null
  _or?: MoneyMachineUser_bool_exp[] | null
  activePositionCount?: numeric_comparison_exp | null
  createdAt?: numeric_comparison_exp | null
  gasBalance?: numeric_comparison_exp | null
  id?: String_comparison_exp | null
  positionCount?: numeric_comparison_exp | null
  positions?: MoneyMachinePosition_bool_exp | null
  totalGasConsumed?: numeric_comparison_exp | null
  totalGasDeposited?: numeric_comparison_exp | null
  totalGasWithdrawn?: numeric_comparison_exp | null
  updatedAt?: numeric_comparison_exp | null
}

/** Ordering options when selecting data from "MoneyMachineUser". */
export interface MoneyMachineUser_order_by {
  activePositionCount?: order_by | null
  createdAt?: order_by | null
  gasBalance?: order_by | null
  id?: order_by | null
  positionCount?: order_by | null
  positions_aggregate?: MoneyMachinePosition_aggregate_order_by | null
  totalGasConsumed?: order_by | null
  totalGasDeposited?: order_by | null
  totalGasWithdrawn?: order_by | null
  updatedAt?: order_by | null
}

/** Streaming cursor of the table "MoneyMachineUser" */
export interface MoneyMachineUser_stream_cursor_input {
  /** Stream column input with initial value */
  initial_value: MoneyMachineUser_stream_cursor_value_input
  /** cursor ordering */
  ordering?: cursor_ordering | null
}

/** Initial value of the column from where the streaming should start */
export interface MoneyMachineUser_stream_cursor_value_input {
  activePositionCount?: Scalars['numeric'] | null
  createdAt?: Scalars['numeric'] | null
  gasBalance?: Scalars['numeric'] | null
  id?: Scalars['String'] | null
  positionCount?: Scalars['numeric'] | null
  totalGasConsumed?: Scalars['numeric'] | null
  totalGasDeposited?: Scalars['numeric'] | null
  totalGasWithdrawn?: Scalars['numeric'] | null
  updatedAt?: Scalars['numeric'] | null
}

/** columns and relationships of "MoneyMachineWithdrawal" */
export interface MoneyMachineWithdrawalGenqlSelection {
  amountQuote?: boolean | number
  amountToken?: boolean | number
  blockNumber?: boolean | number
  blockTimestamp?: boolean | number
  id?: boolean | number
  isFullWithdrawal?: boolean | number
  /** An object relationship */
  position?: MoneyMachinePositionGenqlSelection
  position_id?: boolean | number
  protocolFeeQuote?: boolean | number
  transactionHash?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

/** order by aggregate values of table "MoneyMachineWithdrawal" */
export interface MoneyMachineWithdrawal_aggregate_order_by {
  avg?: MoneyMachineWithdrawal_avg_order_by | null
  count?: order_by | null
  max?: MoneyMachineWithdrawal_max_order_by | null
  min?: MoneyMachineWithdrawal_min_order_by | null
  stddev?: MoneyMachineWithdrawal_stddev_order_by | null
  stddev_pop?: MoneyMachineWithdrawal_stddev_pop_order_by | null
  stddev_samp?: MoneyMachineWithdrawal_stddev_samp_order_by | null
  sum?: MoneyMachineWithdrawal_sum_order_by | null
  var_pop?: MoneyMachineWithdrawal_var_pop_order_by | null
  var_samp?: MoneyMachineWithdrawal_var_samp_order_by | null
  variance?: MoneyMachineWithdrawal_variance_order_by | null
}

/** order by avg() on columns of table "MoneyMachineWithdrawal" */
export interface MoneyMachineWithdrawal_avg_order_by {
  amountQuote?: order_by | null
  amountToken?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
  protocolFeeQuote?: order_by | null
}

/** Boolean expression to filter rows from the table "MoneyMachineWithdrawal". All fields are combined with a logical 'AND'. */
export interface MoneyMachineWithdrawal_bool_exp {
  _and?: MoneyMachineWithdrawal_bool_exp[] | null
  _not?: MoneyMachineWithdrawal_bool_exp | null
  _or?: MoneyMachineWithdrawal_bool_exp[] | null
  amountQuote?: numeric_comparison_exp | null
  amountToken?: numeric_comparison_exp | null
  blockNumber?: numeric_comparison_exp | null
  blockTimestamp?: numeric_comparison_exp | null
  id?: String_comparison_exp | null
  isFullWithdrawal?: Boolean_comparison_exp | null
  position?: MoneyMachinePosition_bool_exp | null
  position_id?: String_comparison_exp | null
  protocolFeeQuote?: numeric_comparison_exp | null
  transactionHash?: String_comparison_exp | null
}

/** order by max() on columns of table "MoneyMachineWithdrawal" */
export interface MoneyMachineWithdrawal_max_order_by {
  amountQuote?: order_by | null
  amountToken?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
  id?: order_by | null
  position_id?: order_by | null
  protocolFeeQuote?: order_by | null
  transactionHash?: order_by | null
}

/** order by min() on columns of table "MoneyMachineWithdrawal" */
export interface MoneyMachineWithdrawal_min_order_by {
  amountQuote?: order_by | null
  amountToken?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
  id?: order_by | null
  position_id?: order_by | null
  protocolFeeQuote?: order_by | null
  transactionHash?: order_by | null
}

/** Ordering options when selecting data from "MoneyMachineWithdrawal". */
export interface MoneyMachineWithdrawal_order_by {
  amountQuote?: order_by | null
  amountToken?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
  id?: order_by | null
  isFullWithdrawal?: order_by | null
  position?: MoneyMachinePosition_order_by | null
  position_id?: order_by | null
  protocolFeeQuote?: order_by | null
  transactionHash?: order_by | null
}

/** order by stddev() on columns of table "MoneyMachineWithdrawal" */
export interface MoneyMachineWithdrawal_stddev_order_by {
  amountQuote?: order_by | null
  amountToken?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
  protocolFeeQuote?: order_by | null
}

/** order by stddev_pop() on columns of table "MoneyMachineWithdrawal" */
export interface MoneyMachineWithdrawal_stddev_pop_order_by {
  amountQuote?: order_by | null
  amountToken?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
  protocolFeeQuote?: order_by | null
}

/** order by stddev_samp() on columns of table "MoneyMachineWithdrawal" */
export interface MoneyMachineWithdrawal_stddev_samp_order_by {
  amountQuote?: order_by | null
  amountToken?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
  protocolFeeQuote?: order_by | null
}

/** Streaming cursor of the table "MoneyMachineWithdrawal" */
export interface MoneyMachineWithdrawal_stream_cursor_input {
  /** Stream column input with initial value */
  initial_value: MoneyMachineWithdrawal_stream_cursor_value_input
  /** cursor ordering */
  ordering?: cursor_ordering | null
}

/** Initial value of the column from where the streaming should start */
export interface MoneyMachineWithdrawal_stream_cursor_value_input {
  amountQuote?: Scalars['numeric'] | null
  amountToken?: Scalars['numeric'] | null
  blockNumber?: Scalars['numeric'] | null
  blockTimestamp?: Scalars['numeric'] | null
  id?: Scalars['String'] | null
  isFullWithdrawal?: Scalars['Boolean'] | null
  position_id?: Scalars['String'] | null
  protocolFeeQuote?: Scalars['numeric'] | null
  transactionHash?: Scalars['String'] | null
}

/** order by sum() on columns of table "MoneyMachineWithdrawal" */
export interface MoneyMachineWithdrawal_sum_order_by {
  amountQuote?: order_by | null
  amountToken?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
  protocolFeeQuote?: order_by | null
}

/** order by var_pop() on columns of table "MoneyMachineWithdrawal" */
export interface MoneyMachineWithdrawal_var_pop_order_by {
  amountQuote?: order_by | null
  amountToken?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
  protocolFeeQuote?: order_by | null
}

/** order by var_samp() on columns of table "MoneyMachineWithdrawal" */
export interface MoneyMachineWithdrawal_var_samp_order_by {
  amountQuote?: order_by | null
  amountToken?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
  protocolFeeQuote?: order_by | null
}

/** order by variance() on columns of table "MoneyMachineWithdrawal" */
export interface MoneyMachineWithdrawal_variance_order_by {
  amountQuote?: order_by | null
  amountToken?: order_by | null
  blockNumber?: order_by | null
  blockTimestamp?: order_by | null
  protocolFeeQuote?: order_by | null
}

/** Boolean expression to filter rows from the table "MoneyMachine". All fields are combined with a logical 'AND'. */
export interface MoneyMachine_bool_exp {
  _and?: MoneyMachine_bool_exp[] | null
  _not?: MoneyMachine_bool_exp | null
  _or?: MoneyMachine_bool_exp[] | null
  activePositions?: numeric_comparison_exp | null
  id?: String_comparison_exp | null
  lastHeartbeatBlock?: numeric_comparison_exp | null
  totalHeartbeats?: numeric_comparison_exp | null
  totalPositions?: numeric_comparison_exp | null
  totalRebalances?: numeric_comparison_exp | null
  updatedAt?: numeric_comparison_exp | null
}

/** Ordering options when selecting data from "MoneyMachine". */
export interface MoneyMachine_order_by {
  activePositions?: order_by | null
  id?: order_by | null
  lastHeartbeatBlock?: order_by | null
  totalHeartbeats?: order_by | null
  totalPositions?: order_by | null
  totalRebalances?: order_by | null
  updatedAt?: order_by | null
}

/** Streaming cursor of the table "MoneyMachine" */
export interface MoneyMachine_stream_cursor_input {
  /** Stream column input with initial value */
  initial_value: MoneyMachine_stream_cursor_value_input
  /** cursor ordering */
  ordering?: cursor_ordering | null
}

/** Initial value of the column from where the streaming should start */
export interface MoneyMachine_stream_cursor_value_input {
  activePositions?: Scalars['numeric'] | null
  id?: Scalars['String'] | null
  lastHeartbeatBlock?: Scalars['numeric'] | null
  totalHeartbeats?: Scalars['numeric'] | null
  totalPositions?: Scalars['numeric'] | null
  totalRebalances?: Scalars['numeric'] | null
  updatedAt?: Scalars['numeric'] | null
}

/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
export interface String_comparison_exp {
  _eq?: Scalars['String'] | null
  _gt?: Scalars['String'] | null
  _gte?: Scalars['String'] | null
  /** does the column match the given case-insensitive pattern */
  _ilike?: Scalars['String'] | null
  _in?: Scalars['String'][] | null
  /** does the column match the given POSIX regular expression, case insensitive */
  _iregex?: Scalars['String'] | null
  _is_null?: Scalars['Boolean'] | null
  /** does the column match the given pattern */
  _like?: Scalars['String'] | null
  _lt?: Scalars['String'] | null
  _lte?: Scalars['String'] | null
  _neq?: Scalars['String'] | null
  /** does the column NOT match the given case-insensitive pattern */
  _nilike?: Scalars['String'] | null
  _nin?: Scalars['String'][] | null
  /** does the column NOT match the given POSIX regular expression, case insensitive */
  _niregex?: Scalars['String'] | null
  /** does the column NOT match the given pattern */
  _nlike?: Scalars['String'] | null
  /** does the column NOT match the given POSIX regular expression, case sensitive */
  _nregex?: Scalars['String'] | null
  /** does the column NOT match the given SQL regular expression */
  _nsimilar?: Scalars['String'] | null
  /** does the column match the given POSIX regular expression, case sensitive */
  _regex?: Scalars['String'] | null
  /** does the column match the given SQL regular expression */
  _similar?: Scalars['String'] | null
}

/** columns and relationships of "Token" */
export interface TokenGenqlSelection {
  address?: boolean | number
  chainId?: boolean | number
  createdAt?: boolean | number
  decimals?: boolean | number
  id?: boolean | number
  name?: boolean | number
  symbol?: boolean | number
  totalSupply?: boolean | number
  updatedAt?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

/** Boolean expression to filter rows from the table "Token". All fields are combined with a logical 'AND'. */
export interface Token_bool_exp {
  _and?: Token_bool_exp[] | null
  _not?: Token_bool_exp | null
  _or?: Token_bool_exp[] | null
  address?: String_comparison_exp | null
  chainId?: numeric_comparison_exp | null
  createdAt?: numeric_comparison_exp | null
  decimals?: Int_comparison_exp | null
  id?: String_comparison_exp | null
  name?: String_comparison_exp | null
  symbol?: String_comparison_exp | null
  totalSupply?: numeric_comparison_exp | null
  updatedAt?: numeric_comparison_exp | null
}

/** Ordering options when selecting data from "Token". */
export interface Token_order_by {
  address?: order_by | null
  chainId?: order_by | null
  createdAt?: order_by | null
  decimals?: order_by | null
  id?: order_by | null
  name?: order_by | null
  symbol?: order_by | null
  totalSupply?: order_by | null
  updatedAt?: order_by | null
}

/** Streaming cursor of the table "Token" */
export interface Token_stream_cursor_input {
  /** Stream column input with initial value */
  initial_value: Token_stream_cursor_value_input
  /** cursor ordering */
  ordering?: cursor_ordering | null
}

/** Initial value of the column from where the streaming should start */
export interface Token_stream_cursor_value_input {
  address?: Scalars['String'] | null
  chainId?: Scalars['numeric'] | null
  createdAt?: Scalars['numeric'] | null
  decimals?: Scalars['Int'] | null
  id?: Scalars['String'] | null
  name?: Scalars['String'] | null
  symbol?: Scalars['String'] | null
  totalSupply?: Scalars['numeric'] | null
  updatedAt?: Scalars['numeric'] | null
}

/** columns and relationships of "UniswapV3Pool" */
export interface UniswapV3PoolGenqlSelection {
  address?: boolean | number
  amount0?: boolean | number
  amount1?: boolean | number
  chainId?: boolean | number
  createdAt?: boolean | number
  fee?: boolean | number
  id?: boolean | number
  liquidity?: boolean | number
  sqrtPriceX96?: boolean | number
  tick?: boolean | number
  tickSpacing?: boolean | number
  /** An object relationship */
  token0?: TokenGenqlSelection
  token0_id?: boolean | number
  /** An object relationship */
  token1?: TokenGenqlSelection
  token1_id?: boolean | number
  updatedAt?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

/** Boolean expression to filter rows from the table "UniswapV3Pool". All fields are combined with a logical 'AND'. */
export interface UniswapV3Pool_bool_exp {
  _and?: UniswapV3Pool_bool_exp[] | null
  _not?: UniswapV3Pool_bool_exp | null
  _or?: UniswapV3Pool_bool_exp[] | null
  address?: String_comparison_exp | null
  amount0?: numeric_comparison_exp | null
  amount1?: numeric_comparison_exp | null
  chainId?: numeric_comparison_exp | null
  createdAt?: numeric_comparison_exp | null
  fee?: Int_comparison_exp | null
  id?: String_comparison_exp | null
  liquidity?: numeric_comparison_exp | null
  sqrtPriceX96?: numeric_comparison_exp | null
  tick?: Int_comparison_exp | null
  tickSpacing?: Int_comparison_exp | null
  token0?: Token_bool_exp | null
  token0_id?: String_comparison_exp | null
  token1?: Token_bool_exp | null
  token1_id?: String_comparison_exp | null
  updatedAt?: numeric_comparison_exp | null
}

/** Ordering options when selecting data from "UniswapV3Pool". */
export interface UniswapV3Pool_order_by {
  address?: order_by | null
  amount0?: order_by | null
  amount1?: order_by | null
  chainId?: order_by | null
  createdAt?: order_by | null
  fee?: order_by | null
  id?: order_by | null
  liquidity?: order_by | null
  sqrtPriceX96?: order_by | null
  tick?: order_by | null
  tickSpacing?: order_by | null
  token0?: Token_order_by | null
  token0_id?: order_by | null
  token1?: Token_order_by | null
  token1_id?: order_by | null
  updatedAt?: order_by | null
}

/** Streaming cursor of the table "UniswapV3Pool" */
export interface UniswapV3Pool_stream_cursor_input {
  /** Stream column input with initial value */
  initial_value: UniswapV3Pool_stream_cursor_value_input
  /** cursor ordering */
  ordering?: cursor_ordering | null
}

/** Initial value of the column from where the streaming should start */
export interface UniswapV3Pool_stream_cursor_value_input {
  address?: Scalars['String'] | null
  amount0?: Scalars['numeric'] | null
  amount1?: Scalars['numeric'] | null
  chainId?: Scalars['numeric'] | null
  createdAt?: Scalars['numeric'] | null
  fee?: Scalars['Int'] | null
  id?: Scalars['String'] | null
  liquidity?: Scalars['numeric'] | null
  sqrtPriceX96?: Scalars['numeric'] | null
  tick?: Scalars['Int'] | null
  tickSpacing?: Scalars['Int'] | null
  token0_id?: Scalars['String'] | null
  token1_id?: Scalars['String'] | null
  updatedAt?: Scalars['numeric'] | null
}

/** columns and relationships of "UniswapV4Pool" */
export interface UniswapV4PoolGenqlSelection {
  amount0?: boolean | number
  amount1?: boolean | number
  chainId?: boolean | number
  createdAt?: boolean | number
  fee?: boolean | number
  hooks?: boolean | number
  id?: boolean | number
  liquidity?: boolean | number
  poolId?: boolean | number
  /** An array relationship */
  positions?: MoneyMachinePositionGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: MoneyMachinePosition_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: MoneyMachinePosition_order_by[] | null
      /** filter the rows returned */
      where?: MoneyMachinePosition_bool_exp | null
    }
  }
  sqrtPriceX96?: boolean | number
  tick?: boolean | number
  tickSpacing?: boolean | number
  /** An object relationship */
  token0?: TokenGenqlSelection
  token0_id?: boolean | number
  /** An object relationship */
  token1?: TokenGenqlSelection
  token1_id?: boolean | number
  updatedAt?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

/** Boolean expression to filter rows from the table "UniswapV4Pool". All fields are combined with a logical 'AND'. */
export interface UniswapV4Pool_bool_exp {
  _and?: UniswapV4Pool_bool_exp[] | null
  _not?: UniswapV4Pool_bool_exp | null
  _or?: UniswapV4Pool_bool_exp[] | null
  amount0?: numeric_comparison_exp | null
  amount1?: numeric_comparison_exp | null
  chainId?: numeric_comparison_exp | null
  createdAt?: numeric_comparison_exp | null
  fee?: Int_comparison_exp | null
  hooks?: String_comparison_exp | null
  id?: String_comparison_exp | null
  liquidity?: numeric_comparison_exp | null
  poolId?: String_comparison_exp | null
  positions?: MoneyMachinePosition_bool_exp | null
  sqrtPriceX96?: numeric_comparison_exp | null
  tick?: Int_comparison_exp | null
  tickSpacing?: Int_comparison_exp | null
  token0?: Token_bool_exp | null
  token0_id?: String_comparison_exp | null
  token1?: Token_bool_exp | null
  token1_id?: String_comparison_exp | null
  updatedAt?: numeric_comparison_exp | null
}

/** Ordering options when selecting data from "UniswapV4Pool". */
export interface UniswapV4Pool_order_by {
  amount0?: order_by | null
  amount1?: order_by | null
  chainId?: order_by | null
  createdAt?: order_by | null
  fee?: order_by | null
  hooks?: order_by | null
  id?: order_by | null
  liquidity?: order_by | null
  poolId?: order_by | null
  positions_aggregate?: MoneyMachinePosition_aggregate_order_by | null
  sqrtPriceX96?: order_by | null
  tick?: order_by | null
  tickSpacing?: order_by | null
  token0?: Token_order_by | null
  token0_id?: order_by | null
  token1?: Token_order_by | null
  token1_id?: order_by | null
  updatedAt?: order_by | null
}

/** Streaming cursor of the table "UniswapV4Pool" */
export interface UniswapV4Pool_stream_cursor_input {
  /** Stream column input with initial value */
  initial_value: UniswapV4Pool_stream_cursor_value_input
  /** cursor ordering */
  ordering?: cursor_ordering | null
}

/** Initial value of the column from where the streaming should start */
export interface UniswapV4Pool_stream_cursor_value_input {
  amount0?: Scalars['numeric'] | null
  amount1?: Scalars['numeric'] | null
  chainId?: Scalars['numeric'] | null
  createdAt?: Scalars['numeric'] | null
  fee?: Scalars['Int'] | null
  hooks?: Scalars['String'] | null
  id?: Scalars['String'] | null
  liquidity?: Scalars['numeric'] | null
  poolId?: Scalars['String'] | null
  sqrtPriceX96?: Scalars['numeric'] | null
  tick?: Scalars['Int'] | null
  tickSpacing?: Scalars['Int'] | null
  token0_id?: Scalars['String'] | null
  token1_id?: Scalars['String'] | null
  updatedAt?: Scalars['numeric'] | null
}

/** columns and relationships of "_meta" */
export interface _metaGenqlSelection {
  bufferBlock?: boolean | number
  chainId?: boolean | number
  endBlock?: boolean | number
  eventsProcessed?: boolean | number
  firstEventBlock?: boolean | number
  isReady?: boolean | number
  progressBlock?: boolean | number
  readyAt?: boolean | number
  sourceBlock?: boolean | number
  startBlock?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

/** Boolean expression to filter rows from the table "_meta". All fields are combined with a logical 'AND'. */
export interface _meta_bool_exp {
  _and?: _meta_bool_exp[] | null
  _not?: _meta_bool_exp | null
  _or?: _meta_bool_exp[] | null
  bufferBlock?: Int_comparison_exp | null
  chainId?: Int_comparison_exp | null
  endBlock?: Int_comparison_exp | null
  eventsProcessed?: Int_comparison_exp | null
  firstEventBlock?: Int_comparison_exp | null
  isReady?: Boolean_comparison_exp | null
  progressBlock?: Int_comparison_exp | null
  readyAt?: timestamptz_comparison_exp | null
  sourceBlock?: Int_comparison_exp | null
  startBlock?: Int_comparison_exp | null
}

/** Ordering options when selecting data from "_meta". */
export interface _meta_order_by {
  bufferBlock?: order_by | null
  chainId?: order_by | null
  endBlock?: order_by | null
  eventsProcessed?: order_by | null
  firstEventBlock?: order_by | null
  isReady?: order_by | null
  progressBlock?: order_by | null
  readyAt?: order_by | null
  sourceBlock?: order_by | null
  startBlock?: order_by | null
}

/** Streaming cursor of the table "_meta" */
export interface _meta_stream_cursor_input {
  /** Stream column input with initial value */
  initial_value: _meta_stream_cursor_value_input
  /** cursor ordering */
  ordering?: cursor_ordering | null
}

/** Initial value of the column from where the streaming should start */
export interface _meta_stream_cursor_value_input {
  bufferBlock?: Scalars['Int'] | null
  chainId?: Scalars['Int'] | null
  endBlock?: Scalars['Int'] | null
  eventsProcessed?: Scalars['Int'] | null
  firstEventBlock?: Scalars['Int'] | null
  isReady?: Scalars['Boolean'] | null
  progressBlock?: Scalars['Int'] | null
  readyAt?: Scalars['timestamptz'] | null
  sourceBlock?: Scalars['Int'] | null
  startBlock?: Scalars['Int'] | null
}

/** columns and relationships of "chain_metadata" */
export interface chain_metadataGenqlSelection {
  block_height?: boolean | number
  chain_id?: boolean | number
  end_block?: boolean | number
  first_event_block_number?: boolean | number
  is_hyper_sync?: boolean | number
  latest_fetched_block_number?: boolean | number
  latest_processed_block?: boolean | number
  num_batches_fetched?: boolean | number
  num_events_processed?: boolean | number
  start_block?: boolean | number
  timestamp_caught_up_to_head_or_endblock?: boolean | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

/** Boolean expression to filter rows from the table "chain_metadata". All fields are combined with a logical 'AND'. */
export interface chain_metadata_bool_exp {
  _and?: chain_metadata_bool_exp[] | null
  _not?: chain_metadata_bool_exp | null
  _or?: chain_metadata_bool_exp[] | null
  block_height?: Int_comparison_exp | null
  chain_id?: Int_comparison_exp | null
  end_block?: Int_comparison_exp | null
  first_event_block_number?: Int_comparison_exp | null
  is_hyper_sync?: Boolean_comparison_exp | null
  latest_fetched_block_number?: Int_comparison_exp | null
  latest_processed_block?: Int_comparison_exp | null
  num_batches_fetched?: Int_comparison_exp | null
  num_events_processed?: Int_comparison_exp | null
  start_block?: Int_comparison_exp | null
  timestamp_caught_up_to_head_or_endblock?: timestamptz_comparison_exp | null
}

/** Ordering options when selecting data from "chain_metadata". */
export interface chain_metadata_order_by {
  block_height?: order_by | null
  chain_id?: order_by | null
  end_block?: order_by | null
  first_event_block_number?: order_by | null
  is_hyper_sync?: order_by | null
  latest_fetched_block_number?: order_by | null
  latest_processed_block?: order_by | null
  num_batches_fetched?: order_by | null
  num_events_processed?: order_by | null
  start_block?: order_by | null
  timestamp_caught_up_to_head_or_endblock?: order_by | null
}

/** Streaming cursor of the table "chain_metadata" */
export interface chain_metadata_stream_cursor_input {
  /** Stream column input with initial value */
  initial_value: chain_metadata_stream_cursor_value_input
  /** cursor ordering */
  ordering?: cursor_ordering | null
}

/** Initial value of the column from where the streaming should start */
export interface chain_metadata_stream_cursor_value_input {
  block_height?: Scalars['Int'] | null
  chain_id?: Scalars['Int'] | null
  end_block?: Scalars['Int'] | null
  first_event_block_number?: Scalars['Int'] | null
  is_hyper_sync?: Scalars['Boolean'] | null
  latest_fetched_block_number?: Scalars['Int'] | null
  latest_processed_block?: Scalars['Int'] | null
  num_batches_fetched?: Scalars['Int'] | null
  num_events_processed?: Scalars['Int'] | null
  start_block?: Scalars['Int'] | null
  timestamp_caught_up_to_head_or_endblock?: Scalars['timestamptz'] | null
}

export interface jsonb_cast_exp {
  String?: String_comparison_exp | null
}

/** Boolean expression to compare columns of type "jsonb". All fields are combined with logical 'AND'. */
export interface jsonb_comparison_exp {
  _cast?: jsonb_cast_exp | null
  /** is the column contained in the given json value */
  _contained_in?: Scalars['jsonb'] | null
  /** does the column contain the given json value at the top level */
  _contains?: Scalars['jsonb'] | null
  _eq?: Scalars['jsonb'] | null
  _gt?: Scalars['jsonb'] | null
  _gte?: Scalars['jsonb'] | null
  /** does the string exist as a top-level key in the column */
  _has_key?: Scalars['String'] | null
  /** do all of these strings exist as top-level keys in the column */
  _has_keys_all?: Scalars['String'][] | null
  /** do any of these strings exist as top-level keys in the column */
  _has_keys_any?: Scalars['String'][] | null
  _in?: Scalars['jsonb'][] | null
  _is_null?: Scalars['Boolean'] | null
  _lt?: Scalars['jsonb'] | null
  _lte?: Scalars['jsonb'] | null
  _neq?: Scalars['jsonb'] | null
  _nin?: Scalars['jsonb'][] | null
}

/** Boolean expression to compare columns of type "numeric". All fields are combined with logical 'AND'. */
export interface numeric_comparison_exp {
  _eq?: Scalars['numeric'] | null
  _gt?: Scalars['numeric'] | null
  _gte?: Scalars['numeric'] | null
  _in?: Scalars['numeric'][] | null
  _is_null?: Scalars['Boolean'] | null
  _lt?: Scalars['numeric'] | null
  _lte?: Scalars['numeric'] | null
  _neq?: Scalars['numeric'] | null
  _nin?: Scalars['numeric'][] | null
}

export interface query_rootGenqlSelection {
  /** fetch data from the table: "LevrContractMapping" */
  LevrContractMapping?: LevrContractMappingGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrContractMapping_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrContractMapping_order_by[] | null
      /** filter the rows returned */
      where?: LevrContractMapping_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrContractMapping" using primary key columns */
  LevrContractMapping_by_pk?: LevrContractMappingGenqlSelection & {
    __args: { id: Scalars['String'] }
  }
  /** fetch data from the table: "LevrFactory" */
  LevrFactory?: LevrFactoryGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrFactory_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrFactory_order_by[] | null
      /** filter the rows returned */
      where?: LevrFactory_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrFactory" using primary key columns */
  LevrFactory_by_pk?: LevrFactoryGenqlSelection & { __args: { id: Scalars['String'] } }
  /** fetch data from the table: "LevrGovernanceCycle" */
  LevrGovernanceCycle?: LevrGovernanceCycleGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrGovernanceCycle_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrGovernanceCycle_order_by[] | null
      /** filter the rows returned */
      where?: LevrGovernanceCycle_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrGovernanceCycle" using primary key columns */
  LevrGovernanceCycle_by_pk?: LevrGovernanceCycleGenqlSelection & {
    __args: { id: Scalars['String'] }
  }
  /** fetch data from the table: "LevrMetrics" */
  LevrMetrics?: LevrMetricsGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrMetrics_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrMetrics_order_by[] | null
      /** filter the rows returned */
      where?: LevrMetrics_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrMetrics" using primary key columns */
  LevrMetrics_by_pk?: LevrMetricsGenqlSelection & { __args: { id: Scalars['String'] } }
  /** fetch data from the table: "LevrProject" */
  LevrProject?: LevrProjectGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrProject_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrProject_order_by[] | null
      /** filter the rows returned */
      where?: LevrProject_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrProject" using primary key columns */
  LevrProject_by_pk?: LevrProjectGenqlSelection & { __args: { id: Scalars['String'] } }
  /** fetch data from the table: "LevrProposal" */
  LevrProposal?: LevrProposalGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrProposal_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrProposal_order_by[] | null
      /** filter the rows returned */
      where?: LevrProposal_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrProposal" using primary key columns */
  LevrProposal_by_pk?: LevrProposalGenqlSelection & { __args: { id: Scalars['String'] } }
  /** fetch data from the table: "LevrRewardStream" */
  LevrRewardStream?: LevrRewardStreamGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrRewardStream_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrRewardStream_order_by[] | null
      /** filter the rows returned */
      where?: LevrRewardStream_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrRewardStream" using primary key columns */
  LevrRewardStream_by_pk?: LevrRewardStreamGenqlSelection & { __args: { id: Scalars['String'] } }
  /** fetch data from the table: "LevrStakeAction" */
  LevrStakeAction?: LevrStakeActionGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrStakeAction_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrStakeAction_order_by[] | null
      /** filter the rows returned */
      where?: LevrStakeAction_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrStakeAction" using primary key columns */
  LevrStakeAction_by_pk?: LevrStakeActionGenqlSelection & { __args: { id: Scalars['String'] } }
  /** fetch data from the table: "LevrStaker" */
  LevrStaker?: LevrStakerGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrStaker_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrStaker_order_by[] | null
      /** filter the rows returned */
      where?: LevrStaker_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrStaker" using primary key columns */
  LevrStaker_by_pk?: LevrStakerGenqlSelection & { __args: { id: Scalars['String'] } }
  /** fetch data from the table: "LevrTreasuryTransfer" */
  LevrTreasuryTransfer?: LevrTreasuryTransferGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrTreasuryTransfer_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrTreasuryTransfer_order_by[] | null
      /** filter the rows returned */
      where?: LevrTreasuryTransfer_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrTreasuryTransfer" using primary key columns */
  LevrTreasuryTransfer_by_pk?: LevrTreasuryTransferGenqlSelection & {
    __args: { id: Scalars['String'] }
  }
  /** fetch data from the table: "LevrVote" */
  LevrVote?: LevrVoteGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrVote_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrVote_order_by[] | null
      /** filter the rows returned */
      where?: LevrVote_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrVote" using primary key columns */
  LevrVote_by_pk?: LevrVoteGenqlSelection & { __args: { id: Scalars['String'] } }
  /** fetch data from the table: "MoneyMachine" */
  MoneyMachine?: MoneyMachineGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: MoneyMachine_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: MoneyMachine_order_by[] | null
      /** filter the rows returned */
      where?: MoneyMachine_bool_exp | null
    }
  }
  /** fetch data from the table: "MoneyMachineConfig" */
  MoneyMachineConfig?: MoneyMachineConfigGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: MoneyMachineConfig_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: MoneyMachineConfig_order_by[] | null
      /** filter the rows returned */
      where?: MoneyMachineConfig_bool_exp | null
    }
  }
  /** fetch data from the table: "MoneyMachineConfig" using primary key columns */
  MoneyMachineConfig_by_pk?: MoneyMachineConfigGenqlSelection & {
    __args: { id: Scalars['String'] }
  }
  /** fetch data from the table: "MoneyMachineHeartbeat" */
  MoneyMachineHeartbeat?: MoneyMachineHeartbeatGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: MoneyMachineHeartbeat_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: MoneyMachineHeartbeat_order_by[] | null
      /** filter the rows returned */
      where?: MoneyMachineHeartbeat_bool_exp | null
    }
  }
  /** fetch data from the table: "MoneyMachineHeartbeat" using primary key columns */
  MoneyMachineHeartbeat_by_pk?: MoneyMachineHeartbeatGenqlSelection & {
    __args: { id: Scalars['String'] }
  }
  /** fetch data from the table: "MoneyMachinePosition" */
  MoneyMachinePosition?: MoneyMachinePositionGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: MoneyMachinePosition_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: MoneyMachinePosition_order_by[] | null
      /** filter the rows returned */
      where?: MoneyMachinePosition_bool_exp | null
    }
  }
  /** fetch data from the table: "MoneyMachinePositionV3PriceSource" */
  MoneyMachinePositionV3PriceSource?: MoneyMachinePositionV3PriceSourceGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: MoneyMachinePositionV3PriceSource_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: MoneyMachinePositionV3PriceSource_order_by[] | null
      /** filter the rows returned */
      where?: MoneyMachinePositionV3PriceSource_bool_exp | null
    }
  }
  /** fetch data from the table: "MoneyMachinePositionV3PriceSource" using primary key columns */
  MoneyMachinePositionV3PriceSource_by_pk?: MoneyMachinePositionV3PriceSourceGenqlSelection & {
    __args: { id: Scalars['String'] }
  }
  /** fetch data from the table: "MoneyMachinePositionV4PriceSource" */
  MoneyMachinePositionV4PriceSource?: MoneyMachinePositionV4PriceSourceGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: MoneyMachinePositionV4PriceSource_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: MoneyMachinePositionV4PriceSource_order_by[] | null
      /** filter the rows returned */
      where?: MoneyMachinePositionV4PriceSource_bool_exp | null
    }
  }
  /** fetch data from the table: "MoneyMachinePositionV4PriceSource" using primary key columns */
  MoneyMachinePositionV4PriceSource_by_pk?: MoneyMachinePositionV4PriceSourceGenqlSelection & {
    __args: { id: Scalars['String'] }
  }
  /** fetch data from the table: "MoneyMachinePosition" using primary key columns */
  MoneyMachinePosition_by_pk?: MoneyMachinePositionGenqlSelection & {
    __args: { id: Scalars['String'] }
  }
  /** fetch data from the table: "MoneyMachineRebalance" */
  MoneyMachineRebalance?: MoneyMachineRebalanceGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: MoneyMachineRebalance_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: MoneyMachineRebalance_order_by[] | null
      /** filter the rows returned */
      where?: MoneyMachineRebalance_bool_exp | null
    }
  }
  /** fetch data from the table: "MoneyMachineRebalance" using primary key columns */
  MoneyMachineRebalance_by_pk?: MoneyMachineRebalanceGenqlSelection & {
    __args: { id: Scalars['String'] }
  }
  /** fetch data from the table: "MoneyMachineUser" */
  MoneyMachineUser?: MoneyMachineUserGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: MoneyMachineUser_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: MoneyMachineUser_order_by[] | null
      /** filter the rows returned */
      where?: MoneyMachineUser_bool_exp | null
    }
  }
  /** fetch data from the table: "MoneyMachineUser" using primary key columns */
  MoneyMachineUser_by_pk?: MoneyMachineUserGenqlSelection & { __args: { id: Scalars['String'] } }
  /** fetch data from the table: "MoneyMachineWithdrawal" */
  MoneyMachineWithdrawal?: MoneyMachineWithdrawalGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: MoneyMachineWithdrawal_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: MoneyMachineWithdrawal_order_by[] | null
      /** filter the rows returned */
      where?: MoneyMachineWithdrawal_bool_exp | null
    }
  }
  /** fetch data from the table: "MoneyMachineWithdrawal" using primary key columns */
  MoneyMachineWithdrawal_by_pk?: MoneyMachineWithdrawalGenqlSelection & {
    __args: { id: Scalars['String'] }
  }
  /** fetch data from the table: "MoneyMachine" using primary key columns */
  MoneyMachine_by_pk?: MoneyMachineGenqlSelection & { __args: { id: Scalars['String'] } }
  /** fetch data from the table: "Token" */
  Token?: TokenGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: Token_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: Token_order_by[] | null
      /** filter the rows returned */
      where?: Token_bool_exp | null
    }
  }
  /** fetch data from the table: "Token" using primary key columns */
  Token_by_pk?: TokenGenqlSelection & { __args: { id: Scalars['String'] } }
  /** fetch data from the table: "UniswapV3Pool" */
  UniswapV3Pool?: UniswapV3PoolGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: UniswapV3Pool_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: UniswapV3Pool_order_by[] | null
      /** filter the rows returned */
      where?: UniswapV3Pool_bool_exp | null
    }
  }
  /** fetch data from the table: "UniswapV3Pool" using primary key columns */
  UniswapV3Pool_by_pk?: UniswapV3PoolGenqlSelection & { __args: { id: Scalars['String'] } }
  /** fetch data from the table: "UniswapV4Pool" */
  UniswapV4Pool?: UniswapV4PoolGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: UniswapV4Pool_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: UniswapV4Pool_order_by[] | null
      /** filter the rows returned */
      where?: UniswapV4Pool_bool_exp | null
    }
  }
  /** fetch data from the table: "UniswapV4Pool" using primary key columns */
  UniswapV4Pool_by_pk?: UniswapV4PoolGenqlSelection & { __args: { id: Scalars['String'] } }
  /** fetch data from the table: "_meta" */
  _meta?: _metaGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: _meta_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: _meta_order_by[] | null
      /** filter the rows returned */
      where?: _meta_bool_exp | null
    }
  }
  /** fetch data from the table: "chain_metadata" */
  chain_metadata?: chain_metadataGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: chain_metadata_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: chain_metadata_order_by[] | null
      /** filter the rows returned */
      where?: chain_metadata_bool_exp | null
    }
  }
  /** fetch data from the table: "raw_events" */
  raw_events?: raw_eventsGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: raw_events_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: raw_events_order_by[] | null
      /** filter the rows returned */
      where?: raw_events_bool_exp | null
    }
  }
  /** fetch data from the table: "raw_events" using primary key columns */
  raw_events_by_pk?: raw_eventsGenqlSelection & { __args: { serial: Scalars['Int'] } }
  __typename?: boolean | number
  __scalar?: boolean | number
}

/** columns and relationships of "raw_events" */
export interface raw_eventsGenqlSelection {
  block_fields?:
    | {
        __args: {
          /** JSON select path */
          path?: Scalars['String'] | null
        }
      }
    | boolean
    | number
  block_hash?: boolean | number
  block_number?: boolean | number
  block_timestamp?: boolean | number
  chain_id?: boolean | number
  contract_name?: boolean | number
  event_id?: boolean | number
  event_name?: boolean | number
  log_index?: boolean | number
  params?:
    | {
        __args: {
          /** JSON select path */
          path?: Scalars['String'] | null
        }
      }
    | boolean
    | number
  serial?: boolean | number
  src_address?: boolean | number
  transaction_fields?:
    | {
        __args: {
          /** JSON select path */
          path?: Scalars['String'] | null
        }
      }
    | boolean
    | number
  __typename?: boolean | number
  __scalar?: boolean | number
}

/** Boolean expression to filter rows from the table "raw_events". All fields are combined with a logical 'AND'. */
export interface raw_events_bool_exp {
  _and?: raw_events_bool_exp[] | null
  _not?: raw_events_bool_exp | null
  _or?: raw_events_bool_exp[] | null
  block_fields?: jsonb_comparison_exp | null
  block_hash?: String_comparison_exp | null
  block_number?: Int_comparison_exp | null
  block_timestamp?: Int_comparison_exp | null
  chain_id?: Int_comparison_exp | null
  contract_name?: String_comparison_exp | null
  event_id?: numeric_comparison_exp | null
  event_name?: String_comparison_exp | null
  log_index?: Int_comparison_exp | null
  params?: jsonb_comparison_exp | null
  serial?: Int_comparison_exp | null
  src_address?: String_comparison_exp | null
  transaction_fields?: jsonb_comparison_exp | null
}

/** Ordering options when selecting data from "raw_events". */
export interface raw_events_order_by {
  block_fields?: order_by | null
  block_hash?: order_by | null
  block_number?: order_by | null
  block_timestamp?: order_by | null
  chain_id?: order_by | null
  contract_name?: order_by | null
  event_id?: order_by | null
  event_name?: order_by | null
  log_index?: order_by | null
  params?: order_by | null
  serial?: order_by | null
  src_address?: order_by | null
  transaction_fields?: order_by | null
}

/** Streaming cursor of the table "raw_events" */
export interface raw_events_stream_cursor_input {
  /** Stream column input with initial value */
  initial_value: raw_events_stream_cursor_value_input
  /** cursor ordering */
  ordering?: cursor_ordering | null
}

/** Initial value of the column from where the streaming should start */
export interface raw_events_stream_cursor_value_input {
  block_fields?: Scalars['jsonb'] | null
  block_hash?: Scalars['String'] | null
  block_number?: Scalars['Int'] | null
  block_timestamp?: Scalars['Int'] | null
  chain_id?: Scalars['Int'] | null
  contract_name?: Scalars['String'] | null
  event_id?: Scalars['numeric'] | null
  event_name?: Scalars['String'] | null
  log_index?: Scalars['Int'] | null
  params?: Scalars['jsonb'] | null
  serial?: Scalars['Int'] | null
  src_address?: Scalars['String'] | null
  transaction_fields?: Scalars['jsonb'] | null
}

export interface subscription_rootGenqlSelection {
  /** fetch data from the table: "LevrContractMapping" */
  LevrContractMapping?: LevrContractMappingGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrContractMapping_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrContractMapping_order_by[] | null
      /** filter the rows returned */
      where?: LevrContractMapping_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrContractMapping" using primary key columns */
  LevrContractMapping_by_pk?: LevrContractMappingGenqlSelection & {
    __args: { id: Scalars['String'] }
  }
  /** fetch data from the table in a streaming manner: "LevrContractMapping" */
  LevrContractMapping_stream?: LevrContractMappingGenqlSelection & {
    __args: {
      /** maximum number of rows returned in a single batch */
      batch_size: Scalars['Int']
      /** cursor to stream the results returned by the query */
      cursor: (LevrContractMapping_stream_cursor_input | null)[]
      /** filter the rows returned */
      where?: LevrContractMapping_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrFactory" */
  LevrFactory?: LevrFactoryGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrFactory_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrFactory_order_by[] | null
      /** filter the rows returned */
      where?: LevrFactory_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrFactory" using primary key columns */
  LevrFactory_by_pk?: LevrFactoryGenqlSelection & { __args: { id: Scalars['String'] } }
  /** fetch data from the table in a streaming manner: "LevrFactory" */
  LevrFactory_stream?: LevrFactoryGenqlSelection & {
    __args: {
      /** maximum number of rows returned in a single batch */
      batch_size: Scalars['Int']
      /** cursor to stream the results returned by the query */
      cursor: (LevrFactory_stream_cursor_input | null)[]
      /** filter the rows returned */
      where?: LevrFactory_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrGovernanceCycle" */
  LevrGovernanceCycle?: LevrGovernanceCycleGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrGovernanceCycle_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrGovernanceCycle_order_by[] | null
      /** filter the rows returned */
      where?: LevrGovernanceCycle_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrGovernanceCycle" using primary key columns */
  LevrGovernanceCycle_by_pk?: LevrGovernanceCycleGenqlSelection & {
    __args: { id: Scalars['String'] }
  }
  /** fetch data from the table in a streaming manner: "LevrGovernanceCycle" */
  LevrGovernanceCycle_stream?: LevrGovernanceCycleGenqlSelection & {
    __args: {
      /** maximum number of rows returned in a single batch */
      batch_size: Scalars['Int']
      /** cursor to stream the results returned by the query */
      cursor: (LevrGovernanceCycle_stream_cursor_input | null)[]
      /** filter the rows returned */
      where?: LevrGovernanceCycle_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrMetrics" */
  LevrMetrics?: LevrMetricsGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrMetrics_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrMetrics_order_by[] | null
      /** filter the rows returned */
      where?: LevrMetrics_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrMetrics" using primary key columns */
  LevrMetrics_by_pk?: LevrMetricsGenqlSelection & { __args: { id: Scalars['String'] } }
  /** fetch data from the table in a streaming manner: "LevrMetrics" */
  LevrMetrics_stream?: LevrMetricsGenqlSelection & {
    __args: {
      /** maximum number of rows returned in a single batch */
      batch_size: Scalars['Int']
      /** cursor to stream the results returned by the query */
      cursor: (LevrMetrics_stream_cursor_input | null)[]
      /** filter the rows returned */
      where?: LevrMetrics_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrProject" */
  LevrProject?: LevrProjectGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrProject_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrProject_order_by[] | null
      /** filter the rows returned */
      where?: LevrProject_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrProject" using primary key columns */
  LevrProject_by_pk?: LevrProjectGenqlSelection & { __args: { id: Scalars['String'] } }
  /** fetch data from the table in a streaming manner: "LevrProject" */
  LevrProject_stream?: LevrProjectGenqlSelection & {
    __args: {
      /** maximum number of rows returned in a single batch */
      batch_size: Scalars['Int']
      /** cursor to stream the results returned by the query */
      cursor: (LevrProject_stream_cursor_input | null)[]
      /** filter the rows returned */
      where?: LevrProject_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrProposal" */
  LevrProposal?: LevrProposalGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrProposal_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrProposal_order_by[] | null
      /** filter the rows returned */
      where?: LevrProposal_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrProposal" using primary key columns */
  LevrProposal_by_pk?: LevrProposalGenqlSelection & { __args: { id: Scalars['String'] } }
  /** fetch data from the table in a streaming manner: "LevrProposal" */
  LevrProposal_stream?: LevrProposalGenqlSelection & {
    __args: {
      /** maximum number of rows returned in a single batch */
      batch_size: Scalars['Int']
      /** cursor to stream the results returned by the query */
      cursor: (LevrProposal_stream_cursor_input | null)[]
      /** filter the rows returned */
      where?: LevrProposal_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrRewardStream" */
  LevrRewardStream?: LevrRewardStreamGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrRewardStream_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrRewardStream_order_by[] | null
      /** filter the rows returned */
      where?: LevrRewardStream_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrRewardStream" using primary key columns */
  LevrRewardStream_by_pk?: LevrRewardStreamGenqlSelection & { __args: { id: Scalars['String'] } }
  /** fetch data from the table in a streaming manner: "LevrRewardStream" */
  LevrRewardStream_stream?: LevrRewardStreamGenqlSelection & {
    __args: {
      /** maximum number of rows returned in a single batch */
      batch_size: Scalars['Int']
      /** cursor to stream the results returned by the query */
      cursor: (LevrRewardStream_stream_cursor_input | null)[]
      /** filter the rows returned */
      where?: LevrRewardStream_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrStakeAction" */
  LevrStakeAction?: LevrStakeActionGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrStakeAction_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrStakeAction_order_by[] | null
      /** filter the rows returned */
      where?: LevrStakeAction_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrStakeAction" using primary key columns */
  LevrStakeAction_by_pk?: LevrStakeActionGenqlSelection & { __args: { id: Scalars['String'] } }
  /** fetch data from the table in a streaming manner: "LevrStakeAction" */
  LevrStakeAction_stream?: LevrStakeActionGenqlSelection & {
    __args: {
      /** maximum number of rows returned in a single batch */
      batch_size: Scalars['Int']
      /** cursor to stream the results returned by the query */
      cursor: (LevrStakeAction_stream_cursor_input | null)[]
      /** filter the rows returned */
      where?: LevrStakeAction_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrStaker" */
  LevrStaker?: LevrStakerGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrStaker_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrStaker_order_by[] | null
      /** filter the rows returned */
      where?: LevrStaker_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrStaker" using primary key columns */
  LevrStaker_by_pk?: LevrStakerGenqlSelection & { __args: { id: Scalars['String'] } }
  /** fetch data from the table in a streaming manner: "LevrStaker" */
  LevrStaker_stream?: LevrStakerGenqlSelection & {
    __args: {
      /** maximum number of rows returned in a single batch */
      batch_size: Scalars['Int']
      /** cursor to stream the results returned by the query */
      cursor: (LevrStaker_stream_cursor_input | null)[]
      /** filter the rows returned */
      where?: LevrStaker_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrTreasuryTransfer" */
  LevrTreasuryTransfer?: LevrTreasuryTransferGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrTreasuryTransfer_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrTreasuryTransfer_order_by[] | null
      /** filter the rows returned */
      where?: LevrTreasuryTransfer_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrTreasuryTransfer" using primary key columns */
  LevrTreasuryTransfer_by_pk?: LevrTreasuryTransferGenqlSelection & {
    __args: { id: Scalars['String'] }
  }
  /** fetch data from the table in a streaming manner: "LevrTreasuryTransfer" */
  LevrTreasuryTransfer_stream?: LevrTreasuryTransferGenqlSelection & {
    __args: {
      /** maximum number of rows returned in a single batch */
      batch_size: Scalars['Int']
      /** cursor to stream the results returned by the query */
      cursor: (LevrTreasuryTransfer_stream_cursor_input | null)[]
      /** filter the rows returned */
      where?: LevrTreasuryTransfer_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrVote" */
  LevrVote?: LevrVoteGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: LevrVote_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: LevrVote_order_by[] | null
      /** filter the rows returned */
      where?: LevrVote_bool_exp | null
    }
  }
  /** fetch data from the table: "LevrVote" using primary key columns */
  LevrVote_by_pk?: LevrVoteGenqlSelection & { __args: { id: Scalars['String'] } }
  /** fetch data from the table in a streaming manner: "LevrVote" */
  LevrVote_stream?: LevrVoteGenqlSelection & {
    __args: {
      /** maximum number of rows returned in a single batch */
      batch_size: Scalars['Int']
      /** cursor to stream the results returned by the query */
      cursor: (LevrVote_stream_cursor_input | null)[]
      /** filter the rows returned */
      where?: LevrVote_bool_exp | null
    }
  }
  /** fetch data from the table: "MoneyMachine" */
  MoneyMachine?: MoneyMachineGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: MoneyMachine_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: MoneyMachine_order_by[] | null
      /** filter the rows returned */
      where?: MoneyMachine_bool_exp | null
    }
  }
  /** fetch data from the table: "MoneyMachineConfig" */
  MoneyMachineConfig?: MoneyMachineConfigGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: MoneyMachineConfig_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: MoneyMachineConfig_order_by[] | null
      /** filter the rows returned */
      where?: MoneyMachineConfig_bool_exp | null
    }
  }
  /** fetch data from the table: "MoneyMachineConfig" using primary key columns */
  MoneyMachineConfig_by_pk?: MoneyMachineConfigGenqlSelection & {
    __args: { id: Scalars['String'] }
  }
  /** fetch data from the table in a streaming manner: "MoneyMachineConfig" */
  MoneyMachineConfig_stream?: MoneyMachineConfigGenqlSelection & {
    __args: {
      /** maximum number of rows returned in a single batch */
      batch_size: Scalars['Int']
      /** cursor to stream the results returned by the query */
      cursor: (MoneyMachineConfig_stream_cursor_input | null)[]
      /** filter the rows returned */
      where?: MoneyMachineConfig_bool_exp | null
    }
  }
  /** fetch data from the table: "MoneyMachineHeartbeat" */
  MoneyMachineHeartbeat?: MoneyMachineHeartbeatGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: MoneyMachineHeartbeat_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: MoneyMachineHeartbeat_order_by[] | null
      /** filter the rows returned */
      where?: MoneyMachineHeartbeat_bool_exp | null
    }
  }
  /** fetch data from the table: "MoneyMachineHeartbeat" using primary key columns */
  MoneyMachineHeartbeat_by_pk?: MoneyMachineHeartbeatGenqlSelection & {
    __args: { id: Scalars['String'] }
  }
  /** fetch data from the table in a streaming manner: "MoneyMachineHeartbeat" */
  MoneyMachineHeartbeat_stream?: MoneyMachineHeartbeatGenqlSelection & {
    __args: {
      /** maximum number of rows returned in a single batch */
      batch_size: Scalars['Int']
      /** cursor to stream the results returned by the query */
      cursor: (MoneyMachineHeartbeat_stream_cursor_input | null)[]
      /** filter the rows returned */
      where?: MoneyMachineHeartbeat_bool_exp | null
    }
  }
  /** fetch data from the table: "MoneyMachinePosition" */
  MoneyMachinePosition?: MoneyMachinePositionGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: MoneyMachinePosition_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: MoneyMachinePosition_order_by[] | null
      /** filter the rows returned */
      where?: MoneyMachinePosition_bool_exp | null
    }
  }
  /** fetch data from the table: "MoneyMachinePositionV3PriceSource" */
  MoneyMachinePositionV3PriceSource?: MoneyMachinePositionV3PriceSourceGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: MoneyMachinePositionV3PriceSource_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: MoneyMachinePositionV3PriceSource_order_by[] | null
      /** filter the rows returned */
      where?: MoneyMachinePositionV3PriceSource_bool_exp | null
    }
  }
  /** fetch data from the table: "MoneyMachinePositionV3PriceSource" using primary key columns */
  MoneyMachinePositionV3PriceSource_by_pk?: MoneyMachinePositionV3PriceSourceGenqlSelection & {
    __args: { id: Scalars['String'] }
  }
  /** fetch data from the table in a streaming manner: "MoneyMachinePositionV3PriceSource" */
  MoneyMachinePositionV3PriceSource_stream?: MoneyMachinePositionV3PriceSourceGenqlSelection & {
    __args: {
      /** maximum number of rows returned in a single batch */
      batch_size: Scalars['Int']
      /** cursor to stream the results returned by the query */
      cursor: (MoneyMachinePositionV3PriceSource_stream_cursor_input | null)[]
      /** filter the rows returned */
      where?: MoneyMachinePositionV3PriceSource_bool_exp | null
    }
  }
  /** fetch data from the table: "MoneyMachinePositionV4PriceSource" */
  MoneyMachinePositionV4PriceSource?: MoneyMachinePositionV4PriceSourceGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: MoneyMachinePositionV4PriceSource_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: MoneyMachinePositionV4PriceSource_order_by[] | null
      /** filter the rows returned */
      where?: MoneyMachinePositionV4PriceSource_bool_exp | null
    }
  }
  /** fetch data from the table: "MoneyMachinePositionV4PriceSource" using primary key columns */
  MoneyMachinePositionV4PriceSource_by_pk?: MoneyMachinePositionV4PriceSourceGenqlSelection & {
    __args: { id: Scalars['String'] }
  }
  /** fetch data from the table in a streaming manner: "MoneyMachinePositionV4PriceSource" */
  MoneyMachinePositionV4PriceSource_stream?: MoneyMachinePositionV4PriceSourceGenqlSelection & {
    __args: {
      /** maximum number of rows returned in a single batch */
      batch_size: Scalars['Int']
      /** cursor to stream the results returned by the query */
      cursor: (MoneyMachinePositionV4PriceSource_stream_cursor_input | null)[]
      /** filter the rows returned */
      where?: MoneyMachinePositionV4PriceSource_bool_exp | null
    }
  }
  /** fetch data from the table: "MoneyMachinePosition" using primary key columns */
  MoneyMachinePosition_by_pk?: MoneyMachinePositionGenqlSelection & {
    __args: { id: Scalars['String'] }
  }
  /** fetch data from the table in a streaming manner: "MoneyMachinePosition" */
  MoneyMachinePosition_stream?: MoneyMachinePositionGenqlSelection & {
    __args: {
      /** maximum number of rows returned in a single batch */
      batch_size: Scalars['Int']
      /** cursor to stream the results returned by the query */
      cursor: (MoneyMachinePosition_stream_cursor_input | null)[]
      /** filter the rows returned */
      where?: MoneyMachinePosition_bool_exp | null
    }
  }
  /** fetch data from the table: "MoneyMachineRebalance" */
  MoneyMachineRebalance?: MoneyMachineRebalanceGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: MoneyMachineRebalance_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: MoneyMachineRebalance_order_by[] | null
      /** filter the rows returned */
      where?: MoneyMachineRebalance_bool_exp | null
    }
  }
  /** fetch data from the table: "MoneyMachineRebalance" using primary key columns */
  MoneyMachineRebalance_by_pk?: MoneyMachineRebalanceGenqlSelection & {
    __args: { id: Scalars['String'] }
  }
  /** fetch data from the table in a streaming manner: "MoneyMachineRebalance" */
  MoneyMachineRebalance_stream?: MoneyMachineRebalanceGenqlSelection & {
    __args: {
      /** maximum number of rows returned in a single batch */
      batch_size: Scalars['Int']
      /** cursor to stream the results returned by the query */
      cursor: (MoneyMachineRebalance_stream_cursor_input | null)[]
      /** filter the rows returned */
      where?: MoneyMachineRebalance_bool_exp | null
    }
  }
  /** fetch data from the table: "MoneyMachineUser" */
  MoneyMachineUser?: MoneyMachineUserGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: MoneyMachineUser_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: MoneyMachineUser_order_by[] | null
      /** filter the rows returned */
      where?: MoneyMachineUser_bool_exp | null
    }
  }
  /** fetch data from the table: "MoneyMachineUser" using primary key columns */
  MoneyMachineUser_by_pk?: MoneyMachineUserGenqlSelection & { __args: { id: Scalars['String'] } }
  /** fetch data from the table in a streaming manner: "MoneyMachineUser" */
  MoneyMachineUser_stream?: MoneyMachineUserGenqlSelection & {
    __args: {
      /** maximum number of rows returned in a single batch */
      batch_size: Scalars['Int']
      /** cursor to stream the results returned by the query */
      cursor: (MoneyMachineUser_stream_cursor_input | null)[]
      /** filter the rows returned */
      where?: MoneyMachineUser_bool_exp | null
    }
  }
  /** fetch data from the table: "MoneyMachineWithdrawal" */
  MoneyMachineWithdrawal?: MoneyMachineWithdrawalGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: MoneyMachineWithdrawal_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: MoneyMachineWithdrawal_order_by[] | null
      /** filter the rows returned */
      where?: MoneyMachineWithdrawal_bool_exp | null
    }
  }
  /** fetch data from the table: "MoneyMachineWithdrawal" using primary key columns */
  MoneyMachineWithdrawal_by_pk?: MoneyMachineWithdrawalGenqlSelection & {
    __args: { id: Scalars['String'] }
  }
  /** fetch data from the table in a streaming manner: "MoneyMachineWithdrawal" */
  MoneyMachineWithdrawal_stream?: MoneyMachineWithdrawalGenqlSelection & {
    __args: {
      /** maximum number of rows returned in a single batch */
      batch_size: Scalars['Int']
      /** cursor to stream the results returned by the query */
      cursor: (MoneyMachineWithdrawal_stream_cursor_input | null)[]
      /** filter the rows returned */
      where?: MoneyMachineWithdrawal_bool_exp | null
    }
  }
  /** fetch data from the table: "MoneyMachine" using primary key columns */
  MoneyMachine_by_pk?: MoneyMachineGenqlSelection & { __args: { id: Scalars['String'] } }
  /** fetch data from the table in a streaming manner: "MoneyMachine" */
  MoneyMachine_stream?: MoneyMachineGenqlSelection & {
    __args: {
      /** maximum number of rows returned in a single batch */
      batch_size: Scalars['Int']
      /** cursor to stream the results returned by the query */
      cursor: (MoneyMachine_stream_cursor_input | null)[]
      /** filter the rows returned */
      where?: MoneyMachine_bool_exp | null
    }
  }
  /** fetch data from the table: "Token" */
  Token?: TokenGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: Token_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: Token_order_by[] | null
      /** filter the rows returned */
      where?: Token_bool_exp | null
    }
  }
  /** fetch data from the table: "Token" using primary key columns */
  Token_by_pk?: TokenGenqlSelection & { __args: { id: Scalars['String'] } }
  /** fetch data from the table in a streaming manner: "Token" */
  Token_stream?: TokenGenqlSelection & {
    __args: {
      /** maximum number of rows returned in a single batch */
      batch_size: Scalars['Int']
      /** cursor to stream the results returned by the query */
      cursor: (Token_stream_cursor_input | null)[]
      /** filter the rows returned */
      where?: Token_bool_exp | null
    }
  }
  /** fetch data from the table: "UniswapV3Pool" */
  UniswapV3Pool?: UniswapV3PoolGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: UniswapV3Pool_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: UniswapV3Pool_order_by[] | null
      /** filter the rows returned */
      where?: UniswapV3Pool_bool_exp | null
    }
  }
  /** fetch data from the table: "UniswapV3Pool" using primary key columns */
  UniswapV3Pool_by_pk?: UniswapV3PoolGenqlSelection & { __args: { id: Scalars['String'] } }
  /** fetch data from the table in a streaming manner: "UniswapV3Pool" */
  UniswapV3Pool_stream?: UniswapV3PoolGenqlSelection & {
    __args: {
      /** maximum number of rows returned in a single batch */
      batch_size: Scalars['Int']
      /** cursor to stream the results returned by the query */
      cursor: (UniswapV3Pool_stream_cursor_input | null)[]
      /** filter the rows returned */
      where?: UniswapV3Pool_bool_exp | null
    }
  }
  /** fetch data from the table: "UniswapV4Pool" */
  UniswapV4Pool?: UniswapV4PoolGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: UniswapV4Pool_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: UniswapV4Pool_order_by[] | null
      /** filter the rows returned */
      where?: UniswapV4Pool_bool_exp | null
    }
  }
  /** fetch data from the table: "UniswapV4Pool" using primary key columns */
  UniswapV4Pool_by_pk?: UniswapV4PoolGenqlSelection & { __args: { id: Scalars['String'] } }
  /** fetch data from the table in a streaming manner: "UniswapV4Pool" */
  UniswapV4Pool_stream?: UniswapV4PoolGenqlSelection & {
    __args: {
      /** maximum number of rows returned in a single batch */
      batch_size: Scalars['Int']
      /** cursor to stream the results returned by the query */
      cursor: (UniswapV4Pool_stream_cursor_input | null)[]
      /** filter the rows returned */
      where?: UniswapV4Pool_bool_exp | null
    }
  }
  /** fetch data from the table: "_meta" */
  _meta?: _metaGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: _meta_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: _meta_order_by[] | null
      /** filter the rows returned */
      where?: _meta_bool_exp | null
    }
  }
  /** fetch data from the table in a streaming manner: "_meta" */
  _meta_stream?: _metaGenqlSelection & {
    __args: {
      /** maximum number of rows returned in a single batch */
      batch_size: Scalars['Int']
      /** cursor to stream the results returned by the query */
      cursor: (_meta_stream_cursor_input | null)[]
      /** filter the rows returned */
      where?: _meta_bool_exp | null
    }
  }
  /** fetch data from the table: "chain_metadata" */
  chain_metadata?: chain_metadataGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: chain_metadata_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: chain_metadata_order_by[] | null
      /** filter the rows returned */
      where?: chain_metadata_bool_exp | null
    }
  }
  /** fetch data from the table in a streaming manner: "chain_metadata" */
  chain_metadata_stream?: chain_metadataGenqlSelection & {
    __args: {
      /** maximum number of rows returned in a single batch */
      batch_size: Scalars['Int']
      /** cursor to stream the results returned by the query */
      cursor: (chain_metadata_stream_cursor_input | null)[]
      /** filter the rows returned */
      where?: chain_metadata_bool_exp | null
    }
  }
  /** fetch data from the table: "raw_events" */
  raw_events?: raw_eventsGenqlSelection & {
    __args?: {
      /** distinct select on columns */
      distinct_on?: raw_events_select_column[] | null
      /** limit the number of rows returned */
      limit?: Scalars['Int'] | null
      /** skip the first n rows. Use only with order_by */
      offset?: Scalars['Int'] | null
      /** sort the rows by one or more columns */
      order_by?: raw_events_order_by[] | null
      /** filter the rows returned */
      where?: raw_events_bool_exp | null
    }
  }
  /** fetch data from the table: "raw_events" using primary key columns */
  raw_events_by_pk?: raw_eventsGenqlSelection & { __args: { serial: Scalars['Int'] } }
  /** fetch data from the table in a streaming manner: "raw_events" */
  raw_events_stream?: raw_eventsGenqlSelection & {
    __args: {
      /** maximum number of rows returned in a single batch */
      batch_size: Scalars['Int']
      /** cursor to stream the results returned by the query */
      cursor: (raw_events_stream_cursor_input | null)[]
      /** filter the rows returned */
      where?: raw_events_bool_exp | null
    }
  }
  __typename?: boolean | number
  __scalar?: boolean | number
}

/** Boolean expression to compare columns of type "timestamptz". All fields are combined with logical 'AND'. */
export interface timestamptz_comparison_exp {
  _eq?: Scalars['timestamptz'] | null
  _gt?: Scalars['timestamptz'] | null
  _gte?: Scalars['timestamptz'] | null
  _in?: Scalars['timestamptz'][] | null
  _is_null?: Scalars['Boolean'] | null
  _lt?: Scalars['timestamptz'] | null
  _lte?: Scalars['timestamptz'] | null
  _neq?: Scalars['timestamptz'] | null
  _nin?: Scalars['timestamptz'][] | null
}

export type QueryGenqlSelection = query_rootGenqlSelection
export type SubscriptionGenqlSelection = subscription_rootGenqlSelection

const LevrContractMapping_possibleTypes: string[] = ['LevrContractMapping']
export const isLevrContractMapping = (
  obj?: { __typename?: any } | null
): obj is LevrContractMapping => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isLevrContractMapping"')
  return LevrContractMapping_possibleTypes.includes(obj.__typename)
}

const LevrFactory_possibleTypes: string[] = ['LevrFactory']
export const isLevrFactory = (obj?: { __typename?: any } | null): obj is LevrFactory => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isLevrFactory"')
  return LevrFactory_possibleTypes.includes(obj.__typename)
}

const LevrGovernanceCycle_possibleTypes: string[] = ['LevrGovernanceCycle']
export const isLevrGovernanceCycle = (
  obj?: { __typename?: any } | null
): obj is LevrGovernanceCycle => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isLevrGovernanceCycle"')
  return LevrGovernanceCycle_possibleTypes.includes(obj.__typename)
}

const LevrMetrics_possibleTypes: string[] = ['LevrMetrics']
export const isLevrMetrics = (obj?: { __typename?: any } | null): obj is LevrMetrics => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isLevrMetrics"')
  return LevrMetrics_possibleTypes.includes(obj.__typename)
}

const LevrProject_possibleTypes: string[] = ['LevrProject']
export const isLevrProject = (obj?: { __typename?: any } | null): obj is LevrProject => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isLevrProject"')
  return LevrProject_possibleTypes.includes(obj.__typename)
}

const LevrProposal_possibleTypes: string[] = ['LevrProposal']
export const isLevrProposal = (obj?: { __typename?: any } | null): obj is LevrProposal => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isLevrProposal"')
  return LevrProposal_possibleTypes.includes(obj.__typename)
}

const LevrRewardStream_possibleTypes: string[] = ['LevrRewardStream']
export const isLevrRewardStream = (obj?: { __typename?: any } | null): obj is LevrRewardStream => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isLevrRewardStream"')
  return LevrRewardStream_possibleTypes.includes(obj.__typename)
}

const LevrStakeAction_possibleTypes: string[] = ['LevrStakeAction']
export const isLevrStakeAction = (obj?: { __typename?: any } | null): obj is LevrStakeAction => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isLevrStakeAction"')
  return LevrStakeAction_possibleTypes.includes(obj.__typename)
}

const LevrStaker_possibleTypes: string[] = ['LevrStaker']
export const isLevrStaker = (obj?: { __typename?: any } | null): obj is LevrStaker => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isLevrStaker"')
  return LevrStaker_possibleTypes.includes(obj.__typename)
}

const LevrTreasuryTransfer_possibleTypes: string[] = ['LevrTreasuryTransfer']
export const isLevrTreasuryTransfer = (
  obj?: { __typename?: any } | null
): obj is LevrTreasuryTransfer => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isLevrTreasuryTransfer"')
  return LevrTreasuryTransfer_possibleTypes.includes(obj.__typename)
}

const LevrVote_possibleTypes: string[] = ['LevrVote']
export const isLevrVote = (obj?: { __typename?: any } | null): obj is LevrVote => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isLevrVote"')
  return LevrVote_possibleTypes.includes(obj.__typename)
}

const MoneyMachine_possibleTypes: string[] = ['MoneyMachine']
export const isMoneyMachine = (obj?: { __typename?: any } | null): obj is MoneyMachine => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isMoneyMachine"')
  return MoneyMachine_possibleTypes.includes(obj.__typename)
}

const MoneyMachineConfig_possibleTypes: string[] = ['MoneyMachineConfig']
export const isMoneyMachineConfig = (
  obj?: { __typename?: any } | null
): obj is MoneyMachineConfig => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isMoneyMachineConfig"')
  return MoneyMachineConfig_possibleTypes.includes(obj.__typename)
}

const MoneyMachineHeartbeat_possibleTypes: string[] = ['MoneyMachineHeartbeat']
export const isMoneyMachineHeartbeat = (
  obj?: { __typename?: any } | null
): obj is MoneyMachineHeartbeat => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isMoneyMachineHeartbeat"')
  return MoneyMachineHeartbeat_possibleTypes.includes(obj.__typename)
}

const MoneyMachinePosition_possibleTypes: string[] = ['MoneyMachinePosition']
export const isMoneyMachinePosition = (
  obj?: { __typename?: any } | null
): obj is MoneyMachinePosition => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isMoneyMachinePosition"')
  return MoneyMachinePosition_possibleTypes.includes(obj.__typename)
}

const MoneyMachinePositionV3PriceSource_possibleTypes: string[] = [
  'MoneyMachinePositionV3PriceSource',
]
export const isMoneyMachinePositionV3PriceSource = (
  obj?: { __typename?: any } | null
): obj is MoneyMachinePositionV3PriceSource => {
  if (!obj?.__typename)
    throw new Error('__typename is missing in "isMoneyMachinePositionV3PriceSource"')
  return MoneyMachinePositionV3PriceSource_possibleTypes.includes(obj.__typename)
}

const MoneyMachinePositionV4PriceSource_possibleTypes: string[] = [
  'MoneyMachinePositionV4PriceSource',
]
export const isMoneyMachinePositionV4PriceSource = (
  obj?: { __typename?: any } | null
): obj is MoneyMachinePositionV4PriceSource => {
  if (!obj?.__typename)
    throw new Error('__typename is missing in "isMoneyMachinePositionV4PriceSource"')
  return MoneyMachinePositionV4PriceSource_possibleTypes.includes(obj.__typename)
}

const MoneyMachineRebalance_possibleTypes: string[] = ['MoneyMachineRebalance']
export const isMoneyMachineRebalance = (
  obj?: { __typename?: any } | null
): obj is MoneyMachineRebalance => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isMoneyMachineRebalance"')
  return MoneyMachineRebalance_possibleTypes.includes(obj.__typename)
}

const MoneyMachineUser_possibleTypes: string[] = ['MoneyMachineUser']
export const isMoneyMachineUser = (obj?: { __typename?: any } | null): obj is MoneyMachineUser => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isMoneyMachineUser"')
  return MoneyMachineUser_possibleTypes.includes(obj.__typename)
}

const MoneyMachineWithdrawal_possibleTypes: string[] = ['MoneyMachineWithdrawal']
export const isMoneyMachineWithdrawal = (
  obj?: { __typename?: any } | null
): obj is MoneyMachineWithdrawal => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isMoneyMachineWithdrawal"')
  return MoneyMachineWithdrawal_possibleTypes.includes(obj.__typename)
}

const Token_possibleTypes: string[] = ['Token']
export const isToken = (obj?: { __typename?: any } | null): obj is Token => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isToken"')
  return Token_possibleTypes.includes(obj.__typename)
}

const UniswapV3Pool_possibleTypes: string[] = ['UniswapV3Pool']
export const isUniswapV3Pool = (obj?: { __typename?: any } | null): obj is UniswapV3Pool => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isUniswapV3Pool"')
  return UniswapV3Pool_possibleTypes.includes(obj.__typename)
}

const UniswapV4Pool_possibleTypes: string[] = ['UniswapV4Pool']
export const isUniswapV4Pool = (obj?: { __typename?: any } | null): obj is UniswapV4Pool => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isUniswapV4Pool"')
  return UniswapV4Pool_possibleTypes.includes(obj.__typename)
}

const _meta_possibleTypes: string[] = ['_meta']
export const is_meta = (obj?: { __typename?: any } | null): obj is _meta => {
  if (!obj?.__typename) throw new Error('__typename is missing in "is_meta"')
  return _meta_possibleTypes.includes(obj.__typename)
}

const chain_metadata_possibleTypes: string[] = ['chain_metadata']
export const ischain_metadata = (obj?: { __typename?: any } | null): obj is chain_metadata => {
  if (!obj?.__typename) throw new Error('__typename is missing in "ischain_metadata"')
  return chain_metadata_possibleTypes.includes(obj.__typename)
}

const query_root_possibleTypes: string[] = ['query_root']
export const isquery_root = (obj?: { __typename?: any } | null): obj is query_root => {
  if (!obj?.__typename) throw new Error('__typename is missing in "isquery_root"')
  return query_root_possibleTypes.includes(obj.__typename)
}

const raw_events_possibleTypes: string[] = ['raw_events']
export const israw_events = (obj?: { __typename?: any } | null): obj is raw_events => {
  if (!obj?.__typename) throw new Error('__typename is missing in "israw_events"')
  return raw_events_possibleTypes.includes(obj.__typename)
}

const subscription_root_possibleTypes: string[] = ['subscription_root']
export const issubscription_root = (
  obj?: { __typename?: any } | null
): obj is subscription_root => {
  if (!obj?.__typename) throw new Error('__typename is missing in "issubscription_root"')
  return subscription_root_possibleTypes.includes(obj.__typename)
}

export const enumLevrContractMappingSelectColumn = {
  id: 'id' as const,
  project_id: 'project_id' as const,
}

export const enumLevrFactorySelectColumn = {
  approvalBps: 'approvalBps' as const,
  createdAt: 'createdAt' as const,
  id: 'id' as const,
  maxActiveProposals: 'maxActiveProposals' as const,
  maxProposalAmountBps: 'maxProposalAmountBps' as const,
  minSTokenBpsToSubmit: 'minSTokenBpsToSubmit' as const,
  minimumQuorumBps: 'minimumQuorumBps' as const,
  proposalWindowSeconds: 'proposalWindowSeconds' as const,
  protocolFeeBps: 'protocolFeeBps' as const,
  protocolTreasury: 'protocolTreasury' as const,
  quorumBps: 'quorumBps' as const,
  streamWindowSeconds: 'streamWindowSeconds' as const,
  updatedAt: 'updatedAt' as const,
  votingWindowSeconds: 'votingWindowSeconds' as const,
}

export const enumLevrGovernanceCycleSelectColumn = {
  createdAt: 'createdAt' as const,
  executed: 'executed' as const,
  id: 'id' as const,
  project_id: 'project_id' as const,
  proposalWindowEnd: 'proposalWindowEnd' as const,
  proposalWindowStart: 'proposalWindowStart' as const,
  updatedAt: 'updatedAt' as const,
  votingWindowEnd: 'votingWindowEnd' as const,
}

export const enumLevrMetricsSelectColumn = {
  createdAt: 'createdAt' as const,
  id: 'id' as const,
  lastStakedAt: 'lastStakedAt' as const,
  lastStakedProject_id: 'lastStakedProject_id' as const,
  projectCount: 'projectCount' as const,
  totalStaked: 'totalStaked' as const,
  totalStakers: 'totalStakers' as const,
  updatedAt: 'updatedAt' as const,
}

export const enumLevrProjectSelectColumn = {
  clankerToken_id: 'clankerToken_id' as const,
  createdAt: 'createdAt' as const,
  governor_id: 'governor_id' as const,
  id: 'id' as const,
  stakedToken_id: 'stakedToken_id' as const,
  staking_id: 'staking_id' as const,
  totalProposals: 'totalProposals' as const,
  totalStaked: 'totalStaked' as const,
  treasury_id: 'treasury_id' as const,
  updatedAt: 'updatedAt' as const,
  verified: 'verified' as const,
}

export const enumLevrProposalSelectColumn = {
  amount: 'amount' as const,
  createdAt: 'createdAt' as const,
  cycleId: 'cycleId' as const,
  description: 'description' as const,
  executed: 'executed' as const,
  id: 'id' as const,
  meetsApproval: 'meetsApproval' as const,
  meetsQuorum: 'meetsQuorum' as const,
  noVotes: 'noVotes' as const,
  project_id: 'project_id' as const,
  proposalType: 'proposalType' as const,
  proposer: 'proposer' as const,
  recipient: 'recipient' as const,
  state: 'state' as const,
  token_id: 'token_id' as const,
  totalBalanceVoted: 'totalBalanceVoted' as const,
  updatedAt: 'updatedAt' as const,
  votingEndsAt: 'votingEndsAt' as const,
  votingStartsAt: 'votingStartsAt' as const,
  yesVotes: 'yesVotes' as const,
}

export const enumLevrRewardStreamSelectColumn = {
  createdAt: 'createdAt' as const,
  id: 'id' as const,
  project_id: 'project_id' as const,
  rewardToken_id: 'rewardToken_id' as const,
  streamEnd: 'streamEnd' as const,
  streamStart: 'streamStart' as const,
  streamTotal: 'streamTotal' as const,
  totalDistributed: 'totalDistributed' as const,
  totalVested: 'totalVested' as const,
  updatedAt: 'updatedAt' as const,
}

export const enumLevrStakeActionSelectColumn = {
  actionType: 'actionType' as const,
  amount: 'amount' as const,
  blockNumber: 'blockNumber' as const,
  blockTimestamp: 'blockTimestamp' as const,
  id: 'id' as const,
  project_id: 'project_id' as const,
  staker_id: 'staker_id' as const,
  transactionHash: 'transactionHash' as const,
}

export const enumLevrStakerSelectColumn = {
  createdAt: 'createdAt' as const,
  id: 'id' as const,
  project_id: 'project_id' as const,
  stakeStartTime: 'stakeStartTime' as const,
  stakedBalance: 'stakedBalance' as const,
  stakerAddress: 'stakerAddress' as const,
  totalClaimed: 'totalClaimed' as const,
  updatedAt: 'updatedAt' as const,
  votingPower: 'votingPower' as const,
}

export const enumLevrTreasuryTransferSelectColumn = {
  amount: 'amount' as const,
  blockNumber: 'blockNumber' as const,
  blockTimestamp: 'blockTimestamp' as const,
  id: 'id' as const,
  project_id: 'project_id' as const,
  to: 'to' as const,
  token_id: 'token_id' as const,
  transactionHash: 'transactionHash' as const,
}

export const enumLevrVoteSelectColumn = {
  blockTimestamp: 'blockTimestamp' as const,
  id: 'id' as const,
  proposal_id: 'proposal_id' as const,
  support: 'support' as const,
  transactionHash: 'transactionHash' as const,
  voter: 'voter' as const,
  votes: 'votes' as const,
}

export const enumMoneyMachineConfigSelectColumn = {
  callerIncentive: 'callerIncentive' as const,
  feeRecipient: 'feeRecipient' as const,
  formula: 'formula' as const,
  heartbeatInterval: 'heartbeatInterval' as const,
  hook: 'hook' as const,
  id: 'id' as const,
  poolManager: 'poolManager' as const,
  protocolFeeBps: 'protocolFeeBps' as const,
  rebalanceGas: 'rebalanceGas' as const,
  tickAggregator: 'tickAggregator' as const,
  updatedAt: 'updatedAt' as const,
}

export const enumMoneyMachineHeartbeatSelectColumn = {
  blockNumber: 'blockNumber' as const,
  blockTimestamp: 'blockTimestamp' as const,
  caller: 'caller' as const,
  id: 'id' as const,
  incentivePaid: 'incentivePaid' as const,
  positionsProcessed: 'positionsProcessed' as const,
  rebalancesExecuted: 'rebalancesExecuted' as const,
  transactionHash: 'transactionHash' as const,
}

export const enumMoneyMachinePositionV3PriceSourceSelectColumn = {
  id: 'id' as const,
  pool_id: 'pool_id' as const,
  position_id: 'position_id' as const,
}

export const enumMoneyMachinePositionV4PriceSourceSelectColumn = {
  id: 'id' as const,
  pool_id: 'pool_id' as const,
  position_id: 'position_id' as const,
}

export const enumMoneyMachinePositionSelectColumn = {
  active: 'active' as const,
  amountQuote: 'amountQuote' as const,
  amountToken: 'amountToken' as const,
  closedAt: 'closedAt' as const,
  createdAt: 'createdAt' as const,
  createdTxHash: 'createdTxHash' as const,
  feesPaidQuote: 'feesPaidQuote' as const,
  feesPaidToken: 'feesPaidToken' as const,
  id: 'id' as const,
  originalTickLower: 'originalTickLower' as const,
  owner_id: 'owner_id' as const,
  pool_id: 'pool_id' as const,
  proceedsQuote: 'proceedsQuote' as const,
  proceedsToken: 'proceedsToken' as const,
  quoteToken_id: 'quoteToken_id' as const,
  rebalanceCount: 'rebalanceCount' as const,
  tickLower: 'tickLower' as const,
  tickUpper: 'tickUpper' as const,
  token_id: 'token_id' as const,
  updatedAt: 'updatedAt' as const,
  withdrawnQuote: 'withdrawnQuote' as const,
  withdrawnToken: 'withdrawnToken' as const,
}

export const enumMoneyMachineRebalanceSelectColumn = {
  blockNumber: 'blockNumber' as const,
  blockTimestamp: 'blockTimestamp' as const,
  id: 'id' as const,
  newTickLower: 'newTickLower' as const,
  newTickUpper: 'newTickUpper' as const,
  oldTickLower: 'oldTickLower' as const,
  oldTickUpper: 'oldTickUpper' as const,
  position_id: 'position_id' as const,
  proceedsQuote: 'proceedsQuote' as const,
  proceedsToken: 'proceedsToken' as const,
  transactionHash: 'transactionHash' as const,
}

export const enumMoneyMachineUserSelectColumn = {
  activePositionCount: 'activePositionCount' as const,
  createdAt: 'createdAt' as const,
  gasBalance: 'gasBalance' as const,
  id: 'id' as const,
  positionCount: 'positionCount' as const,
  totalGasConsumed: 'totalGasConsumed' as const,
  totalGasDeposited: 'totalGasDeposited' as const,
  totalGasWithdrawn: 'totalGasWithdrawn' as const,
  updatedAt: 'updatedAt' as const,
}

export const enumMoneyMachineWithdrawalSelectColumn = {
  amountQuote: 'amountQuote' as const,
  amountToken: 'amountToken' as const,
  blockNumber: 'blockNumber' as const,
  blockTimestamp: 'blockTimestamp' as const,
  id: 'id' as const,
  isFullWithdrawal: 'isFullWithdrawal' as const,
  position_id: 'position_id' as const,
  protocolFeeQuote: 'protocolFeeQuote' as const,
  transactionHash: 'transactionHash' as const,
}

export const enumMoneyMachineSelectColumn = {
  activePositions: 'activePositions' as const,
  id: 'id' as const,
  lastHeartbeatBlock: 'lastHeartbeatBlock' as const,
  totalHeartbeats: 'totalHeartbeats' as const,
  totalPositions: 'totalPositions' as const,
  totalRebalances: 'totalRebalances' as const,
  updatedAt: 'updatedAt' as const,
}

export const enumTokenSelectColumn = {
  address: 'address' as const,
  chainId: 'chainId' as const,
  createdAt: 'createdAt' as const,
  decimals: 'decimals' as const,
  id: 'id' as const,
  name: 'name' as const,
  symbol: 'symbol' as const,
  totalSupply: 'totalSupply' as const,
  updatedAt: 'updatedAt' as const,
}

export const enumUniswapV3PoolSelectColumn = {
  address: 'address' as const,
  amount0: 'amount0' as const,
  amount1: 'amount1' as const,
  chainId: 'chainId' as const,
  createdAt: 'createdAt' as const,
  fee: 'fee' as const,
  id: 'id' as const,
  liquidity: 'liquidity' as const,
  sqrtPriceX96: 'sqrtPriceX96' as const,
  tick: 'tick' as const,
  tickSpacing: 'tickSpacing' as const,
  token0_id: 'token0_id' as const,
  token1_id: 'token1_id' as const,
  updatedAt: 'updatedAt' as const,
}

export const enumUniswapV4PoolSelectColumn = {
  amount0: 'amount0' as const,
  amount1: 'amount1' as const,
  chainId: 'chainId' as const,
  createdAt: 'createdAt' as const,
  fee: 'fee' as const,
  hooks: 'hooks' as const,
  id: 'id' as const,
  liquidity: 'liquidity' as const,
  poolId: 'poolId' as const,
  sqrtPriceX96: 'sqrtPriceX96' as const,
  tick: 'tick' as const,
  tickSpacing: 'tickSpacing' as const,
  token0_id: 'token0_id' as const,
  token1_id: 'token1_id' as const,
  updatedAt: 'updatedAt' as const,
}

export const enum_metaSelectColumn = {
  bufferBlock: 'bufferBlock' as const,
  chainId: 'chainId' as const,
  endBlock: 'endBlock' as const,
  eventsProcessed: 'eventsProcessed' as const,
  firstEventBlock: 'firstEventBlock' as const,
  isReady: 'isReady' as const,
  progressBlock: 'progressBlock' as const,
  readyAt: 'readyAt' as const,
  sourceBlock: 'sourceBlock' as const,
  startBlock: 'startBlock' as const,
}

export const enumChainMetadataSelectColumn = {
  block_height: 'block_height' as const,
  chain_id: 'chain_id' as const,
  end_block: 'end_block' as const,
  first_event_block_number: 'first_event_block_number' as const,
  is_hyper_sync: 'is_hyper_sync' as const,
  latest_fetched_block_number: 'latest_fetched_block_number' as const,
  latest_processed_block: 'latest_processed_block' as const,
  num_batches_fetched: 'num_batches_fetched' as const,
  num_events_processed: 'num_events_processed' as const,
  start_block: 'start_block' as const,
  timestamp_caught_up_to_head_or_endblock: 'timestamp_caught_up_to_head_or_endblock' as const,
}

export const enumCursorOrdering = {
  ASC: 'ASC' as const,
  DESC: 'DESC' as const,
}

export const enumOrderBy = {
  asc: 'asc' as const,
  asc_nulls_first: 'asc_nulls_first' as const,
  asc_nulls_last: 'asc_nulls_last' as const,
  desc: 'desc' as const,
  desc_nulls_first: 'desc_nulls_first' as const,
  desc_nulls_last: 'desc_nulls_last' as const,
}

export const enumRawEventsSelectColumn = {
  block_fields: 'block_fields' as const,
  block_hash: 'block_hash' as const,
  block_number: 'block_number' as const,
  block_timestamp: 'block_timestamp' as const,
  chain_id: 'chain_id' as const,
  contract_name: 'contract_name' as const,
  event_id: 'event_id' as const,
  event_name: 'event_name' as const,
  log_index: 'log_index' as const,
  params: 'params' as const,
  serial: 'serial' as const,
  src_address: 'src_address' as const,
  transaction_fields: 'transaction_fields' as const,
}
