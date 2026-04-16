import type { Runtime } from '../runtime'

export function identity(runtime: Runtime): void {
  runtime.on('message', (message) => {
    switch (message.command) {
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
