import type { EnricherCtx } from './types'

export const numerics500 = {
  // params: <client> :Unknown MODE flag
  ERR_UMODEUNKNOWNFLAG: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> :Cant change mode for other users
  ERR_USERSDONTMATCH: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    text: trailing(),
  }),

  // params: <client> <subject> :No help available on this topic
  ERR_HELPNOTFOUND: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    subject: param(),
    text: trailing(),
  }),

  // params: <client> <target chan> :Key is not well-formed
  ERR_INVALIDKEY: ({ param, trailing }: EnricherCtx) => ({
    client: param(),
    target: param(),
    text: trailing(),
  }),
}
