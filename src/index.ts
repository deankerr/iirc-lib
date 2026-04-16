// The package surface is intentionally tiny.
// We expose only the client and the small set of types consumers naturally need
// to write against its public API.
export { Client, type ClientConfig, type ClientEvents } from './client'
export type { IrcMessage, IrcTags } from './runtime/transport/types'
export type { SaslConfig } from './runtime/runtime'
