import type { EnricherCtx } from './types'

export const numerics200 = {
  // params: <client> <command> <count> [<byte count> <remote count>]
  RPL_STATSCOMMANDS: ({ param, rest }: EnricherCtx) => {
    const client = param()
    const command = param()
    const count = param()
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
  RPL_ENDOFSTATS: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    statsLetter: param(),
    text: trailing(),
  }),

  // params: <client> <user modes>
  RPL_UMODEIS: ({ param }: EnricherCtx) => ({
    client: param(),
    userModes: param(),
  }),

  // params: <client> :Server Up <days> days <hours>:<minutes>:<seconds>
  RPL_STATSUPTIME: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> :There are <u> users and <i> invisible on <s> servers
  RPL_LUSERCLIENT: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> <ops> :operator(s) online
  RPL_LUSEROP: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    ops: param(),
    text: trailing(),
  }),

  // params: <client> <connections> :unknown connection(s)
  RPL_LUSERUNKNOWN: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    connections: param(),
    text: trailing(),
  }),

  // params: <client> <channels> :channels formed
  RPL_LUSERCHANNELS: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    channels: param(),
    text: trailing(),
  }),

  // params: <client> :I have <c> clients and <s> servers
  RPL_LUSERME: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> [<server>] :Administrative info
  RPL_ADMINME: ({ param, rest }: EnricherCtx) => {
    const client = param()
    const r = rest()
    return {
      client,
      server: r.length > 1 ? r[0] : undefined,
      info: r.at(-1),
    }
  },

  // params: <client> :<info>
  RPL_ADMINLOC1: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    info: trailing(),
  }),

  // params: <client> :<info>
  RPL_ADMINLOC2: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    info: trailing(),
  }),

  // params: <client> :<info>
  RPL_ADMINEMAIL: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    info: trailing(),
  }),

  // params: <client> <command> :Please wait a while and try again.
  RPL_TRYAGAIN: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    command: param(),
    text: trailing(),
  }),

  // params: <client> [<u> <m>] :Current local users <u>, max <m>
  RPL_LOCALUSERS: ({ param, rest }: EnricherCtx) => {
    const client = param()
    const r = rest()
    return {
      client,
      u: r.length > 1 ? r[0] : undefined,
      m: r.length > 1 ? r[1] : undefined,
      text: r.at(-1),
    }
  },

  // params: <client> [<u> <m>] :Current global users <u>, max <m>
  RPL_GLOBALUSERS: ({ param, rest }: EnricherCtx) => {
    const client = param()
    const r = rest()
    return {
      client,
      u: r.length > 1 ? r[0] : undefined,
      m: r.length > 1 ? r[1] : undefined,
      text: r.at(-1),
    }
  },

  // params: <client> <nick> :has client certificate fingerprint <fingerprint>
  RPL_WHOISCERTFP: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    nick: param(),
    text: trailing(),
  }),
}
