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

  // params: <channel> <topic>
  TOPIC: ({ req, str }: EnricherCtx) => ({
    channel: req(),
    topic: str(),
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

  // params: <target> <modestring> [<mode arguments>...]
  MODE: ({ req, rest }: EnricherCtx) => ({
    target: req(),
    modestring: req(),
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

  // params: <channel>
  JOIN: ({ req }: EnricherCtx) => ({
    channel: req(),
  }),

  // params: <channel> [<reason>]
  PART: ({ req, opt }: EnricherCtx) => ({
    channel: req(),
    reason: opt(),
  }),

  // params: [<reason>]
  QUIT: ({ opt }: EnricherCtx) => ({
    reason: opt(),
  }),

  // params: <newnick>
  NICK: ({ req }: EnricherCtx) => ({
    newnick: req(),
  }),

  KICK: ({ req, opt }: EnricherCtx) => ({
    channel: req(),
    user: req(),
    comment: opt(),
  }),

  // params: <nickname> <channel>
  INVITE: ({ req }: EnricherCtx) => ({
    nickname: req(),
    channel: req(),
  }),
}
