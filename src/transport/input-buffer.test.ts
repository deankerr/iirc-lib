import { describe, expect, test } from 'bun:test'

import { InputBuffer } from './input-buffer'
import type { InputFrame } from './input-buffer'

// Fixtures are authored as text and encoded at the edge; the framer itself
// only ever sees bytes.
const encoder = new TextEncoder()
const decoder = new TextDecoder()

function bytes(text: string): Uint8Array {
  return encoder.encode(text)
}

function lineFrame(text: string): InputFrame {
  return { bytes: bytes(text), type: 'line' }
}

function overflowFrame(text: string): InputFrame {
  return { excerpt: bytes(text), type: 'overflow' }
}

// The protocol maximum: 8701 content bytes once CRLF is stripped.
const MAX_LINE = 'x'.repeat(8701)
const OVERSIZED = 'x'.repeat(9000)

describe('InputBuffer', () => {
  // Claim 1: messages are separated by CRLF; bare LF is tolerated.
  test('splits lines on CRLF and strips the CR', () => {
    const buffer = new InputBuffer()
    expect(buffer.push(bytes('PING :a\r\nPING :b\r\n'))).toEqual([
      lineFrame('PING :a'),
      lineFrame('PING :b'),
    ])
  })

  test('tolerates a bare LF as the delimiter', () => {
    const buffer = new InputBuffer()
    expect(buffer.push(bytes('PING :a\nPING :b\n'))).toEqual([
      lineFrame('PING :a'),
      lineFrame('PING :b'),
    ])
  })

  test('keeps a CR that is not directly before the LF', () => {
    const buffer = new InputBuffer()
    expect(buffer.push(bytes('PING :a\rb\r\n'))).toEqual([lineFrame('PING :a\rb')])
  })

  // Claim 2: data buffers until the delimiter arrives.
  test('holds a partial line until its LF arrives', () => {
    const buffer = new InputBuffer()
    expect(buffer.push(bytes('PING :to'))).toEqual([])
    expect(buffer.push(bytes('ken\r\n'))).toEqual([lineFrame('PING :token')])
  })

  // Claim 3: empty messages are silently ignored.
  test('produces nothing for empty lines', () => {
    const buffer = new InputBuffer()
    expect(buffer.push(bytes('\r\n\n\r\nPING :a\r\n\r\n'))).toEqual([lineFrame('PING :a')])
  })

  // Claim 4: 8701 content bytes is the most a valid line can carry.
  test('accepts a maximum-length line', () => {
    const buffer = new InputBuffer()
    expect(buffer.push(bytes(`${MAX_LINE}\r\n`))).toEqual([lineFrame(MAX_LINE)])
  })

  test('accepts a maximum-length line split between CR and LF', () => {
    const buffer = new InputBuffer()
    expect(buffer.push(bytes(`${MAX_LINE}\r`))).toEqual([])
    expect(buffer.push(bytes('\n'))).toEqual([lineFrame(MAX_LINE)])
  })

  test('rejects a line one byte over the maximum', () => {
    const buffer = new InputBuffer()
    expect(buffer.push(bytes(`${MAX_LINE}y\r\n`))).toEqual([overflowFrame('x'.repeat(100))])
  })

  test('reports an unterminated oversized line once, then discards until its LF', () => {
    const buffer = new InputBuffer()

    expect(buffer.push(bytes(OVERSIZED))).toEqual([overflowFrame('x'.repeat(100))])

    // The line continues without an LF: nothing new may be reported.
    expect(buffer.push(bytes(OVERSIZED))).toEqual([])

    // The LF finally arrives; framing resumes with the next line.
    expect(buffer.push(bytes('tail\r\nPING :alive\r\n'))).toEqual([lineFrame('PING :alive')])
  })

  test('preserves wire order across lines and overflows', () => {
    const buffer = new InputBuffer()
    const frames = buffer.push(
      bytes(`PING :before\r\n${OVERSIZED}\r\n${'y'.repeat(9000)}\r\nPING :after\r\n`),
    )

    expect(frames).toEqual([
      lineFrame('PING :before'),
      overflowFrame('x'.repeat(100)),
      overflowFrame('y'.repeat(100)),
      lineFrame('PING :after'),
    ])
  })

  // Claim 5: framing never decodes; bytes pass through untouched.
  test('carries invalid UTF-8 bytes through unaltered', () => {
    const buffer = new InputBuffer()
    const wire = Uint8Array.from([0x50, 0x49, 0x4e, 0x47, 0x20, 0x3a, 0xff, 0x0d, 0x0a])

    expect(buffer.push(wire)).toEqual([
      { bytes: Uint8Array.from([0x50, 0x49, 0x4e, 0x47, 0x20, 0x3a, 0xff]), type: 'line' },
    ])
  })

  // The claims hold however the stream slices the bytes.
  test('produces identical frames for every chunking of the same bytes', () => {
    const wire = bytes(`PING :a\r\n${MAX_LINE}\r\n\r\n${OVERSIZED}\r\nPING :b\r\n`)

    const whole = new InputBuffer().push(wire).map(describeFrame)
    expect(whole.length).toBeGreaterThan(0)

    for (const chunkSize of [1, 7, 100, 8701, 8703]) {
      const buffer = new InputBuffer()
      const frames: InputFrame[] = []
      for (let offset = 0; offset < wire.byteLength; offset += chunkSize) {
        frames.push(...buffer.push(wire.slice(offset, offset + chunkSize)))
      }
      expect(frames.map(describeFrame)).toEqual(whole)
    }
  })

  test('clear() resets the partial buffer and the skipping state', () => {
    const buffer = new InputBuffer()
    buffer.push(bytes(OVERSIZED))
    buffer.clear()

    expect(buffer.push(bytes('PING :fresh\r\n'))).toEqual([lineFrame('PING :fresh')])
  })

  // Boundedness is an internal claim: observable frames cannot distinguish
  // discarding from silent accumulation, so this one test inspects the
  // private buffer directly.
  test('never accumulates the bytes of an unterminated oversized line', () => {
    const buffer = new InputBuffer()
    buffer.push(bytes(OVERSIZED))
    // oxlint-disable-next-line unicorn/prefer-single-call not an Array
    buffer.push(bytes(OVERSIZED))

    // oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
    const internal = (buffer as unknown as { buffer: Uint8Array }).buffer
    expect(internal.byteLength).toBe(0)
  })
})

function describeFrame(frame: InputFrame): string {
  return frame.type === 'line'
    ? `line:${decoder.decode(frame.bytes)}`
    : `overflow:${decoder.decode(frame.excerpt)}`
}
