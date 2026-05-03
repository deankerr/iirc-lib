import type { EnricherCtx } from './types'

export const commandEnrichers = {
  // params: <target> <text>
  PRIVMSG: ({ req }: EnricherCtx) => ({
    target: req(),
    text: req(),
  }),

  // params: <target> <text>
  NOTICE: ({ req }: EnricherCtx) => ({
    target: req(),
    text: req(),
  }),

  // params: <channel> [<topic>]
  TOPIC: ({ req, opt }: EnricherCtx) => ({
    channel: req(),
    topic: opt(),
  }),

  // params: <token>
  PING: ({ req }: EnricherCtx) => ({
    token: req(),
  }),

  // params: <server> [<token>]
  PONG: ({ req, opt }: EnricherCtx) => ({
    server: req(),
    token: opt(),
  }),

  // params: <reason>
  ERROR: ({ req }: EnricherCtx) => ({
    reason: req(),
  }),

  // params: <target> [<modestring> [<mode arguments>...]]
  MODE: ({ req, opt, rest }: EnricherCtx) => ({
    target: req(),
    modestring: opt(),
    modeArgs: rest(),
  }),

  // params: <nickname> <comment>
  KILL: ({ req }: EnricherCtx) => ({
    nickname: req(),
    comment: req(),
  }),

  // params: <message>
  WALLOPS: ({ req }: EnricherCtx) => ({
    message: req(),
  }),

  JOIN: ({ req }: EnricherCtx) => ({
    channel: req(),
  }),

  PART: ({ req, opt }: EnricherCtx) => ({
    channel: req(),
    reason: opt(),
  }),

  QUIT: ({ opt }: EnricherCtx) => ({
    reason: opt(),
  }),

  NICK: ({ req }: EnricherCtx) => ({
    newnick: req(),
  }),

  KICK: ({ req, opt }: EnricherCtx) => ({
    channel: req(),
    user: req(),
    comment: opt(),
  }),

  INVITE: ({ req }: EnricherCtx) => ({
    nickname: req(),
    channel: req(),
  }),
}
