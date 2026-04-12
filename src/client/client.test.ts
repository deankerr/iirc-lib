import { describe, expect, test } from 'bun:test'

import { Client } from '../index'
import { createMockTransport } from '../mock-transport'
import {
  CAPABILITIES_STATE_KEY,
  CONNECTION_STATE_KEY,
  ISUPPORT_STATE_KEY,
  SASL_STATE_KEY,
  type CapabilityState,
  type ConnectionState,
  type IsupportValue,
  type SaslState,
} from '../runtime/features/state'
import { Numeric } from '../runtime/numerics'

describe('Client', () => {
  test('starts registration commands immediately on attach', () => {
    const transport = createMockTransport()
    const client = new Client({
      nick: 'bot',
      user: 'bot',
      realname: 'Bot',
      password: 'secret',
    })

    client.attach(transport.stream)

    expect(client.runtime.status).toBe('registering')
    expect(transport.sentLines).toEqual([
      'CAP LS 302',
      'PASS secret',
      'NICK bot',
      'USER bot 0 * :Bot',
    ])
  })

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

    const state = client.runtime.getState<ConnectionState>(CONNECTION_STATE_KEY)
    expect(registered).toBe(true)
    expect(client.runtime.status).toBe('registered')
    expect(state?.nick).toBe('actualbot')
    expect(state?.registered).toBe(true)
    expect(state?.serverHost).toBe('irc.example.com')
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

  test('handles nickname collisions before registration completes', () => {
    const transport = createMockTransport()
    const client = new Client({
      nick: 'bot',
      user: 'bot',
      realname: 'Bot',
    })

    client.attach(transport.stream)
    transport.sentLines.length = 0

    transport.receive(`:server ${Numeric.ERR_NICKNAMEINUSE} * bot :Nickname is already in use`)

    const state = client.runtime.getState<ConnectionState>(CONNECTION_STATE_KEY)
    expect(state?.attemptedNick).toBe('bot2')
    expect(transport.sentLines).toEqual(['NICK bot2'])
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

    const isupport = client.runtime.getState<ReadonlyMap<string, IsupportValue>>(ISUPPORT_STATE_KEY)
    expect(isupport?.get('CASEMAPPING')).toBe('ascii')
    expect(isupport?.get('CHANTYPES')).toBe('#&')
    expect(isupport?.get('NETWORK')).toBe('ExampleNet')
  })

  test('negotiates capabilities and ends CAP when no auth is needed', () => {
    const transport = createMockTransport()
    const client = new Client({
      nick: 'bot',
      user: 'bot',
      realname: 'Bot',
    })

    client.attach(transport.stream)
    transport.sentLines.length = 0

    transport.receive(':server CAP * LS :multi-prefix extended-join userhost-in-names batch')
    expect(transport.sentLines).toEqual(['CAP REQ :extended-join multi-prefix userhost-in-names'])

    transport.sentLines.length = 0
    transport.receive(':server CAP * ACK :extended-join multi-prefix userhost-in-names')

    const capabilities = client.runtime.getState<CapabilityState>(CAPABILITIES_STATE_KEY)
    expect(capabilities?.enabled.has('extended-join')).toBe(true)
    expect(capabilities?.enabled.has('multi-prefix')).toBe(true)
    expect(capabilities?.endSent).toBe(true)
    expect(transport.sentLines).toEqual(['CAP END'])
  })

  test('performs SASL PLAIN after CAP ACK and finishes negotiation on success', () => {
    const transport = createMockTransport()
    const client = new Client({
      nick: 'bot',
      user: 'bot',
      realname: 'Bot',
      sasl: {
        username: 'bot',
        password: 'hunter2',
      },
    })

    client.attach(transport.stream)
    transport.sentLines.length = 0

    transport.receive(':server CAP * LS :sasl=PLAIN,EXTERNAL server-time')
    expect(transport.sentLines).toEqual(['CAP REQ :server-time sasl'])

    transport.sentLines.length = 0
    transport.receive(':server CAP * ACK :server-time sasl')
    expect(transport.sentLines).toEqual(['AUTHENTICATE PLAIN'])

    transport.sentLines.length = 0
    transport.receive('AUTHENTICATE +')
    expect(transport.sentLines).toEqual(['AUTHENTICATE AGJvdABodW50ZXIy'])

    transport.sentLines.length = 0
    transport.receive(`:server ${Numeric.RPL_SASLSUCCESS} bot :SASL authentication successful`)

    const sasl = client.runtime.getState<SaslState>(SASL_STATE_KEY)
    expect(sasl?.successful).toBe(true)
    expect(sasl?.completed).toBe(true)
    expect(transport.sentLines).toEqual(['CAP END'])
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
