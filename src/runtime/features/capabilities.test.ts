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
    requestedCapabilities: ['message-tags'],
    ...configOverrides,
  }
  return new Runtime(config)
}

describe('capabilities', () => {
  test('sends CAP LS 302 on attach', () => {
    const transport = createMockTransport()
    const runtime = createRuntime()

    runtime.attach(transport.stream)

    expect(transport.sentLines).toContain('CAP LS 302')
  })

  test('server without CAP support receives 001 directly, activeCaps stays empty', () => {
    const transport = createMockTransport()
    const runtime = createRuntime()

    runtime.attach(transport.stream)
    transport.receive(':irc.example.com 001 bot :Welcome')

    expect(runtime.activeCaps.size).toBe(0)
    expect(runtime.status).toBe('registered')
  })

  test('requests capabilities that overlap between requested and available', () => {
    const transport = createMockTransport()
    const runtime = createRuntime({
      requestedCapabilities: ['message-tags', 'server-time', 'nonexistent-cap'],
    })

    runtime.attach(transport.stream)
    transport.sentLines.length = 0

    transport.receive('CAP * LS :multi-prefix message-tags server-time')

    expect(transport.sentLines).toContain('CAP REQ :message-tags server-time')
  })

  test('sends CAP END when no requested caps are available', () => {
    const transport = createMockTransport()
    const runtime = createRuntime({
      requestedCapabilities: ['nonexistent-cap'],
    })

    runtime.attach(transport.stream)
    transport.sentLines.length = 0

    transport.receive('CAP * LS :multi-prefix sasl')

    expect(transport.sentLines).toContain('CAP END')
  })

  test('sends CAP END when default capabilities are available and ACKed', () => {
    const transport = createMockTransport()
    const runtime = createRuntime()

    runtime.attach(transport.stream)
    transport.sentLines.length = 0

    transport.receive('CAP * LS :multi-prefix message-tags')

    expect(transport.sentLines).toContain('CAP REQ :message-tags')
  })

  test('stores ACKed capabilities in activeCaps then sends CAP END', () => {
    const transport = createMockTransport()
    const runtime = createRuntime()

    runtime.attach(transport.stream)
    transport.sentLines.length = 0

    transport.receive('CAP * LS :message-tags')
    transport.receive('CAP bot ACK :message-tags')

    expect(runtime.activeCaps.has('message-tags')).toBe(true)
    expect(transport.sentLines).toContain('CAP END')
  })

  test('handles multiline CAP LS with * continuation', () => {
    const transport = createMockTransport()
    const runtime = createRuntime({
      requestedCapabilities: ['message-tags', 'batch'],
    })

    runtime.attach(transport.stream)
    transport.sentLines.length = 0

    transport.receive('CAP * LS * :multi-prefix extended-join batch')
    transport.receive('CAP * LS :message-tags server-time')

    expect(transport.sentLines).toContain('CAP REQ :message-tags batch')
  })

  test('sends CAP END on NAK', () => {
    const transport = createMockTransport()
    const runtime = createRuntime()

    runtime.attach(transport.stream)
    transport.sentLines.length = 0

    transport.receive('CAP * LS :message-tags')
    transport.receive('CAP bot NAK :message-tags')

    expect(transport.sentLines).toContain('CAP END')
    expect(runtime.activeCaps.size).toBe(0)
  })

  test('parses capability values from CAP LS and strips them', () => {
    const transport = createMockTransport()
    const runtime = createRuntime({
      requestedCapabilities: ['sasl'],
    })

    runtime.attach(transport.stream)
    transport.sentLines.length = 0

    transport.receive('CAP * LS :sasl=PLAIN,EXTERNAL message-tags')

    expect(transport.sentLines).toContain('CAP REQ :sasl')
  })
})
