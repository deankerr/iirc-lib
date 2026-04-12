export {
  Client,
  type ClientConfig,
  type ClientStatus,
  type ParsedMessage,
  type Self,
  type ServerInfo,
} from './client/client'

export {
  createClient,
  type CreateClientConfig,
  type FacadeStatus,
  type IrcClient,
} from './client/facade'

export type {
  ChannelTracker,
  ChannelTrackerHost,
  ChannelState,
  ChannelMember,
} from './client/channels'

export { Numeric } from './client/protocol/numerics'
export type { IrcMessage } from './client/protocol/parser'
