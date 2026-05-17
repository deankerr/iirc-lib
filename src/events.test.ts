import { describe, expect, test } from 'bun:test'

import { buildEvent } from './events'
import type { IrcEvent } from './events'
import { createMockTransport } from './mock-transport'
import { createRuntime } from './runtime'
import type { ParsedSource } from './runtime'
import type { IrcMessage, IrcTags } from './transport'

// Minimal helpers so individual tests stay focused on the event fields.

function msg(command: string, params: string[], tags: IrcTags = {}, source?: string): IrcMessage {
  const m: IrcMessage = { command, params, tags }
  if (source !== undefined) {
    m.source = source
  }
  return m
}

const from: ParsedSource = { host: 'h', isSelf: false, name: 'nick', user: 'u' }

describe('buildEvent', () => {
  describe('param() — required middle params', () => {
    test('PRIVMSG extracts target and text', () => {
      const event = buildEvent(msg('PRIVMSG', ['#dev', 'hello world']), from)
      expect(event.command).toBe('PRIVMSG')
      if (event.command !== 'PRIVMSG') {
        return
      }
      expect(event.target).toBe('#dev')
      expect(event.text).toBe('hello world')
    })

    test('JOIN extracts channel', () => {
      const event = buildEvent(msg('JOIN', ['#dev']), from)
      expect(event.command).toBe('JOIN')
      if (event.command !== 'JOIN') {
        return
      }
      expect(event.channel).toBe('#dev')
    })

    test('NICK extracts newnick', () => {
      const event = buildEvent(msg('NICK', ['newnick']), from)
      expect(event.command).toBe('NICK')
      if (event.command !== 'NICK') {
        return
      }
      expect(event.newnick).toBe('newnick')
    })
  })

  describe('trailing() — trailing params', () => {
    test('NOTICE puts text in trailing field', () => {
      const event = buildEvent(msg('NOTICE', ['*', 'Looking up your hostname...']), from)
      expect(event.command).toBe('NOTICE')
      if (event.command !== 'NOTICE') {
        return
      }
      expect(event.text).toBe('Looking up your hostname...')
    })

    test('TOPIC allows empty trailing — clearing the topic', () => {
      const event = buildEvent(msg('TOPIC', ['#dev', '']), from)
      expect(event.command).toBe('TOPIC')
      if (event.command !== 'TOPIC') {
        return
      }
      expect(event.topic).toBe('')
    })

    test('ERROR extracts reason from trailing', () => {
      const event = buildEvent(msg('ERROR', ['Closing Link: bot[127.0.0.1] (Quit: bye)']), from)
      expect(event.command).toBe('ERROR')
      if (event.command !== 'ERROR') {
        return
      }
      expect(event.reason).toBe('Closing Link: bot[127.0.0.1] (Quit: bye)')
    })
  })

  describe('optional() — optional params', () => {
    test('PART with reason', () => {
      const event = buildEvent(msg('PART', ['#dev', 'bye']), from)
      expect(event.command).toBe('PART')
      if (event.command !== 'PART') {
        return
      }
      expect(event.channel).toBe('#dev')
      expect(event.reason).toBe('bye')
    })

    test('PART without reason returns undefined', () => {
      const event = buildEvent(msg('PART', ['#dev']), from)
      expect(event.command).toBe('PART')
      if (event.command !== 'PART') {
        return
      }
      expect(event.reason).toBeUndefined()
    })

    test('QUIT without reason returns undefined', () => {
      const event = buildEvent(msg('QUIT', []), from)
      expect(event.command).toBe('QUIT')
      if (event.command !== 'QUIT') {
        return
      }
      expect(event.reason).toBeUndefined()
    })

    test('QUIT with reason', () => {
      const event = buildEvent(msg('QUIT', ['connection reset']), from)
      expect(event.command).toBe('QUIT')
      if (event.command !== 'QUIT') {
        return
      }
      expect(event.reason).toBe('connection reset')
    })
  })

  describe('rest() — variadic params', () => {
    test('MODE with no mode args', () => {
      const event = buildEvent(msg('MODE', ['#dev', '+m']), from)
      expect(event.command).toBe('MODE')
      if (event.command !== 'MODE') {
        return
      }
      expect(event.target).toBe('#dev')
      expect(event.modestring).toBe('+m')
      expect(event.modeArgs).toEqual([])
    })

    test('MODE with mode args', () => {
      const event = buildEvent(msg('MODE', ['#dev', '+ov', 'alice', 'bob']), from)
      expect(event.command).toBe('MODE')
      if (event.command !== 'MODE') {
        return
      }
      expect(event.modestring).toBe('+ov')
      expect(event.modeArgs).toEqual(['alice', 'bob'])
    })
  })

  describe('numeric resolution', () => {
    test('001 resolves to RPL_WELCOME and extracts fields', () => {
      const event = buildEvent(msg('001', ['bot', 'Welcome to IRC']), from)
      expect(event.command).toBe('RPL_WELCOME')
      if (event.command !== 'RPL_WELCOME') {
        return
      }
      expect(event.client).toBe('bot')
      expect(event.text).toBe('Welcome to IRC')
    })

    test('KICK extracts channel, user, and optional comment', () => {
      const event = buildEvent(msg('KICK', ['#dev', 'alice', 'rule violation']), from)
      expect(event.command).toBe('KICK')
      if (event.command !== 'KICK') {
        return
      }
      expect(event.channel).toBe('#dev')
      expect(event.user).toBe('alice')
      expect(event.comment).toBe('rule violation')
    })
  })

  describe('raw and tags passthrough', () => {
    test('raw is the original IrcMessage', () => {
      const message = msg('JOIN', ['#dev'])
      const event = buildEvent(message, from)
      expect(event.raw).toBe(message)
    })

    test('tags from the wire are on raw.tags', () => {
      const message = msg('PRIVMSG', ['#dev', 'hello'], { msgid: 'abc123', time: '2024-01-01' })
      const event = buildEvent(message, from)
      expect(event.raw.tags).toEqual({ msgid: 'abc123', time: '2024-01-01' })
    })

    test('from is attached to every event', () => {
      const event = buildEvent(msg('JOIN', ['#dev']), from)
      expect(event.from).toBe(from)
    })
  })

  describe('UNKNOWN event', () => {
    test('unrecognized command produces UNKNOWN event', () => {
      const event = buildEvent(msg('SOMECUSTOMCMD', ['arg']), from)
      expect(event.command).toBe('UNKNOWN')
      expect(event.raw.command).toBe('SOMECUSTOMCMD')
    })

    test('unrecognized numeric produces UNKNOWN event', () => {
      const event = buildEvent(msg('999', ['bot', 'custom']), from)
      expect(event.command).toBe('UNKNOWN')
      expect(event.raw.command).toBe('999')
    })

    test('UNKNOWN event carries raw and from', () => {
      const message = msg('WEIRDCOMMAND', ['a', 'b'])
      const event = buildEvent(message, from)
      expect(event.command).toBe('UNKNOWN')
      expect(event.raw).toBe(message)
      expect(event.from).toBe(from)
    })
  })
})

describe('runtime parse_error', () => {
  test('emits parse_error when enricher throws on missing required param', () => {
    const transport = createMockTransport()
    const runtime = createRuntime({ nick: 'bot', sendDelayMs: 0 }, transport.stream)
    runtime.register()

    const parseErrors: { message: IrcMessage; error: Error }[] = []
    runtime.on('parse_error', (message, error) => void parseErrors.push({ error, message }))

    // PRIVMSG with no params — param() will throw on missing target
    transport.receive('PRIVMSG')

    expect(parseErrors).toHaveLength(1)
    expect(parseErrors[0]?.message.command).toBe('PRIVMSG')
  })

  test('emits parse_error when enricher throws on missing trailing param', () => {
    const transport = createMockTransport()
    const runtime = createRuntime({ nick: 'bot', sendDelayMs: 0 }, transport.stream)
    runtime.register()

    const parseErrors: { message: IrcMessage; error: Error }[] = []
    runtime.on('parse_error', (message, error) => void parseErrors.push({ error, message }))

    // PRIVMSG with target but no text — trailing() will throw
    transport.receive('PRIVMSG #dev')

    expect(parseErrors).toHaveLength(1)
    expect(parseErrors[0]?.message.command).toBe('PRIVMSG')
  })

  test('valid events still flow after a parse_error', () => {
    const transport = createMockTransport()
    const runtime = createRuntime({ nick: 'bot', sendDelayMs: 0 }, transport.stream)
    runtime.register()

    const events: IrcEvent[] = []
    runtime.on('event', (e) => void events.push(e))

    transport.receive('PRIVMSG')
    transport.receive(':alice!u@h PRIVMSG #dev :hello')

    const privmsgs = events.filter((e) => e.command === 'PRIVMSG')
    expect(privmsgs).toHaveLength(1)
  })
})
