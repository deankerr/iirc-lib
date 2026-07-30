import { describe, expect, test } from 'bun:test'
import { PassThrough } from 'node:stream'

import { createMockTransport } from '../mock-transport'
import { Transport } from './transport'
import type { IrcMessage } from './types'

const OVERSIZED = 'x'.repeat(9000)

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

  // Claim 0: the consumer owns the stream, so the binary precondition is
  // verified once, at the boundary.
  test('rejects a stream with an encoding set at construction', () => {
    const stream = new PassThrough()
    stream.setEncoding('utf-8')

    expect(() => new Transport(stream, { sendDelayMs: 0 })).toThrow(/binary stream/u)
  })

  test('rejects an objectMode stream at construction', () => {
    const stream = new PassThrough({ objectMode: true })

    expect(() => new Transport(stream, { sendDelayMs: 0 })).toThrow(/binary stream/u)
  })

  test('treats a string chunk as a terminal error', () => {
    const mock = createMockTransport()
    const transport = new Transport(mock.stream, { sendDelayMs: 0 })
    const errors: Error[] = []

    transport.on('error', (error) => {
      errors.push(error)
    })

    // The consumer set an encoding after construction: the byte contract is
    // broken, and error states are terminals.
    mock.stream.emit('data', 'PING :decoded\r\n')

    expect(errors).toHaveLength(1)
    expect(transport.ok).toBe(false)
  })

  test('ignores chunks that arrive after the session is terminal', () => {
    const mock = createMockTransport()
    const transport = new Transport(mock.stream, { sendDelayMs: 0 })
    const reads: string[] = []

    transport.on('read', (line) => {
      reads.push(line)
    })

    mock.close()
    mock.receive('PING :late')

    expect(reads).toEqual([])
  })

  test('decodes a complete inbound line as UTF-8', () => {
    const mock = createMockTransport()
    const transport = new Transport(mock.stream, { sendDelayMs: 0 })
    let message: IrcMessage | undefined

    transport.on('message', (received) => {
      message = received
    })

    mock.stream.emit('data', Buffer.from(':server PRIVMSG me :Olá\r\n', 'utf-8'))

    expect(message?.params).toEqual(['me', 'Olá'])
  })

  test('waits for a complete line before decoding a split UTF-8 sequence', () => {
    const mock = createMockTransport()
    const transport = new Transport(mock.stream, { sendDelayMs: 0 })
    let message: IrcMessage | undefined

    transport.on('message', (received) => {
      message = received
    })

    const bytes = Buffer.from(':server PRIVMSG me :Olá\r\n', 'utf-8')
    const splitAt = bytes.indexOf(0xc3) + 1
    mock.stream.emit('data', bytes.subarray(0, splitAt))
    mock.stream.emit('data', bytes.subarray(splitAt))

    expect(message?.params).toEqual(['me', 'Olá'])
  })

  test('uses ordinary UTF-8 replacement for invalid input', () => {
    const mock = createMockTransport()
    const transport = new Transport(mock.stream, { sendDelayMs: 0 })
    const reads: string[] = []
    let message: IrcMessage | undefined

    transport.on('message', (received) => {
      message = received
    })
    transport.on('read', (line) => {
      reads.push(line)
    })

    const bytes = Buffer.concat([
      Buffer.from(':server PRIVMSG me :Ol', 'ascii'),
      Buffer.from([0xe1]),
      Buffer.from('\r\n', 'ascii'),
    ])
    mock.stream.emit('data', bytes)

    expect(reads).toEqual([':server PRIVMSG me :Ol�'])
    expect(message?.params).toEqual(['me', 'Ol�'])
  })

  test('emits oversized-line errors in wire order without collapsing them', () => {
    const mock = createMockTransport()
    const transport = new Transport(mock.stream, { sendDelayMs: 0 })
    const events: string[] = []

    transport.on('parse_error', (_error, line) => {
      events.push(`error:${line.slice(0, 1)}`)
    })
    transport.on('read', (line) => {
      events.push(`read:${line}`)
    })

    mock.stream.emit(
      'data',
      Buffer.from(
        `PING :before\r\n${OVERSIZED}\r\n${OVERSIZED.replaceAll('x', 'y')}\r\nPING :after\r\n`,
        'utf-8',
      ),
    )

    expect(events).toEqual(['read:PING :before', 'error:x', 'error:y', 'read:PING :after'])
  })

  // Decoding happens above framing, so a read must also carry the bytes it
  // came from: they are the only record of what the server really sent.
  test('emits the framed bytes alongside the decoded line', () => {
    const mock = createMockTransport()
    const transport = new Transport(mock.stream, { sendDelayMs: 0 })
    let frame: Uint8Array | undefined

    transport.on('read', (_line, bytes) => {
      frame = bytes
    })

    const invalid = Buffer.concat([
      Buffer.from(':server PRIVMSG me :Ol', 'ascii'),
      Buffer.from([0xe1]),
      Buffer.from('\r\n', 'ascii'),
    ])
    mock.stream.emit('data', invalid)

    // The replacement character in the decoded line is not reversible; the
    // original byte is only recoverable from the frame.
    expect(frame?.at(-1)).toBe(0xe1)
    expect(frame?.byteLength).toBe(invalid.byteLength - 2)
  })

  test('emits the framed bytes alongside a parse error', () => {
    const mock = createMockTransport()
    const transport = new Transport(mock.stream, { sendDelayMs: 0 })
    let frame: Uint8Array | undefined

    transport.on('parse_error', (_line, _error, bytes) => {
      frame = bytes
    })

    mock.receive(':server')

    expect(frame && Buffer.from(frame).toString('utf-8')).toBe(':server')
  })

  // Sends carry bytes for the same reason reads do. The delimiter is part of
  // them, so the length an observer records is the length that was sent.
  test('emits the encoded bytes alongside the written line', () => {
    const mock = createMockTransport()
    const transport = new Transport(mock.stream, { sendDelayMs: 0 })
    let written: { bytes: Uint8Array; line: string } | undefined

    transport.on('write', (line, bytes) => {
      written = { bytes, line }
    })

    transport.send({ command: 'PRIVMSG', params: ['#demo', 'héllo there'] })

    expect(written?.line).toBe('PRIVMSG #demo :héllo there')
    expect(Buffer.from(written?.bytes ?? []).toString('utf-8')).toBe(
      'PRIVMSG #demo :héllo there\r\n',
    )
    // 'é' is two bytes: a consumer counting characters would miss the limit.
    expect(written?.bytes.byteLength).toBe(written === undefined ? -1 : written.line.length + 3)
  })

  // An emitted frame is a copy the transport does not keep, so a consumer may
  // hold it. Reusing one chunk buffer for later data must not rewrite it.
  test('emitted bytes do not alias the stream chunk', () => {
    const mock = createMockTransport()
    const transport = new Transport(mock.stream, { sendDelayMs: 0 })
    const frames: Uint8Array[] = []

    transport.on('read', (_line, bytes) => {
      frames.push(bytes)
    })

    const chunk = Buffer.from('PING :a\r\n')
    mock.stream.emit('data', chunk)
    chunk.fill(0x58)
    mock.stream.emit('data', Buffer.from('PING :b\r\n'))

    expect(frames.map((bytes) => Buffer.from(bytes).toString('utf-8'))).toEqual([
      'PING :a',
      'PING :b',
    ])
  })

  // A queued line that never reached the stream is not a sent command.
  test('reports queued lines that the terminal session dropped', () => {
    const mock = createMockTransport()
    const transport = new Transport(mock.stream, { sendDelayMs: 50 })
    let dropped: string[] | undefined

    transport.on('discard', (lines) => {
      dropped = lines
    })

    transport.send({ command: 'PING', params: ['first'] })
    transport.send({ command: 'PING', params: ['second'] })
    transport.send({ command: 'QUIT', params: ['so long'] })
    mock.close()

    expect(mock.sentLines).toEqual(['PING first'])
    expect(dropped).toEqual(['PING second', 'QUIT :so long'])
  })

  test('emits nothing for empty lines', () => {
    const mock = createMockTransport()
    const transport = new Transport(mock.stream, { sendDelayMs: 0 })
    const reads: string[] = []

    transport.on('read', (line) => {
      reads.push(line)
    })

    mock.stream.emit('data', Buffer.from('\r\n\r\nPING :a\r\n\r\n', 'utf-8'))

    expect(reads).toEqual(['PING :a'])
  })
})
