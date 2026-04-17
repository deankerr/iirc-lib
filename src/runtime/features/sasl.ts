import type { Runtime } from '../runtime'

export function sasl(runtime: Runtime): void {
  const config = runtime.getConfig()
  if (!config.sasl) return

  const saslConfig = config.sasl

  runtime.on('message', (message) => {
    if (message.command === 'CAP' && message.params[1] === 'ACK') {
      const capsString = message.params[2] ?? ''
      if (capsString.split(' ').includes('sasl')) {
        runtime.send('AUTHENTICATE', 'PLAIN')
      }
      return
    }

    if (message.command === 'AUTHENTICATE' && message.params[0] === '+') {
      sendSaslPayload(runtime, saslConfig)
      return
    }

    switch (message.command) {
      case runtime.numerics.RPL_SASLSUCCESS:
        runtime.send('CAP', 'END')
        break

      case runtime.numerics.ERR_SASLFAIL:
        runtime.emit('error', new Error('SASL authentication failed'))
        break

      case runtime.numerics.ERR_NICKLOCKED:
        runtime.emit('error', new Error('SASL authentication failed: nick is locked'))
        break

      case runtime.numerics.ERR_SASLTOOLONG:
        runtime.emit('error', new Error('SASL authentication failed: message too long'))
        break
    }
  })
}

function sendSaslPayload(
  runtime: Runtime,
  saslConfig: { username: string; password: string },
): void {
  const payload = `${saslConfig.username}\x00${saslConfig.password}`
  const encoded = Buffer.from(payload, 'utf8').toString('base64')

  for (let i = 0; i < encoded.length; i += 400) {
    runtime.send('AUTHENTICATE', encoded.slice(i, i + 400))
  }
}
