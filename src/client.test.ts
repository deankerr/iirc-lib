import { describe, expect, test } from 'bun:test'

import { Client } from './client'
import { createMockTransport } from './mock-transport'

describe('Client', () => {
  test('emits canonical parsed messages', () => {
    const transport = createMockTransport()
    const client = new Client({
      nick: 'bot',
      user: 'bot',
      realname: 'Bot',
    })

    const commands: string[] = []
    client.on('message', (message) => {
      commands.push(message.command)
    })

    client.attach(transport.stream)
    transport.receive(':server NOTICE * :hello')

    expect(commands).toEqual(['NOTICE'])
  })

  test('tracks identity and emits registered on 001', () => {
    const transport = createMockTransport()
    const client = new Client({
      nick: 'bot',
      user: 'bot',
      realname: 'Bot',
    })

    let registered = false
    client.on('registered', () => {
      registered = true
    })

    client.attach(transport.stream)
    transport.receive(':irc.example.com 001 actualbot :Welcome')

    expect(registered).toBe(true)
    expect(client.runtime.status).toBe('registered')
    expect(client.runtime.connectionState.nick).toBe('actualbot')
    expect(client.runtime.connectionState.registered).toBe(true)
    expect(client.runtime.connectionState.serverHost).toBe('irc.example.com')
  })

  test('reads self user and host from welcome text when present', () => {
    const transport = createMockTransport()
    const client = new Client({
      nick: 'bot',
      user: 'bot',
      realname: 'Bot',
    })

    client.attach(transport.stream)
    transport.receive(
      ':irc.example.com 001 actualbot :Welcome to the network actualbot!~user@cloak.example',
    )

    expect(client.runtime.connectionState.nick).toBe('actualbot')
    expect(client.runtime.connectionState.user).toBe('~user')
    expect(client.runtime.connectionState.host).toBe('cloak.example')
  })

  test('responds to server PING with PONG during registration', () => {
    const transport = createMockTransport()
    const client = new Client({
      nick: 'bot',
      user: 'bot',
      realname: 'Bot',
    })

    client.attach(transport.stream)
    transport.sentLines.length = 0

    transport.receive('PING :token123')

    expect(transport.sentLines).toEqual(['PONG token123'])
  })

  test('stores ISUPPORT tokens from 005', () => {
    const transport = createMockTransport()
    const client = new Client({
      nick: 'bot',
      user: 'bot',
      realname: 'Bot',
    })

    client.attach(transport.stream)
    transport.receive(
      ':server 005 bot CASEMAPPING=ascii CHANTYPES=#& NETWORK=ExampleNet :are supported',
    )

    expect(client.runtime.isupport.get('CASEMAPPING')).toBe('ascii')
    expect(client.runtime.isupport.get('CHANTYPES')).toBe('#&')
    expect(client.runtime.isupport.get('NETWORK')).toBe('ExampleNet')
  })

  test('runtime case folds with active server CASEMAPPING', () => {
    const transport = createMockTransport()
    const client = new Client({
      nick: 'bot',
      user: 'bot',
      realname: 'Bot',
    })

    client.attach(transport.stream)

    expect(client.runtime.caseFold('[Foo]')).toBe('[foo]')

    transport.receive(':server 005 bot CASEMAPPING=rfc1459 :are supported')

    expect(client.runtime.caseFold('[Foo]')).toBe('{foo}')
    expect(client.runtime.caseFold('~Foo\\Bar')).toBe('^foo|bar')
  })

  test('send writes raw outbound commands without extra policy', () => {
    const transport = createMockTransport()
    const client = new Client({
      nick: 'bot',
      user: 'bot',
      realname: 'Bot',
    })

    client.attach(transport.stream)
    transport.sentLines.length = 0

    client.send('PRIVMSG', '#dev', 'hello world')

    expect(transport.sentLines).toEqual(['PRIVMSG #dev :hello world'])
  })
})
