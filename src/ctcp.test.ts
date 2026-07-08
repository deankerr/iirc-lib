import { describe, expect, test } from 'bun:test'

import { parseCtcp } from './ctcp'

// 0x01 delimiter built here rather than written literally, so this source
// stays plain text (a raw 0x01 byte makes tools treat the file as binary).
const D = String.fromCodePoint(1)

describe('parseCtcp', () => {
  test('parses an ACTION with command and arguments', () => {
    expect(parseCtcp(`${D}ACTION waves${D}`)).toEqual({ arguments: 'waves', command: 'ACTION' })
  })

  test('accepts a message with no closing delimiter', () => {
    // The trailing 0x01 is optional per the CTCP spec.
    expect(parseCtcp(`${D}ACTION waves`)).toEqual({ arguments: 'waves', command: 'ACTION' })
  })

  test('parses a command with no arguments', () => {
    expect(parseCtcp(`${D}VERSION${D}`)).toEqual({ arguments: '', command: 'VERSION' })
  })

  test('preserves multi-space arguments verbatim', () => {
    expect(parseCtcp(`${D}ACTION does  a  thing${D}`)).toEqual({
      arguments: 'does  a  thing',
      command: 'ACTION',
    })
  })

  test('returns undefined for ordinary text', () => {
    expect(parseCtcp('just a normal message')).toBeUndefined()
  })

  test('returns undefined when the opening delimiter is missing', () => {
    // A stray trailing delimiter alone is not a CTCP message.
    expect(parseCtcp(`ACTION waves${D}`)).toBeUndefined()
  })
})
