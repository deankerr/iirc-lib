import { EventEmitter } from 'node:events'
import type { Duplex } from 'node:stream'

export function createMockTransport() {
  const emitter = new EventEmitter()
  const sentLines: string[] = []

  const stream = {
    on(event: string, handler: (...args: unknown[]) => void) {
      emitter.on(event, handler)
      return this
    },

    removeListener(event: string, handler: (...args: unknown[]) => void) {
      emitter.removeListener(event, handler)
      return this
    },

    setEncoding(_encoding: string) {
      // The mock always operates on strings, so there is nothing to configure.
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
    close() {
      emitter.emit('close')
    },
    error(error: Error) {
      emitter.emit('error', error)
    },

    receive(lines: string | readonly string[]) {
      const batch = Array.isArray(lines) ? lines : [lines]
      for (const line of batch) {
        emitter.emit('data', `${line}\r\n`)
      }
    },

    sentLines,

    stream: stream as unknown as Duplex,
  }
}
