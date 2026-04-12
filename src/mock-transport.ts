import { EventEmitter } from 'node:events'
import type { Duplex } from 'node:stream'

export function createMockTransport() {
  const emitter = new EventEmitter()
  const sentLines: string[] = []

  const stream = {
    setEncoding(_enc: string) {
      // no-op: mock doesn't need encoding
    },

    on(event: string, handler: (...args: unknown[]) => void) {
      emitter.on(event, handler)
      return this
    },

    write(data: string) {
      for (const line of data.split('\r\n')) {
        if (line) sentLines.push(line)
      }
      return true
    },

    end() {
      // no-op: mock doesn't need cleanup
    },
  }

  return {
    stream: stream as unknown as Duplex,
    sentLines,

    receive(lines: string | string[]) {
      const arr = Array.isArray(lines) ? lines : [lines]
      for (const line of arr) {
        emitter.emit('data', `${line}\r\n`)
      }
    },

    close() {
      emitter.emit('close')
    },

    error(err: Error) {
      emitter.emit('error', err)
    },
  }
}
