import type { Runtime } from '../runtime'

export function ping(runtime: Runtime): void {
  runtime.on('message', (message) => {
    if (message.command !== 'PING') return
    runtime.send('PONG', message.params[0] ?? '')
  })
}
