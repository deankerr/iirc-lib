import { describe, expect, test } from 'bun:test'

import { createMockTransport } from './mock-transport'
import { createRuntime } from './runtime'

describe('Runtime', () => {
  test('emits parsed messages as events', () => {
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
    runtime.on('event', (event) => {
      commands.push(event.command)
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

  test('parseSource marks the current nick as self', () => {
    const transport = createMockTransport()
    const runtime = createRuntime(
      {
        nick: 'bot',
        sendDelayMs: 0,
      },
      transport.stream,
    )

    runtime.register()

    expect(runtime.parseSource('bot!u@h').isSelf).toBe(true)
    expect(runtime.parseSource('other!u@h').isSelf).toBe(false)
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

  test('runtime compares identifiers with active case mapping', () => {
    const transport = createMockTransport()
    const runtime = createRuntime(
      {
        nick: 'bot',
        sendDelayMs: 0,
      },
      transport.stream,
    )

    runtime.register()

    expect(runtime.sameIdentifier('[Nick]', '{nick}')).toBe(true)

    transport.receive(':server 005 bot CASEMAPPING=ascii :are supported')

    expect(runtime.sameIdentifier('[Nick]', '{nick}')).toBe(false)
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

  test('send also accepts canonical command objects', () => {
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

    runtime.send({
      command: 'USER',
      params: ['bot', '0', '*', 'Bot Person'],
    })

    expect(transport.sentLines).toEqual(['USER bot 0 * :Bot Person'])
  })
})
