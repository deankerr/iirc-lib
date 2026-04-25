import type { Runtime } from '../runtime'

// Tracks post-registration identity drift and account state.
//
// Protocol ref: NICK, RPL_LOGGEDIN (900), RPL_LOGGEDOUT (901).
//
// State values read: runtime.connectionState.nick, runtime.numerics
// State values set: runtime.connectionState (nick, account)

export function identity(runtime: Runtime): void {
  runtime.on('message', (message) => {
    switch (message.command) {
      case 'NICK': {
        const source = runtime.parseSource(message.source)

        // Malformed or partial nick changes are ignored so this feature only
        // advances when the server gave us a concrete before/after identity.
        if (source?.nick === undefined || source.nick.length === 0 || !source.isSelf) {
          break
        }

        const [nextNick] = message.params
        if (nextNick === undefined || nextNick.length === 0) {
          break
        }

        runtime.connectionState.nick = nextNick
        break
      }

      case runtime.numerics.RPL_LOGGEDIN: {
        runtime.connectionState.account = message.params[2] ?? runtime.connectionState.account
        break
      }

      case runtime.numerics.RPL_LOGGEDOUT: {
        runtime.connectionState.account = undefined
        break
      }

      default: {
        break
      }
    }
  })
}
