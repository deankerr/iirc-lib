import { describe, expect, test } from 'bun:test'

import { Client } from '../../client'
import { createMockTransport } from '../../mock-transport'

function createClient() {
  const transport = createMockTransport()
  const client = new Client({ nick: 'testbot', sendDelayMs: 0 })
  client.attach(transport.stream)
  transport.sentLines.length = 0
  return { client, transport }
}

describe('isupport', () => {
  test('stores key=value tokens', () => {
    const { client, transport } = createClient()
    transport.receive(':server 005 testbot CASEMAPPING=ascii NETWORK=ExampleNet :are supported')

    expect(client.runtime.isupport.get('CASEMAPPING')).toBe('ascii')
    expect(client.runtime.isupport.get('NETWORK')).toBe('ExampleNet')
  })

  test('stores valueless tokens as true (e.g. SAFELIST)', () => {
    const { transport, client } = createClient()
    transport.receive(':server 005 testbot SAFELIST :are supported')

    expect(client.runtime.isupport.get('SAFELIST')).toBe(true)
  })

  test('deletes negated tokens', () => {
    const { transport, client } = createClient()
    transport.receive(':server 005 testbot SAFELIST :are supported')
    expect(client.runtime.isupport.get('SAFELIST')).toBe(true)

    transport.receive(':server 005 testbot -SAFELIST :are supported')
    expect(client.runtime.isupport.get('SAFELIST')).toBeUndefined()
  })

  test('applies empty value default for EXCEPTS (e)', () => {
    const { transport, client } = createClient()
    transport.receive(':server 005 testbot EXCEPTS :are supported')

    expect(client.runtime.isupport.get('EXCEPTS')).toBe('e')
  })

  test('applies empty value default for INVEX (I)', () => {
    const { transport, client } = createClient()
    transport.receive(':server 005 testbot INVEX :are supported')

    expect(client.runtime.isupport.get('INVEX')).toBe('I')
  })

  test('stores explicit EXCEPTS value', () => {
    const { transport, client } = createClient()
    transport.receive(':server 005 testbot EXCEPTS=X :are supported')

    expect(client.runtime.isupport.get('EXCEPTS')).toBe('X')
  })

  test('stores explicit INVEX value', () => {
    const { transport, client } = createClient()
    transport.receive(':server 005 testbot INVEX=J :are supported')

    expect(client.runtime.isupport.get('INVEX')).toBe('J')
  })

  test('handles multiple 005 lines', () => {
    const { transport, client } = createClient()
    transport.receive(':server 005 testbot CASEMAPPING=ascii CHANTYPES=#& :are supported')
    transport.receive(':server 005 testbot NETWORK=ExampleNet PREFIX=(ov)@+ :are supported')

    expect(client.runtime.isupport.get('CASEMAPPING')).toBe('ascii')
    expect(client.runtime.isupport.get('CHANTYPES')).toBe('#&')
    expect(client.runtime.isupport.get('NETWORK')).toBe('ExampleNet')
    expect(client.runtime.isupport.get('PREFIX')).toBe('(ov)@+')
  })

  test('overwrites previously advertised values', () => {
    const { transport, client } = createClient()
    transport.receive(':server 005 testbot CHANLIMIT=#:25 :are supported')
    expect(client.runtime.isupport.get('CHANLIMIT')).toBe('#:25')

    transport.receive(':server 005 testbot CHANLIMIT=#:50 :are supported')
    expect(client.runtime.isupport.get('CHANLIMIT')).toBe('#:50')
  })

  test('unescapes \\x20 to space', () => {
    const { transport, client } = createClient()
    transport.receive(':server 005 testbot NETWORK=Example\\x20Network :are supported')

    expect(client.runtime.isupport.get('NETWORK')).toBe('Example Network')
  })

  test('unescapes \\x5C to backslash', () => {
    const { transport, client } = createClient()
    transport.receive(':server 005 testbot NETWORK=foo\\x5Cbar :are supported')

    expect(client.runtime.isupport.get('NETWORK')).toBe('foo\\bar')
  })

  test('unescapes \\x3D to equals', () => {
    const { transport, client } = createClient()
    transport.receive(':server 005 testbot NETWORK=a\\x3Db :are supported')

    expect(client.runtime.isupport.get('NETWORK')).toBe('a=b')
  })

  test('leaves plain values untouched', () => {
    const { transport, client } = createClient()
    transport.receive(
      ':server 005 testbot CHANMODES=beI,kfL,lj,psmntirRcOAQKVCuzNSMTGZ :are supported',
    )

    expect(client.runtime.isupport.get('CHANMODES')).toBe('beI,kfL,lj,psmntirRcOAQKVCuzNSMTGZ')
  })

  test('keys are uppercased', () => {
    const { transport, client } = createClient()
    transport.receive(':server 005 testbot casemapping=ascii :are supported')

    expect(client.runtime.isupport.get('CASEMAPPING')).toBe('ascii')
  })
})
