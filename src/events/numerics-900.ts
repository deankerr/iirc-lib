import type { EnricherCtx } from './types'

export const numerics900 = {
  // params: <client> <nick>!<user>@<host> <account> :You are now logged in as <username>
  RPL_LOGGEDIN: ({ param, rest }: EnricherCtx) => {
    const client = param()
    const r = rest()
    return {
      client,
      nickUserHost: r[0],
      account: r[1],
      text: r.at(-1),
    }
  },

  // params: <client> <nick>!<user>@<host> :You are now logged out
  RPL_LOGGEDOUT: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    nickUserHost: param(),
    text: trailing(),
  }),

  // params: <client> :You must use a nick assigned to you
  ERR_NICKLOCKED: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> :SASL authentication successful
  RPL_SASLSUCCESS: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> :SASL authentication failed
  ERR_SASLFAIL: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> :SASL message too long
  ERR_SASLTOOLONG: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> :SASL authentication aborted
  ERR_SASLABORTED: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> :You have already authenticated using SASL
  ERR_SASLALREADY: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> <mechanisms> :are available SASL mechanisms
  RPL_SASLMECHS: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    mechanisms: param(),
    text: trailing(),
  }),
}
