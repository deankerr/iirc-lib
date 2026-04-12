import { describe, expect, test } from 'bun:test'

import { casemapping } from '../src/client/protocol/casemapping'
import { createIsupport } from '../src/client/protocol/isupport'

describe('isupport.apply', () => {
  test('parses key=value tokens', () => {
    const isupport = createIsupport()
    isupport.apply(['NETWORK=Libera.Chat', 'NICKLEN=30'])

    expect(isupport.get('NETWORK')).toBe('Libera.Chat')
    expect(isupport.get('NICKLEN')).toBe('30')
  })

  test('parses boolean tokens', () => {
    const isupport = createIsupport()
    isupport.apply(['SAFELIST', 'WHOX'])

    expect(isupport.get('SAFELIST')).toBe(true)
    expect(isupport.get('WHOX')).toBe(true)
  })

  test('handles EXCEPTS default value', () => {
    const isupport = createIsupport()
    isupport.apply(['EXCEPTS'])

    expect(isupport.get('EXCEPTS')).toBe('e')
  })

  test('handles INVEX default value', () => {
    const isupport = createIsupport()
    isupport.apply(['INVEX'])

    expect(isupport.get('INVEX')).toBe('I')
  })

  test('handles negation with -TOKEN', () => {
    const isupport = createIsupport()
    isupport.apply(['NETWORK=TestNet', 'WHOX'])
    isupport.apply(['-NETWORK', '-WHOX'])

    expect(isupport.get('NETWORK')).toBeUndefined()
    expect(isupport.get('WHOX')).toBeUndefined()
  })

  test('decodes escaped values', () => {
    const isupport = createIsupport()
    isupport.apply(['NETWORK=Test\\x20Network'])

    expect(isupport.get('NETWORK')).toBe('Test Network')
  })

  test('uppercases keys', () => {
    const isupport = createIsupport()
    isupport.apply(['network=Test'])

    expect(isupport.get('NETWORK')).toBe('Test')
    expect(isupport.get('network')).toBe('Test')
  })
})

describe('isupport.has', () => {
  test('returns true for existing keys', () => {
    const isupport = createIsupport()
    isupport.apply(['WHOX'])

    expect(isupport.has('WHOX')).toBe(true)
  })

  test('returns false for missing keys', () => {
    const isupport = createIsupport()

    expect(isupport.has('WHOX')).toBe(false)
  })
})

describe('isupport.casemapper', () => {
  test('returns rfc1459 by default', () => {
    const isupport = createIsupport()

    expect(isupport.casemapper).toBe(casemapping.rfc1459)
  })

  test('returns ascii when CASEMAPPING=ascii', () => {
    const isupport = createIsupport()
    isupport.apply(['CASEMAPPING=ascii'])

    expect(isupport.casemapper).toBe(casemapping.ascii)
  })

  test('returns rfc1459-strict when set', () => {
    const isupport = createIsupport()
    isupport.apply(['CASEMAPPING=rfc1459-strict'])

    expect(isupport.casemapper).toBe(casemapping['rfc1459-strict'])
  })
})

describe('isupport.chantypes', () => {
  test('returns #& by default', () => {
    const isupport = createIsupport()

    expect(isupport.chantypes).toBe('#&')
  })

  test('returns value when set', () => {
    const isupport = createIsupport()
    isupport.apply(['CHANTYPES=#'])

    expect(isupport.chantypes).toBe('#')
  })

  test('returns empty string when set empty', () => {
    const isupport = createIsupport()
    isupport.apply(['CHANTYPES='])

    expect(isupport.chantypes).toBe('')
  })
})

describe('isupport.network', () => {
  test('returns undefined by default', () => {
    const isupport = createIsupport()

    expect(isupport.network).toBeUndefined()
  })

  test('returns value when set', () => {
    const isupport = createIsupport()
    isupport.apply(['NETWORK=Libera.Chat'])

    expect(isupport.network).toBe('Libera.Chat')
  })
})

describe('isupport.prefix', () => {
  test('returns (ov)@+ by default', () => {
    const isupport = createIsupport()

    expect(isupport.prefix).toEqual({ modes: 'ov', prefixes: '@+' })
  })

  test('parses PREFIX=(ohv)@%+', () => {
    const isupport = createIsupport()
    isupport.apply(['PREFIX=(ohv)@%+'])

    expect(isupport.prefix).toEqual({ modes: 'ohv', prefixes: '@%+' })
  })

  test('parses PREFIX=(qaohv)~&@%+', () => {
    const isupport = createIsupport()
    isupport.apply(['PREFIX=(qaohv)~&@%+'])

    expect(isupport.prefix).toEqual({ modes: 'qaohv', prefixes: '~&@%+' })
  })

  test('returns default for malformed PREFIX', () => {
    const isupport = createIsupport()
    isupport.apply(['PREFIX=broken'])

    expect(isupport.prefix).toEqual({ modes: 'ov', prefixes: '@+' })
  })
})
