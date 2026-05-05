import type { EnricherCtx } from './types'

export const numerics000 = {
  // params: <client> :<text>
  RPL_WELCOME: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> :<text>
  RPL_YOURHOST: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> :<text>
  RPL_CREATED: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> <servername> <version> <available user modes> <available channel modes> [<channel modes with a parameter>]
  RPL_MYINFO: ({ param, optional }: EnricherCtx) => ({
    client: param(),
    servername: param(),
    version: param(),
    availableUserModes: param(),
    availableChanModes: param(),
    chanModesWithParam: optional(),
  }),

  // params: <client> <1-13 tokens> :are supported by this server
  RPL_ISUPPORT: ({ param, rest }: EnricherCtx) => {
    const client = param()
    const r = rest()
    return {
      client,
      tokens: r.slice(0, -1),
      text: r.at(-1),
    }
  },

  // params: <client> <hostname> <port> :<info>
  RPL_BOUNCE: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    hostname: param(),
    port: param(),
    info: trailing(),
  }),
}
