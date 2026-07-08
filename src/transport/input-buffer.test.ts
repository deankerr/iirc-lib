import { describe, expect, test } from 'bun:test'

import { InputBuffer } from './input-buffer'

// 8703 per the buffer's protocol limit; anything longer must trip the guard.
const OVERSIZED = 'x'.repeat(9000)

// The unbounded-growth regression is about internal state, so these tests
// peek at the private buffer to assert discarding actually happens.
function bufferContents(buffer: InputBuffer): string {
  // oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
  return (buffer as unknown as { buffer: string }).buffer
}

describe('InputBuffer', () => {
  test('splits complete lines and strips CR', () => {
    const buffer = new InputBuffer()
    expect(buffer.push('PING :a\r\nPING :b\n').lines).toEqual(['PING :a', 'PING :b'])
  })

  test('holds a partial line until its newline arrives', () => {
    const buffer = new InputBuffer()
    expect(buffer.push('PING :to').lines).toEqual([])
    expect(buffer.push('ken\r\n').lines).toEqual(['PING :token'])
  })

  test('reports an oversized partial line once and discards it', () => {
    const buffer = new InputBuffer()
    const result = buffer.push(OVERSIZED)

    expect(result.lines).toEqual([])
    expect(result.overflowExcerpt).toBe('x'.repeat(100))
    expect(bufferContents(buffer)).toBe('')
  })

  test('discards further chunks while skipping instead of accumulating them', () => {
    const buffer = new InputBuffer()
    buffer.push(OVERSIZED)

    // Still no newline: the oversized line continues. Nothing may buffer up,
    // and the overflow must not be re-reported.
    const result = buffer.push(OVERSIZED)
    expect(result.lines).toEqual([])
    expect(result.overflowExcerpt).toBeUndefined()
    expect(bufferContents(buffer)).toBe('')
  })

  test('resumes normal parsing after the oversized line terminates', () => {
    const buffer = new InputBuffer()
    buffer.push(OVERSIZED)
    buffer.push(OVERSIZED)

    const result = buffer.push('tail-of-junk\r\nPING :alive\r\n')
    expect(result.lines).toEqual(['PING :alive'])
    expect(result.overflowExcerpt).toBeUndefined()
  })

  test('an oversized line delivered with its newline in one chunk still parses', () => {
    // The guard only applies to unterminated partials; a complete line is
    // recorded as the server sent it, however long.
    const buffer = new InputBuffer()
    const result = buffer.push(`${OVERSIZED}\r\nPING :next\r\n`)
    expect(result.lines).toEqual([OVERSIZED, 'PING :next'])
  })

  test('clear() resets skipping state', () => {
    const buffer = new InputBuffer()
    buffer.push(OVERSIZED)
    buffer.clear()

    expect(buffer.push('PING :fresh\r\n').lines).toEqual(['PING :fresh'])
  })
})
