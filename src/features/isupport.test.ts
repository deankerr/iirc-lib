import { describe, expect, test } from 'bun:test'

import { createMockTransport } from '../mock-transport'
import { createRuntime } from '../runtime'
import { IsupportMap } from './isupport'

function createClient() {
  const transport = createMockTransport()
  const runtime = createRuntime({ nick: 'testbot', sendDelayMs: 0 }, transport.stream)

  runtime.register()
  transport.sentLines.length = 0
  return { runtime, transport }
}

describe('IsupportMap', () => {
  test('named getters return spec defaults before advertisement', () => {
    const map = new IsupportMap()

    expect(map.CASEMAPPING).toBe('rfc1459')
    expect(map.CHANMODES).toBe('b,k,l,imnpst')
    expect(map.CHANTYPES).toBe('#&')
    expect(map.MODES).toBe('3')
    expect(map.PREFIX).toBe('(ov)@+')
  })

  test('named getters return advertised values', () => {
    const map = new IsupportMap()
    map.set('CASEMAPPING', 'ascii')
    map.set('CHANMODES', 'beI,kfL,lj,psmnt')
    map.set('CHANTYPES', '#')
    map.set('MODES', '4')
    map.set('PREFIX', '(ohv)@%+')

    expect(map.CASEMAPPING).toBe('ascii')
    expect(map.CHANMODES).toBe('beI,kfL,lj,psmnt')
    expect(map.CHANTYPES).toBe('#')
    expect(map.MODES).toBe('4')
    expect(map.PREFIX).toBe('(ohv)@%+')
  })

  test('named getters revert to defaults after deletion', () => {
    const map = new IsupportMap()
    map.set('CASEMAPPING', 'ascii')
    expect(map.CASEMAPPING).toBe('ascii')

    map.delete('CASEMAPPING')
    expect(map.CASEMAPPING).toBe('rfc1459')
  })

  test('named getters fall back to default when value is true (boolean flag)', () => {
    const map = new IsupportMap()
    map.set('CHANTYPES', true)

    // A boolean flag should not happen for CHANTYPES, but the fallback
    // is defensive — return the spec default rather than `true`.
    expect(map.CHANTYPES).toBe('#&')
  })

  test('arbitrary get returns undefined for unadvertised keys', () => {
    const map = new IsupportMap()

    expect(map.get('NETWORK')).toBeUndefined()
    expect(map.get('SAFELIST')).toBeUndefined()
  })
})

describe('isupport', () => {
  test('stores key=value tokens', () => {
    const { runtime, transport } = createClient()
    transport.receive(':server 005 testbot CASEMAPPING=ascii NETWORK=ExampleNet :are supported')

    expect(runtime.isupport.get('CASEMAPPING')).toBe('ascii')
    expect(runtime.isupport.get('NETWORK')).toBe('ExampleNet')
  })

  test('stores valueless tokens as true (e.g. SAFELIST)', () => {
    const { transport, runtime } = createClient()
    transport.receive(':server 005 testbot SAFELIST :are supported')

    expect(runtime.isupport.get('SAFELIST')).toBe(true)
  })

  test('deletes negated tokens', () => {
    const { transport, runtime } = createClient()
    transport.receive(':server 005 testbot SAFELIST :are supported')
    expect(runtime.isupport.get('SAFELIST')).toBe(true)

    transport.receive(':server 005 testbot -SAFELIST :are supported')
    expect(runtime.isupport.get('SAFELIST')).toBeUndefined()
  })

  test('applies empty value default for EXCEPTS (e)', () => {
    const { transport, runtime } = createClient()
    transport.receive(':server 005 testbot EXCEPTS :are supported')

    expect(runtime.isupport.get('EXCEPTS')).toBe('e')
  })

  test('applies empty value default for INVEX (I)', () => {
    const { transport, runtime } = createClient()
    transport.receive(':server 005 testbot INVEX :are supported')

    expect(runtime.isupport.get('INVEX')).toBe('I')
  })

  test('stores explicit EXCEPTS value', () => {
    const { transport, runtime } = createClient()
    transport.receive(':server 005 testbot EXCEPTS=X :are supported')

    expect(runtime.isupport.get('EXCEPTS')).toBe('X')
  })

  test('stores explicit INVEX value', () => {
    const { transport, runtime } = createClient()
    transport.receive(':server 005 testbot INVEX=J :are supported')

    expect(runtime.isupport.get('INVEX')).toBe('J')
  })

  test('handles multiple 005 lines', () => {
    const { transport, runtime } = createClient()
    transport.receive(':server 005 testbot CASEMAPPING=ascii CHANTYPES=#& :are supported')
    transport.receive(':server 005 testbot NETWORK=ExampleNet PREFIX=(ov)@+ :are supported')

    expect(runtime.isupport.get('CASEMAPPING')).toBe('ascii')
    expect(runtime.isupport.get('CHANTYPES')).toBe('#&')
    expect(runtime.isupport.get('NETWORK')).toBe('ExampleNet')
    expect(runtime.isupport.get('PREFIX')).toBe('(ov)@+')
  })

  test('overwrites previously advertised values', () => {
    const { transport, runtime } = createClient()
    transport.receive(':server 005 testbot CHANLIMIT=#:25 :are supported')
    expect(runtime.isupport.get('CHANLIMIT')).toBe('#:25')

    transport.receive(':server 005 testbot CHANLIMIT=#:50 :are supported')
    expect(runtime.isupport.get('CHANLIMIT')).toBe('#:50')
  })

  test('unescapes \\x20 to space', () => {
    const { transport, runtime } = createClient()
    transport.receive(':server 005 testbot NETWORK=Example\\x20Network :are supported')

    expect(runtime.isupport.get('NETWORK')).toBe('Example Network')
  })

  test('unescapes \\x5C to backslash', () => {
    const { transport, runtime } = createClient()
    transport.receive(':server 005 testbot NETWORK=foo\\x5Cbar :are supported')

    expect(runtime.isupport.get('NETWORK')).toBe('foo\\bar')
  })

  test('unescapes \\x3D to equals', () => {
    const { transport, runtime } = createClient()
    transport.receive(':server 005 testbot NETWORK=a\\x3Db :are supported')

    expect(runtime.isupport.get('NETWORK')).toBe('a=b')
  })

  test('leaves plain values untouched', () => {
    const { transport, runtime } = createClient()
    transport.receive(
      ':server 005 testbot CHANMODES=beI,kfL,lj,psmntirRcOAQKVCuzNSMTGZ :are supported',
    )

    expect(runtime.isupport.get('CHANMODES')).toBe('beI,kfL,lj,psmntirRcOAQKVCuzNSMTGZ')
  })

  test('keys are uppercased', () => {
    const { transport, runtime } = createClient()
    transport.receive(':server 005 testbot casemapping=ascii :are supported')

    expect(runtime.isupport.get('CASEMAPPING')).toBe('ascii')
  })
})
