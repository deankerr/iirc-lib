import type { Runtime } from '../runtime'

// Tracks who we are on the network: nick, user, host, account, and
// registration state. Emits 'registered' when 001 arrives.
//
// Protocol ref: Connection Registration (§06), RPL_WELCOME (001),
// RPL_MYINFO (004), RPL_LOGGEDIN (900), RPL_LOGGEDOUT (901).
//
// State values read: runtime.connectionState.nick, runtime.numerics
// State values set: runtime.connectionState (nick, user, host, serverHost,
//   serverVersion, registered, account)
// Events emitted: registered

export function identity(runtime: Runtime): void {
  runtime.on('message', (message) => {
    switch (message.command) {
      // 001 RPL_WELCOME confirms registration. The first param is the
      // assigned nickname (may differ from what we requested). The trailing
      // param may contain nick!user@host.
      case runtime.numerics.RPL_WELCOME: {
        const self = runtime.parseSource(message.params.at(-1))
        runtime.connectionState.nick =
          message.params[0] ?? self?.nick ?? runtime.connectionState.nick
        runtime.connectionState.user = self?.user ?? runtime.connectionState.user
        runtime.connectionState.host = self?.host ?? runtime.connectionState.host
        runtime.connectionState.registered = true
        runtime.connectionState.serverHost = message.source ?? runtime.connectionState.serverHost
        runtime.emit('registered')
        break
      }

      case runtime.numerics.RPL_MYINFO:
        runtime.connectionState.serverVersion =
          message.params[2] ?? runtime.connectionState.serverVersion
        break

      case 'NICK': {
        const sourceNick = runtime.parseSourceNick(message.source)
        const currentNick = runtime.connectionState.nick

        if (!sourceNick || !currentNick) break
        if (runtime.caseFold(sourceNick) !== runtime.caseFold(currentNick)) break

        const nextNick = message.params[0]
        if (!nextNick) break

        runtime.connectionState.nick = nextNick
        break
      }

      case runtime.numerics.RPL_LOGGEDIN:
        runtime.connectionState.account = message.params[2] ?? runtime.connectionState.account
        break

      case runtime.numerics.RPL_LOGGEDOUT:
        runtime.connectionState.account = undefined
        break

      default:
        break
    }
  })
}
