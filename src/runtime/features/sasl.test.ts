import { describe, expect, test } from 'bun:test'

import type { RuntimeConfig } from '../../config'
import { createMockTransport } from '../../mock-transport'
import { Runtime } from '../runtime'

function createRuntime(configOverrides: Partial<RuntimeConfig> = {}): Runtime {
  const config: RuntimeConfig = {
    nick: 'bot',
    user: 'bot',
    realname: 'Bot',
    sendDelayMs: 0,
    requestedCapabilities: ['message-tags', 'sasl'],
    sasl: { username: 'testuser', password: 'testpass' },
    ...configOverrides,
  }
  return new Runtime(config)
}

describe('sasl', () => {
  test('sends AUTHENTICATE PLAIN when sasl is ACKed', () => {
    const transport = createMockTransport()
    const runtime = createRuntime()

    runtime.attach(transport.stream)
    transport.sentLines.length = 0

    transport.receive('CAP * LS :sasl message-tags')
    transport.receive('CAP bot ACK :sasl message-tags')

    expect(transport.sentLines).toContain('AUTHENTICATE PLAIN')
  })

  test('sends base64-encoded payload after AUTHENTICATE +', () => {
    const transport = createMockTransport()
    const runtime = createRuntime()

    runtime.attach(transport.stream)
    transport.sentLines.length = 0

    transport.receive('CAP bot ACK :sasl')
    transport.receive('AUTHENTICATE +')

    const authLines = transport.sentLines.filter((line) => line.startsWith('AUTHENTICATE '))
    expect(authLines.length).toBe(2)
    expect(authLines[0]).toBe('AUTHENTICATE PLAIN')

    const encodedPayload = authLines[1]!.replace('AUTHENTICATE ', '')
    const decoded = Buffer.from(encodedPayload, 'base64').toString('utf8')
    expect(decoded).toBe('testuser\x00testpass')
  })

  test('sends CAP END on 903 success', () => {
    const transport = createMockTransport()
    const runtime = createRuntime()

    runtime.attach(transport.stream)
    transport.sentLines.length = 0

    transport.receive('CAP bot ACK :sasl')
    transport.receive('AUTHENTICATE +')
    transport.receive(':server 903 bot :SASL authentication successful')

    expect(transport.sentLines).toContain('CAP END')
  })

  test('emits error on 904 failure', () => {
    const transport = createMockTransport()
    const runtime = createRuntime()

    runtime.attach(transport.stream)

    let error: Error | undefined
    runtime.on('error', (err) => {
      error = err
    })

    transport.receive('CAP bot ACK :sasl')
    transport.receive('AUTHENTICATE +')
    transport.receive(':server 904 bot :SASL authentication failed')

    expect(error).toBeDefined()
    expect(error?.message).toBe('SASL authentication failed')
  })

  test('does nothing without sasl config', () => {
    const transport = createMockTransport()
    const runtime = createRuntime({
      sasl: undefined,
      requestedCapabilities: ['message-tags'],
    })

    runtime.attach(transport.stream)
    transport.sentLines.length = 0

    transport.receive('CAP bot ACK :sasl')

    expect(transport.sentLines).not.toContain('AUTHENTICATE PLAIN')
  })
})
