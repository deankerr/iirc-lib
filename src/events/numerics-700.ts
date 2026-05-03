import type { EnricherCtx } from './types'

export const numerics700 = {
  // params: <client> <subject> :<first line of help section>
  RPL_HELPSTART: ({ req }: EnricherCtx) => ({
    client: req(),
    subject: req(),
    text: req(),
  }),

  // params: <client> <subject> :<line of help text>
  RPL_HELPTXT: ({ req }: EnricherCtx) => ({
    client: req(),
    subject: req(),
    text: req(),
  }),

  // params: <client> <subject> :<last line of help text>
  RPL_ENDOFHELP: ({ req }: EnricherCtx) => ({
    client: req(),
    subject: req(),
    text: req(),
  }),

  // params: <client> <priv> :Insufficient oper privileges.
  ERR_NOPRIVS: ({ req }: EnricherCtx) => ({
    client: req(),
    priv: req(),
    text: req(),
  }),
}
