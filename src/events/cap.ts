import type { EnricherCtx } from './types'

export const capEnrichers = {
  // params: <client> <subcommand> [*] :<caps>
  // The continuation marker (*) appears as params[2] only for LS in CAP 302.
  // When present, caps shift to params[3]; otherwise caps are at params[2].
  CAP: ({ req, opt }: EnricherCtx) => {
    const client = req()
    const subcommand = req()
    const p2 = opt()
    const p3 = opt()
    const hasContinuation = p2 === '*'
    const capsString = hasContinuation ? (p3 ?? '') : (p2 ?? '')
    return { client, subcommand, hasContinuation, capsString }
  },

  // params: <data>
  // Server sends "+" as data to indicate an empty challenge (no server-first
  // data), or base64-encoded challenge data up to 400 bytes per line.
  AUTHENTICATE: ({ req }: EnricherCtx) => ({
    data: req(),
  }),
}
