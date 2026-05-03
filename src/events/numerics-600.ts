import type { EnricherCtx } from './types'

export const numerics600 = {
  // params: <client> :STARTTLS successful, proceed with TLS handshake
  RPL_STARTTLS: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> <nick> :is using a secure connection
  RPL_WHOISSECURE: ({ req }: EnricherCtx) => ({
    client: req(),
    nick: req(),
    text: req(),
  }),

  // params: <client> :STARTTLS failed (Wrong moon phase)
  ERR_STARTTLS: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> <target chan/user> <mode char> <parameter> :<description>
  ERR_INVALIDMODEPARAM: ({ req }: EnricherCtx) => ({
    client: req(),
    target: req(),
    modeChar: req(),
    parameter: req(),
    description: req(),
  }),
}
