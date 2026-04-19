import { describe, expect, test } from 'bun:test'

import { createMockTransport } from './mock-transport'
import { createRuntime } from './runtime'

describe('Runtime', () => {
  test('emits canonical parsed messages', () => {
    const transport = createMockTransport()
    const runtime = createRuntime(
      {
        nick: 'bot',
        sendDelayMs: 0,
      },
      transport.stream,
    )

    runtime.register()

    const commands: string[] = []
    runtime.on('message', (message) => {
      commands.push(message.command)
    })

    transport.receive(':server NOTICE * :hello')

    expect(commands).toEqual(['NOTICE'])
  })

  test('tracks identity and emits registered on 001', () => {
    const transport = createMockTransport()
    const runtime = createRuntime(
      {
        nick: 'bot',
        sendDelayMs: 0,
      },
      transport.stream,
    )

    runtime.register()

    let registered = false
    runtime.on('registered', () => {
      registered = true
    })

    transport.receive(':irc.example.com 001 actualbot :Welcome')

    expect(registered).toBe(true)
    expect(runtime.connectionState.registered).toBe(true)
    expect(runtime.connectionState.serverHost).toBe('irc.example.com')
  })

  test('reads self user and host from welcome text when present', () => {
    const transport = createMockTransport()
    const runtime = createRuntime(
      {
        nick: 'bot',
        sendDelayMs: 0,
      },
      transport.stream,
    )

    runtime.register()

    transport.receive(
      ':irc.example.com 001 actualbot :Welcome to the network actualbot!~user@cloak.example',
    )

    expect(runtime.connectionState.nick).toBe('actualbot')
    expect(runtime.connectionState.user).toBe('~user')
    expect(runtime.connectionState.host).toBe('cloak.example')
  })

  test('responds to server PING with PONG during registration', () => {
    const transport = createMockTransport()
    const runtime = createRuntime(
      {
        nick: 'bot',
        sendDelayMs: 0,
      },
      transport.stream,
    )

    runtime.register()

    transport.sentLines.length = 0

    transport.receive('PING :token123')

    expect(transport.sentLines).toEqual(['PONG token123'])
  })

  test('stores ISUPPORT tokens from 005', () => {
    const transport = createMockTransport()
    const runtime = createRuntime(
      {
        nick: 'bot',
        sendDelayMs: 0,
      },
      transport.stream,
    )

    runtime.register()

    transport.receive(
      ':server 005 bot CASEMAPPING=ascii CHANTYPES=#& NETWORK=ExampleNet :are supported',
    )

    expect(runtime.isupport.get('CASEMAPPING')).toBe('ascii')
    expect(runtime.isupport.get('CHANTYPES')).toBe('#&')
    expect(runtime.isupport.get('NETWORK')).toBe('ExampleNet')
  })

  test('runtime case folds defaults to rfc1459 per spec', () => {
    const transport = createMockTransport()
    const runtime = createRuntime(
      {
        nick: 'bot',
        sendDelayMs: 0,
      },
      transport.stream,
    )

    runtime.register()

    // Before ISUPPORT, defaults to rfc1459 per modern IRC docs.
    expect(runtime.caseFold('[Foo]')).toBe('{foo}')
    expect(runtime.caseFold('~Foo\\Bar')).toBe('^foo|bar')
  })

  test('runtime case folds with server-advertised CASEMAPPING', () => {
    const transport = createMockTransport()
    const runtime = createRuntime(
      {
        nick: 'bot',
        sendDelayMs: 0,
      },
      transport.stream,
    )

    runtime.register()

    transport.receive(':server 005 bot CASEMAPPING=rfc1459 :are supported')

    expect(runtime.caseFold('[Foo]')).toBe('{foo}')
    expect(runtime.caseFold('~Foo\\Bar')).toBe('^foo|bar')
  })

  test('runtime case folds with rfc1459-strict', () => {
    const transport = createMockTransport()
    const runtime = createRuntime(
      {
        nick: 'bot',
        sendDelayMs: 0,
      },
      transport.stream,
    )

    runtime.register()

    transport.receive(':server 005 bot CASEMAPPING=rfc1459-strict :are supported')

    // rfc1459-strict folds [ ] \ but NOT ~ to ^
    expect(runtime.caseFold('[Foo]')).toBe('{foo}')
    expect(runtime.caseFold('~Foo\\Bar')).toBe('~foo|bar')
  })

  test('runtime case folds with ascii', () => {
    const transport = createMockTransport()
    const runtime = createRuntime(
      {
        nick: 'bot',
        sendDelayMs: 0,
      },
      transport.stream,
    )

    runtime.register()

    transport.receive(':server 005 bot CASEMAPPING=ascii :are supported')

    expect(runtime.caseFold('[Foo]')).toBe('[foo]')
    expect(runtime.caseFold('~Foo\\Bar')).toBe('~foo\\bar')
  })

  test('send writes raw outbound commands without extra policy', () => {
    const transport = createMockTransport()
    const runtime = createRuntime(
      {
        nick: 'bot',
        sendDelayMs: 0,
      },
      transport.stream,
    )

    runtime.register()

    transport.sentLines.length = 0

    runtime.send('PRIVMSG', '#dev', 'hello world')

    expect(transport.sentLines).toEqual(['PRIVMSG #dev :hello world'])
  })
})
