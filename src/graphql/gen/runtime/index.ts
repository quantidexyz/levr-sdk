// @ts-nocheck
export type { ClientOptions } from './createClient'
export { createClient } from './createClient'
export type { GraphqlOperation } from './generateGraphqlOperation'
export { generateGraphqlOperation } from './generateGraphqlOperation'
export { linkTypeMap } from './linkTypeMap'
export type { FieldsSelection } from './typeSelection'
// export { Observable } from 'zen-observable-ts'
export { GenqlError } from './error'
export { createFetcher } from './fetcher'
export const everything = {
  __scalar: true,
}
