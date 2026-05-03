import type { EnricherCtx } from './types'

export const numerics500 = {
  // params: <client> :Unknown MODE flag
  ERR_UMODEUNKNOWNFLAG: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> :Cant change mode for other users
  ERR_USERSDONTMATCH: ({ req }: EnricherCtx) => ({
    client: req(),
    text: req(),
  }),

  // params: <client> <subject> :No help available on this topic
  ERR_HELPNOTFOUND: ({ req }: EnricherCtx) => ({
    client: req(),
    subject: req(),
    text: req(),
  }),

  // params: <client> <target chan> :Key is not well-formed
  ERR_INVALIDKEY: ({ req }: EnricherCtx) => ({
    client: req(),
    target: req(),
    text: req(),
  }),
}
