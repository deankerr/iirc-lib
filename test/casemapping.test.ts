import { describe, expect, test } from 'bun:test'

import { casemapping } from '../src/client/protocol/casemapping'

describe('casemapping.ascii', () => {
  test('folds A-Z to a-z', () => {
    expect(casemapping.ascii.fold('HELLO')).toBe('hello')
    expect(casemapping.ascii.fold('Hello')).toBe('hello')
  })

  test('does not fold brackets', () => {
    expect(casemapping.ascii.fold('[Nick]')).toBe('[nick]')
    expect(casemapping.ascii.fold('{Nick}')).toBe('{nick}')
  })

  test('equal compares case-insensitively', () => {
    expect(casemapping.ascii.equal('Nick', 'nick')).toBe(true)
    expect(casemapping.ascii.equal('NICK', 'nick')).toBe(true)
  })

  test('equal treats brackets as distinct', () => {
    expect(casemapping.ascii.equal('[Nick]', '{nick}')).toBe(false)
    expect(casemapping.ascii.equal('Nick^', 'Nick~')).toBe(false)
  })
})

describe('casemapping.rfc1459', () => {
  test('folds A-Z to a-z', () => {
    expect(casemapping.rfc1459.fold('HELLO')).toBe('hello')
  })

  test('folds []^\\ to {}~|', () => {
    expect(casemapping.rfc1459.fold('[')).toBe('{')
    expect(casemapping.rfc1459.fold(']')).toBe('}')
    expect(casemapping.rfc1459.fold('^')).toBe('~')
    expect(casemapping.rfc1459.fold('\\')).toBe('|')
  })

  test('equal treats brackets as equivalent', () => {
    expect(casemapping.rfc1459.equal('[Nick]', '{nick}')).toBe(true)
    expect(casemapping.rfc1459.equal('Nick^', 'Nick~')).toBe(true)
    expect(casemapping.rfc1459.equal('Nick\\', 'Nick|')).toBe(true)
  })
})

describe('casemapping.rfc1459-strict', () => {
  test('folds [] but NOT ^', () => {
    expect(casemapping['rfc1459-strict'].fold('[')).toBe('{')
    expect(casemapping['rfc1459-strict'].fold(']')).toBe('}')
    expect(casemapping['rfc1459-strict'].fold('\\')).toBe('|')
    // ^ is NOT folded to ~ in strict mode
    expect(casemapping['rfc1459-strict'].fold('^')).toBe('^')
  })

  test('equal does not treat ^ and ~ as equivalent', () => {
    expect(casemapping['rfc1459-strict'].equal('Nick^', 'Nick~')).toBe(false)
    // But brackets still work
    expect(casemapping['rfc1459-strict'].equal('[Nick]', '{nick}')).toBe(true)
  })
})
