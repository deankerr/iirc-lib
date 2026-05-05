import type { EnricherCtx } from './types'

export const numerics600 = {
  // params: <client> :STARTTLS successful, proceed with TLS handshake
  RPL_STARTTLS: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> <nick> :is using a secure connection
  RPL_WHOISSECURE: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    nick: param(),
    text: trailing(),
  }),

  // params: <client> :STARTTLS failed (Wrong moon phase)
  ERR_STARTTLS: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> <target chan/user> <mode char> <parameter> :<description>
  ERR_INVALIDMODEPARAM: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    target: param(),
    modeChar: param(),
    parameter: param(),
    description: trailing(),
  }),
}
