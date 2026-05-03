import type { Runtime } from '../runtime'

export function ping(runtime: Runtime): void {
  runtime.on('event', (event) => {
    if (event.command !== 'PING') {
      return
    }
    runtime.send('PONG', event.token)
  })
}
