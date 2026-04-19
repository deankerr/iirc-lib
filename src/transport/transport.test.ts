import { describe, expect, test } from 'bun:test'

import { createMockTransport } from '../mock-transport'
import { Transport } from './transport'

describe('Transport', () => {
  test('emits write when an encoded line is written to the stream', () => {
    const mock = createMockTransport()
    const transport = new Transport(mock.stream, { sendDelayMs: 0 })
    const writes: string[] = []

    expect(transport.ok).toBe(true)

    transport.on('write', (line) => {
      writes.push(line)
    })

    transport.send({
      command: 'PRIVMSG',
      params: ['#dev', 'hello world'],
      trailing: true,
    })

    expect(writes).toEqual(['PRIVMSG #dev :hello world'])
    expect(mock.sentLines).toEqual(['PRIVMSG #dev :hello world'])
  })

  test('ok becomes false after close', () => {
    const mock = createMockTransport()
    const transport = new Transport(mock.stream, { sendDelayMs: 0 })

    mock.close()

    expect(transport.ok).toBe(false)
  })
})
