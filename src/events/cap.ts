import type { EnricherCtx } from './types'

export const capEnrichers = {
  // params: <client> <subcommand> [*] :<caps>
  // The continuation marker (*) appears as params[2] only for LS in CAP 302.
  // When present, caps shift to params[3]; otherwise caps are at params[2].
  CAP: ({ param, optional }: EnricherCtx) => {
    const client = param()
    const subcommand = param()
    const p2 = optional()
    const p3 = optional()
    const hasContinuation = p2 === '*'
    const capsString = hasContinuation ? (p3 ?? '') : (p2 ?? '')
    return { client, subcommand, hasContinuation, capsString }
  },

  // params: <data>
  // Server sends "+" as data to indicate an empty challenge (no server-first
  // data), or base64-encoded challenge data up to 400 bytes per line.
  AUTHENTICATE: ({ param }: EnricherCtx) => ({
    data: param(),
  }),
}
