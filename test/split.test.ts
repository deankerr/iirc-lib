import { describe, expect, test } from 'bun:test'

import { splitText } from '../src/client/split'

describe('splitText', () => {
  test('returns single chunk when text fits', () => {
    expect(splitText('hello', 10)).toEqual(['hello'])
  })

  test('returns original string when exactly at limit', () => {
    expect(splitText('hello', 5)).toEqual(['hello'])
  })

  test('splits ASCII text at byte boundary', () => {
    expect(splitText('abcdef', 3)).toEqual(['abc', 'def'])
  })

  test('splits with uneven chunks', () => {
    expect(splitText('abcdefg', 3)).toEqual(['abc', 'def', 'g'])
  })

  test('does not split 2-byte UTF-8 character', () => {
    // "aé" = [0x61, 0xC3, 0xA9] = 3 bytes
    // maxBytes=2: can't fit "aé", splits to ["a", "é"]
    expect(splitText('aé', 2)).toEqual(['a', 'é'])
  })

  test('does not split 3-byte UTF-8 character', () => {
    // "a中b" = [0x61, 0xE4, 0xB8, 0xAD, 0x62] = 5 bytes
    // maxBytes=3: fits "a" (1) but not "a中" (4), then "中" (3) fits, then "b" (1)
    expect(splitText('a中b', 3)).toEqual(['a', '中', 'b'])
  })

  test('does not split 4-byte UTF-8 character (emoji)', () => {
    // "a😀b" = [0x61, 0xF0, 0x9F, 0x98, 0x80, 0x62] = 6 bytes
    // maxBytes=3: "a" (1), then emoji doesn't fit in 3 bytes
    // but emoji is 4 bytes > maxBytes, so edge case kicks in and includes it
    const result = splitText('a😀b', 3)
    expect(result[0]).toBe('a')
    expect(result).toContain('😀')
    expect(result.at(-1)).toBe('b')
  })

  test('handles emoji larger than maxBytes', () => {
    // Single emoji = 4 bytes, maxBytes = 2
    // Edge case: character larger than limit, include it anyway
    expect(splitText('😀', 2)).toEqual(['😀'])
  })

  test('handles consecutive multi-byte characters', () => {
    // "ééé" = 6 bytes (2 each), maxBytes=4
    expect(splitText('ééé', 4)).toEqual(['éé', 'é'])
  })

  test('handles empty string', () => {
    expect(splitText('', 10)).toEqual([''])
  })

  test('handles single ASCII character', () => {
    expect(splitText('a', 1)).toEqual(['a'])
  })

  test('realistic IRC message split', () => {
    // 450 bytes of text, split at 200
    const text = 'a'.repeat(450)
    const chunks = splitText(text, 200)
    expect(chunks).toHaveLength(3)
    expect(chunks[0]).toHaveLength(200)
    expect(chunks[1]).toHaveLength(200)
    expect(chunks[2]).toHaveLength(50)
  })

  test('mixed ASCII and multi-byte near boundary', () => {
    // "aaé" = [0x61, 0x61, 0xC3, 0xA9] = 4 bytes
    // maxBytes=3: "aa" fits (2), adding "é" would be 4 > 3
    expect(splitText('aaé', 3)).toEqual(['aa', 'é'])
  })
})

describe('splitText word boundaries', () => {
  test('splits at last space within byte limit', () => {
    // "hello world" = 11 bytes, maxBytes=8
    // Safe end at byte 8 = "hello wo", last space at 5
    expect(splitText('hello world', 8)).toEqual(['hello', 'world'])
  })

  test('falls back to char boundary when no spaces', () => {
    expect(splitText('abcdefghij', 5)).toEqual(['abcde', 'fghij'])
  })

  test('single word longer than limit splits at char boundary', () => {
    expect(splitText('abcdefgh rest', 5)).toEqual(['abcde', 'fgh', 'rest'])
  })

  test('space is consumed, not left dangling', () => {
    const result = splitText('aaa bbb', 4)
    expect(result).toEqual(['aaa', 'bbb'])
    // No leading or trailing spaces
    for (const chunk of result) {
      expect(chunk).not.toStartWith(' ')
      expect(chunk).not.toEndWith(' ')
    }
  })

  test('multiple spaces — splits at last one within limit', () => {
    // "aa bb cc" = 8 bytes, maxBytes=6
    // Safe end at 6 = "aa bb ", last space at 5
    expect(splitText('aa bb cc', 6)).toEqual(['aa bb', 'cc'])
  })

  test('UTF-8 + spaces: prefers word boundary', () => {
    // "café latte" = [63 61 66 c3a9 20 6c 61 74 74 65] = 11 bytes
    // maxBytes=7: safe end at 7, backs up past continuation → stays at 7
    // bytes 0-6 = "café l", last space at byte 5
    expect(splitText('café latte', 7)).toEqual(['café', 'latte'])
  })

  test('space at exact boundary', () => {
    // "abc def" = 7 bytes, maxBytes=4
    // Safe end at 4 = "abc ", space at 3
    expect(splitText('abc def', 4)).toEqual(['abc', 'def'])
  })

  test('preserves all content across splits', () => {
    const text = 'the quick brown fox jumps over the lazy dog'
    const chunks = splitText(text, 15)
    // Rejoin with spaces (since spaces are consumed at split points)
    const reassembled = chunks.join(' ')
    expect(reassembled).toBe(text)
  })

  test('many short words', () => {
    // "a b c d e f" = 11 bytes, maxBytes=4
    const result = splitText('a b c d e f', 4)
    // Should group words that fit: "a b" (3), "c d" (3), "e f" (3)
    expect(result).toEqual(['a b', 'c d', 'e f'])
  })
})
