import type { Runtime } from '../runtime'

export function capabilities(runtime: Runtime): void {
  const config = runtime.getConfig()
  const availableCaps = new Set<string>()

  runtime.on('attach', () => {
    runtime.send('CAP', 'LS', '302')
    availableCaps.clear()
  })

  runtime.on('message', (message) => {
    if (message.command !== 'CAP') return

    const subcommand = message.params[1]
    if (subcommand === undefined) return

    switch (subcommand) {
      case 'LS': {
        const hasContinuation = message.params[2] === '*'
        const capsParamIndex = hasContinuation ? 3 : 2
        const capsString = message.params[capsParamIndex] ?? ''

        for (const cap of capsString.split(' ')) {
          if (cap.length === 0) continue
          const capName = cap.split('=')[0]
          if (capName) availableCaps.add(capName)
        }

        if (hasContinuation) return

        if (config.requestedCapabilities.length === 0) {
          runtime.send('CAP', 'END')
          return
        }

        const capsToRequest = config.requestedCapabilities.filter((cap) => availableCaps.has(cap))
        if (capsToRequest.length === 0) {
          runtime.send('CAP', 'END')
          return
        }

        runtime.sendCommand({
          command: 'CAP',
          params: ['REQ', capsToRequest.join(' ')],
          trailing: true,
        })
        break
      }

      case 'ACK': {
        const capsString = message.params[2] ?? ''
        for (const cap of capsString.split(' ')) {
          if (cap.length === 0) continue
          if (cap.startsWith('-')) {
            runtime.activeCaps.delete(cap.slice(1))
          } else {
            runtime.activeCaps.add(cap)
          }
        }
        if (!config.sasl || !runtime.activeCaps.has('sasl')) {
          runtime.send('CAP', 'END')
        }
        break
      }

      case 'NAK': {
        const rejectedCaps = message.params[2] ?? ''
        console.log('[capabilities] CAP NAK', { caps: rejectedCaps })
        runtime.send('CAP', 'END')
        break
      }
    }
  })
}
