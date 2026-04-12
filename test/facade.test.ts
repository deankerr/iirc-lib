import { describe, expect, test } from 'bun:test'

import type { ParsedMessage } from '../src/client/client'
import { createClient } from '../src/client/facade'
import { createMockTransport } from '../src/mock-transport'

type MockTransport = ReturnType<typeof createMockTransport>

function createFacadeClient(
  nick = 'testbot',
  opts?: { reconnect?: { baseDelay: number; maxDelay: number; maxAttempts?: number } },
) {
  const transports: MockTransport[] = []

  function connectFactory() {
    const mock = createMockTransport()
    transports.push(mock)
    return mock.stream
  }

  const client = createClient({
    nick,
    user: 'test',
    realname: 'Test Bot',
    sendDelay: 0,
    connect: connectFactory,
    reconnect: opts?.reconnect,
  })

  return { client, transports }
}

// Helper: get the latest transport
function latest(transports: MockTransport[]): MockTransport {
  return transports[transports.length - 1]!
}

describe('facade basic', () => {
  test('starts in idle status', () => {
    const { client } = createFacadeClient()
    expect(client.status).toBe('idle')
  })

  test('connect transitions through connecting to connected', () => {
    const { client, transports } = createFacadeClient()
    client.connect()

    expect(client.status).toBe('connecting')

    latest(transports).receive(':server 001 testbot :Welcome')
    expect(client.status).toBe('connected')
  })

  test('emits registered event', () => {
    const { client, transports } = createFacadeClient()
    let registered = false
    client.on('registered', () => {
      registered = true
    })

    client.connect()
    latest(transports).receive(':server 001 testbot :Welcome')

    expect(registered).toBe(true)
  })

  test('emits raw and message events', () => {
    const { client, transports } = createFacadeClient()
    const commands: string[] = []
    client.on('message', (msg: ParsedMessage) => commands.push(msg.command))

    client.connect()
    latest(transports).receive(':server 001 testbot :Welcome')
    latest(transports).receive(':user!u@h PRIVMSG #chan :hello')

    expect(commands).toContain('PRIVMSG')
  })

  test('sends registration commands', () => {
    const { client, transports } = createFacadeClient()
    client.connect()

    expect(latest(transports).sentLines).toContain('NICK testbot')
    expect(latest(transports).sentLines).toContain('USER test 0 * :Test Bot')
  })

  test('proxies send methods', () => {
    const { client, transports } = createFacadeClient()
    client.connect()
    latest(transports).receive(':server 001 testbot :Welcome')
    latest(transports).sentLines.length = 0

    client.privmsg('#chan', 'hello world')

    expect(latest(transports).sentLines).toContain('PRIVMSG #chan :hello world')
  })

  test('throws on double connect', () => {
    const { client } = createFacadeClient()
    client.connect()

    expect(() => client.connect()).toThrow()
  })
})

describe('facade channel tracker', () => {
  test('tracks channels through facade', () => {
    const { client, transports } = createFacadeClient()
    client.connect()
    latest(transports).receive(':server 001 testbot :Welcome')
    latest(transports).receive(':testbot!u@h JOIN #test')

    const channel = client.channels.getChannel('#test')
    expect(channel).toBeDefined()
    expect(channel!.joined).toBe(true)
  })

  test('handles close via tracker', () => {
    const { client, transports } = createFacadeClient()
    client.connect()
    latest(transports).receive(':server 001 testbot :Welcome')
    latest(transports).receive(':testbot!u@h JOIN #test')

    latest(transports).close()

    const channel = client.channels.getChannel('#test')
    expect(channel!.joined).toBe(false)
  })
})

describe('facade nick collision', () => {
  test('nick collision flows through inner Client', () => {
    const { client, transports } = createFacadeClient('bot')
    client.connect()

    latest(transports).receive(':server 433 * bot :Nickname is already in use')
    expect(client.nick).toBe('bot2')

    latest(transports).receive(':server 001 bot2 :Welcome')
    expect(client.status).toBe('connected')
    expect(client.nick).toBe('bot2')
  })
})

describe('facade quit', () => {
  test('quit sends QUIT and emits close', () => {
    const { client, transports } = createFacadeClient()
    let closed = false
    client.on('close', () => {
      closed = true
    })

    client.connect()
    latest(transports).receive(':server 001 testbot :Welcome')
    latest(transports).sentLines.length = 0

    client.quit('Bye')
    expect(latest(transports).sentLines).toContain('QUIT Bye')

    // Simulate server closing the connection
    latest(transports).close()

    expect(closed).toBe(true)
    expect(client.status).toBe('idle')
  })

  test('quit without reconnect config emits close', () => {
    const { client, transports } = createFacadeClient()
    let closed = false
    client.on('close', () => {
      closed = true
    })

    client.connect()
    latest(transports).receive(':server 001 testbot :Welcome')

    // Unexpected close without reconnect config
    latest(transports).close()

    expect(closed).toBe(true)
    expect(client.status).toBe('idle')
  })
})

describe('facade reconnection', () => {
  test('reconnects on unexpected close', async () => {
    const { client, transports } = createFacadeClient('bot', {
      reconnect: { baseDelay: 10, maxDelay: 50 },
    })
    let reconnectAttempt = 0
    let reconnected = false
    client.on('reconnecting', (attempt: number) => {
      reconnectAttempt = attempt
    })
    client.on('reconnected', () => {
      reconnected = true
    })

    client.connect()
    latest(transports).receive(':server 001 bot :Welcome')
    latest(transports).receive(':bot!u@h JOIN #dev')

    // Unexpected close
    latest(transports).close()

    // Wait for reconnect timer
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(reconnectAttempt).toBe(1)
    expect(transports.length).toBe(2)

    // Complete registration on new transport
    latest(transports).receive(':server 001 bot :Welcome')

    expect(reconnected).toBe(true)
    expect(client.status).toBe('connected')

    // Should have rejoined channels
    expect(latest(transports).sentLines).toContain('JOIN #dev')
  })

  test('quit suppresses reconnect', async () => {
    const { client, transports } = createFacadeClient('bot', {
      reconnect: { baseDelay: 10, maxDelay: 50 },
    })
    let reconnecting = false
    client.on('reconnecting', () => {
      reconnecting = true
    })

    client.connect()
    latest(transports).receive(':server 001 bot :Welcome')

    client.quit('Bye')
    latest(transports).close()

    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(reconnecting).toBe(false)
    expect(client.status).toBe('idle')
    expect(transports.length).toBe(1) // No new transport created
  })

  test('max attempts triggers exhausted', async () => {
    const { client, transports } = createFacadeClient('bot', {
      reconnect: { baseDelay: 10, maxDelay: 20, maxAttempts: 2 },
    })
    let exhausted = false
    client.on('exhausted', () => {
      exhausted = true
    })

    client.connect()
    latest(transports).receive(':server 001 bot :Welcome')

    // Unexpected close
    latest(transports).close()

    // Wait for first attempt
    await new Promise((resolve) => setTimeout(resolve, 50))
    // First attempt fails immediately
    latest(transports).close()

    // Wait for second attempt
    await new Promise((resolve) => setTimeout(resolve, 80))
    // Second attempt fails
    latest(transports).close()

    // Wait for exhausted
    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(exhausted).toBe(true)
    expect(client.status).toBe('exhausted')
  })

  test('events keep flowing after reconnect', async () => {
    const { client, transports } = createFacadeClient('bot', {
      reconnect: { baseDelay: 10, maxDelay: 50 },
    })
    const messages: string[] = []
    client.on('message', (msg: ParsedMessage) => {
      if (msg.command === 'PRIVMSG') messages.push(msg.params[1] ?? '')
    })

    client.connect()
    latest(transports).receive(':server 001 bot :Welcome')
    latest(transports).receive(':user!u@h PRIVMSG #chan :before')

    expect(messages).toContain('before')

    // Disconnect and reconnect
    latest(transports).close()
    await new Promise((resolve) => setTimeout(resolve, 100))
    latest(transports).receive(':server 001 bot :Welcome')
    latest(transports).receive(':user!u@h PRIVMSG #chan :after')

    expect(messages).toContain('after')
  })

  test('quit during wait cancels reconnect', async () => {
    const { client, transports } = createFacadeClient('bot', {
      reconnect: { baseDelay: 500, maxDelay: 1000 },
    })
    let closed = false
    client.on('close', () => {
      closed = true
    })

    client.connect()
    latest(transports).receive(':server 001 bot :Welcome')

    // Unexpected close starts reconnect with long delay
    latest(transports).close()

    // Quit while waiting
    client.quit()

    expect(closed).toBe(true)
    expect(client.status).toBe('idle')
    expect(transports.length).toBe(1) // No new transport created
  })

  test('error events re-emitted during reconnect', async () => {
    const { client, transports } = createFacadeClient('bot', {
      reconnect: { baseDelay: 10, maxDelay: 50 },
    })
    const errors: string[] = []
    client.on('error', (err: Error) => {
      errors.push(err.message)
    })

    client.connect()
    latest(transports).receive(':server 001 bot :Welcome')

    // Error then close
    latest(transports).error(new Error('Connection reset'))
    latest(transports).close()

    expect(errors).toContain('Connection reset')
  })
})
