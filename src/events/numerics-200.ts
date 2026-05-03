import type { EnricherCtx } from './types'

export const numerics200 = {
  // params: <client> <command> <count> [<byte count> <remote count>]
  RPL_STATSCOMMANDS: ({ req, rest }: EnricherCtx) => {
    const client = req()
    const command = req()
    const count = req()
    const r = rest()
    return {
      client,
      command,
      count,
      byteCount: r[0],
      remoteCount: r[1],
    }
  },

  // params: <client> <stats letter> :End of /STATS report
  RPL_ENDOFSTATS: ({ req }: EnricherCtx) => ({
    client: req(),
    statsLetter: req(),
    text: req(),
  }),

  // params: <client> <user modes>
  RPL_UMODEIS: ({ req }: EnricherCtx) => ({
    client: req(),
    userModes: req(),
  }),

  // params: <client> :Server Up <days> days <hours>:<minutes>:<seconds>
  RPL_STATSUPTIME: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> :There are <u> users and <i> invisible on <s> servers
  RPL_LUSERCLIENT: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> <ops> :operator(s) online
  RPL_LUSEROP: ({ req }: EnricherCtx) => ({
    client: req(),
    ops: req(),
    text: req(),
  }),

  // params: <client> <connections> :unknown connection(s)
  RPL_LUSERUNKNOWN: ({ req }: EnricherCtx) => ({
    client: req(),
    connections: req(),
    text: req(),
  }),

  // params: <client> <channels> :channels formed
  RPL_LUSERCHANNELS: ({ req }: EnricherCtx) => ({
    client: req(),
    channels: req(),
    text: req(),
  }),

  // params: <client> :I have <c> clients and <s> servers
  RPL_LUSERME: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> [<server>] :Administrative info
  RPL_ADMINME: ({ req, rest }: EnricherCtx) => {
    const client = req()
    const r = rest()
    return {
      client,
      server: r.length > 1 ? r[0] : undefined,
      info: r.at(-1),
    }
  },

  // params: <client> :<info>
  RPL_ADMINLOC1: ({ req }: EnricherCtx) => ({
    client: req(),
    info: req(),
  }),

  // params: <client> :<info>
  RPL_ADMINLOC2: ({ req }: EnricherCtx) => ({
    client: req(),
    info: req(),
  }),

  // params: <client> :<info>
  RPL_ADMINEMAIL: ({ req }: EnricherCtx) => ({
    client: req(),
    info: req(),
  }),

  // params: <client> <command> :Please wait a while and try again.
  RPL_TRYAGAIN: ({ req }: EnricherCtx) => ({
    client: req(),
    command: req(),
    text: req(),
  }),

  // params: <client> [<u> <m>] :Current local users <u>, max <m>
  RPL_LOCALUSERS: ({ req, rest }: EnricherCtx) => {
    const client = req()
    const r = rest()
    return {
      client,
      u: r.length > 1 ? r[0] : undefined,
      m: r.length > 1 ? r[1] : undefined,
      text: r.at(-1),
    }
  },

  // params: <client> [<u> <m>] :Current global users <u>, max <m>
  RPL_GLOBALUSERS: ({ req, rest }: EnricherCtx) => {
    const client = req()
    const r = rest()
    return {
      client,
      u: r.length > 1 ? r[0] : undefined,
      m: r.length > 1 ? r[1] : undefined,
      text: r.at(-1),
    }
  },

  // params: <client> <nick> :has client certificate fingerprint <fingerprint>
  RPL_WHOISCERTFP: ({ req }: EnricherCtx) => ({
    client: req(),
    nick: req(),
    text: req(),
  }),
}
