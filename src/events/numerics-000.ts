import type { EnricherCtx } from './types'

export const numerics000 = {
  // params: <client> :<text>
  RPL_WELCOME: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> :<text>
  RPL_YOURHOST: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> :<text>
  RPL_CREATED: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> <servername> <version> <available user modes> <available channel modes> [<channel modes with a parameter>]
  RPL_MYINFO: ({ req, opt }: EnricherCtx) => ({
    client: req(),
    servername: req(),
    version: req(),
    availableUserModes: req(),
    availableChanModes: req(),
    chanModesWithParam: opt(),
  }),

  // params: <client> <1-13 tokens> :are supported by this server
  RPL_ISUPPORT: ({ req, rest }: EnricherCtx) => {
    const client = req()
    const r = rest()
    return {
      client,
      tokens: r.slice(0, -1),
      text: r.at(-1),
    }
  },

  // params: <client> <hostname> <port> :<info>
  RPL_BOUNCE: ({ req }: EnricherCtx) => ({
    client: req(),
    hostname: req(),
    port: req(),
    info: req(),
  }),
}
