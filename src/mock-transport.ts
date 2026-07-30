import { PassThrough } from 'node:stream'

export function createMockTransport() {
  const sentLines: string[] = []
  const stream = new PassThrough()

  // Keep outbound writes observable without feeding them back into the
  // readable side. Tests inject server traffic separately via receive().
  stream.write = (chunk: string | Uint8Array): boolean => {
    const data = typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf-8')

    for (const line of data.split('\r\n')) {
      if (line.length > 0) {
        sentLines.push(line)
      }
    }

    return true
  }

  return {
    close() {
      stream.emit('close')
    },

    error(error: Error) {
      stream.emit('error', error)
    },

    receive(lines: string | readonly string[]) {
      const batch = Array.isArray(lines) ? lines : [lines]
      for (const line of batch) {
        // A real socket in binary mode delivers bytes, so the mock does too.
        stream.emit('data', Buffer.from(`${line}\r\n`, 'utf-8'))
      }
    },

    sentLines,

    stream,
  }
}
