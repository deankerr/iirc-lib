import type { EnricherCtx } from './types'

export const numerics700 = {
  // params: <client> <subject> :<first line of help section>
  RPL_HELPSTART: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    subject: param(),
    text: trailing(),
  }),

  // params: <client> <subject> :<line of help text>
  RPL_HELPTXT: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    subject: param(),
    text: trailing(),
  }),

  // params: <client> <subject> :<last line of help text>
  RPL_ENDOFHELP: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    subject: param(),
    text: trailing(),
  }),

  // params: <client> <priv> :Insufficient oper privileges.
  ERR_NOPRIVS: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    priv: param(),
    text: trailing(),
  }),
}
