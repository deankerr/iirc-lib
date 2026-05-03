import type { EnricherCtx } from './types'

export const numerics900 = {
  // params: <client> <nick>!<user>@<host> <account> :You are now logged in as <username>
  RPL_LOGGEDIN: ({ req, rest }: EnricherCtx) => {
    const client = req()
    const r = rest()
    return {
      client,
      nickUserHost: r[0],
      account: r[1],
      text: r.at(-1),
    }
  },

  // params: <client> <nick>!<user>@<host> :You are now logged out
  RPL_LOGGEDOUT: ({ req }: EnricherCtx) => ({
    client: req(),
    nickUserHost: req(),
    text: req(),
  }),

  // params: <client> :You must use a nick assigned to you
  ERR_NICKLOCKED: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> :SASL authentication successful
  RPL_SASLSUCCESS: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> :SASL authentication failed
  ERR_SASLFAIL: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> :SASL message too long
  ERR_SASLTOOLONG: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> :SASL authentication aborted
  ERR_SASLABORTED: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> :You have already authenticated using SASL
  ERR_SASLALREADY: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> <mechanisms> :are available SASL mechanisms
  RPL_SASLMECHS: ({ req }: EnricherCtx) => ({
    client: req(),
    mechanisms: req(),
    text: req(),
  }),
}
