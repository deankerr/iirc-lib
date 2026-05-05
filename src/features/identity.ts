import type { Runtime } from '../runtime'

// Tracks post-registration identity drift and account state.
//
// Protocol ref: NICK, RPL_LOGGEDIN (900), RPL_LOGGEDOUT (901).
//
// State values read: runtime.connectionState.nick
// State values set: runtime.connectionState (nick, account)

export function identity(runtime: Runtime): void {
  runtime.on('event', (event) => {
    if (event.command === 'NICK') {
      if (!event.from.isSelf) {
        return
      }
      runtime.connectionState.nick = event.newnick
      return
    }

    if (event.command === 'RPL_LOGGEDIN') {
      runtime.connectionState.account = event.account ?? runtime.connectionState.account
      return
    }

    if (event.command === 'RPL_LOGGEDOUT') {
      runtime.connectionState.account = undefined
    }
  })
}
