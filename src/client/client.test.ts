import { describe, expect, test } from 'bun:test'

import { Client } from '../index'
import { createMockTransport } from '../mock-transport'

describe('Client', () => {
  test('attaches to a transport without startup features yet', () => {
    const transport = createMockTransport()
    const client = new Client()

    client.attach(transport.stream)

    expect(client.runtime.status).toBe('attached')
    expect(transport.sentLines).toEqual([])
  })

  test('emits canonical parsed messages', () => {
    const transport = createMockTransport()
    const client = new Client()

    const commands: string[] = []
    client.on('message', (message) => {
      commands.push(message.command)
    })

    client.attach(transport.stream)
    transport.receive(':server NOTICE * :hello')

    expect(commands).toEqual(['NOTICE'])
  })

  test('passes 001 through as a canonical message', () => {
    const transport = createMockTransport()
    const client = new Client()

    const commands: string[] = []
    client.on('message', (message) => {
      commands.push(message.command)
    })

    client.attach(transport.stream)
    transport.receive(':irc.example.com 001 actualbot :Welcome')

    expect(client.runtime.status).toBe('attached')
    expect(commands).toEqual(['001'])
  })

  test('does not auto-respond to PING without installed features', () => {
    const transport = createMockTransport()
    const client = new Client()

    client.attach(transport.stream)
    transport.sentLines.length = 0

    transport.receive('PING :token123')

    expect(transport.sentLines).toEqual([])
  })

  test('send writes raw outbound commands without extra policy', () => {
    const transport = createMockTransport()
    const client = new Client()

    client.attach(transport.stream)
    transport.sentLines.length = 0

    client.send('PRIVMSG', '#dev', 'hello world')

    expect(transport.sentLines).toEqual(['PRIVMSG #dev :hello world'])
  })
})
