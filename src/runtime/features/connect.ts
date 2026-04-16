import type { Runtime } from '../runtime'

export function connect(runtime: Runtime): void {
  const config = runtime.getConfig()

  runtime.on('attach', () => {
    if (config.password) {
      runtime.send('PASS', config.password)
    }
    runtime.send('NICK', config.nick)
    runtime.sendCommand({
      command: 'USER',
      params: [config.user, '0', '*', config.realname],
      trailing: true,
    })
  })

  runtime.on('message', (message) => {
    switch (message.command) {
      case runtime.numerics.RPL_WELCOME: {
        const self = runtime.parseSource(message.params.at(-1))

        runtime.connectionState.nick =
          message.params[0] ?? self?.nick ?? runtime.connectionState.nick
        runtime.connectionState.user = self?.user ?? runtime.connectionState.user
        runtime.connectionState.host = self?.host ?? runtime.connectionState.host
        runtime.connectionState.registered = true
        runtime.connectionState.serverHost = message.source ?? runtime.connectionState.serverHost
        runtime.status = 'registered'
        runtime.emit('registered')
        break
      }

      case runtime.numerics.RPL_MYINFO:
        runtime.connectionState.serverVersion =
          message.params[2] ?? runtime.connectionState.serverVersion
        break

      default:
        break
    }
  })
}
