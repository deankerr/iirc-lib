import type { EnricherCtx } from './types'

export const commandEnrichers = {
  // params: <target> :<text>
  PRIVMSG: ({ param, trailing }: EnricherCtx) => ({
    target: param(),
    text: trailing(),
  }),

  // params: <target> :<text>
  NOTICE: ({ param, trailing }: EnricherCtx) => ({
    target: param(),
    text: trailing(),
  }),

  // params: <channel> :<topic>
  TOPIC: ({ param, trailing }: EnricherCtx) => ({
    channel: param(),
    topic: trailing(),
  }),

  // params: :<token>
  PING: ({ trailing }: EnricherCtx) => ({
    token: trailing(),
  }),

  // params: <server> [:<token>]
  PONG: ({ param, optional }: EnricherCtx) => ({
    server: param(),
    token: optional(),
  }),

  // params: :<reason>
  ERROR: ({ trailing }: EnricherCtx) => ({
    reason: trailing(),
  }),

  // params: <target> <modestring> [<mode arguments>...]
  MODE: ({ param, rest }: EnricherCtx) => ({
    target: param(),
    modestring: param(),
    modeArgs: rest(),
  }),

  // params: <nickname> :<comment>
  KILL: ({ param, trailing }: EnricherCtx) => ({
    nickname: param(),
    comment: trailing(),
  }),

  // params: :<message>
  WALLOPS: ({ trailing }: EnricherCtx) => ({
    message: trailing(),
  }),

  // params: <channel>
  JOIN: ({ param }: EnricherCtx) => ({
    channel: param(),
  }),

  // params: <channel> [:<reason>]
  PART: ({ param, optional }: EnricherCtx) => ({
    channel: param(),
    reason: optional(),
  }),

  // params: [:<reason>]
  QUIT: ({ optional }: EnricherCtx) => ({
    reason: optional(),
  }),

  // params: <newnick>
  NICK: ({ param }: EnricherCtx) => ({
    newnick: param(),
  }),

  // params: <channel> <user> [:<comment>]
  KICK: ({ param, optional }: EnricherCtx) => ({
    channel: param(),
    user: param(),
    comment: optional(),
  }),

  // params: <nickname> <channel>
  INVITE: ({ param }: EnricherCtx) => ({
    nickname: param(),
    channel: param(),
  }),
}
