import { EventEmitter } from 'node:events'
import type { Duplex } from 'node:stream'

export function createMockTransport() {
  const emitter = new EventEmitter()
  const sentLines: string[] = []

  const stream = {
    setEncoding(_encoding: string) {
      // The mock always operates on strings, so there is nothing to configure.
    },

    on(event: string, handler: (...args: unknown[]) => void) {
      emitter.on(event, handler)
      return this
    },

    write(data: string) {
      for (const line of data.split('\r\n')) {
        if (line.length > 0) {
          sentLines.push(line)
        }
      }
      return true
    },
  }

  return {
    stream: stream as unknown as Duplex,
    sentLines,

    receive(lines: string | readonly string[]) {
      const batch = Array.isArray(lines) ? lines : [lines]
      for (const line of batch) {
        emitter.emit('data', `${line}\r\n`)
      }
    },

    close() {
      emitter.emit('close')
    },

    error(error: Error) {
      emitter.emit('error', error)
    },
  }
}
