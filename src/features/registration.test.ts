import { describe, expect, test } from 'bun:test'

import type { RuntimeInputConfig } from '../config'
import { createMockTransport } from '../mock-transport'
import { createRuntime } from '../runtime'

// Harness wraps a Runtime + mock transport, registers the session immediately, and records
// sent lines and emitted errors. Callers drive the machine by calling
// transport.receive() with server-sent IRC lines and asserting on sentLines
// and errors.

function createHarness(configOverrides: Partial<RuntimeInputConfig> = {}) {
  const config: RuntimeInputConfig = {
    nick: 'testbot',
    sendDelayMs: 0,
    ...configOverrides,
  }

  const transport = createMockTransport()
  const runtime = createRuntime(config, transport.stream)
  const errors: Error[] = []

  runtime.on('error', (error) => errors.push(error))

  // Register explicitly so tests can inspect the initial registration burst.
  runtime.register()

  // Clear the initial registration burst (CAP LS, PASS?, NICK, USER).
  transport.sentLines.length = 0

  return { errors, runtime, sentLines: transport.sentLines, transport }
}

// --- Helpers for common server-sent IRC lines ---

function capLs(nick: string, caps: string): string {
  return `:irc.example.com CAP ${nick} LS :${caps}`
}

function capLsContinuation(nick: string, caps: string): string {
  return `:irc.example.com CAP ${nick} LS * :${caps}`
}

function capAck(nick: string, caps: string): string {
  return `:irc.example.com CAP ${nick} ACK :${caps}`
}


function capNak(nick: string, caps: string): string {
  return `:irc.example.com CAP ${nick} NAK :${caps}`
}

// --- Tests ---

describe('registration', () => {
  describe('CAP negotiation without SASL', () => {
    test('ends registration immediately when no caps are available', () => {
      const { transport, sentLines } = createHarness()

      transport.receive(capLs('testbot', ''))

      expect(sentLines).toEqual(['CAP END'])
    })

    test('requests available caps from default list and ends on ACK', () => {
      // Default requestedCapabilities is ['message-tags'].
      const { transport, sentLines } = createHarness()

      transport.receive(capLs('testbot', 'message-tags'))

      expect(sentLines).toEqual(['CAP REQ message-tags'])

      sentLines.length = 0
      transport.receive(capAck('testbot', 'message-tags'))

      expect(sentLines).toEqual(['CAP END'])
    })

    test('filters requested caps to those advertised by the server', () => {
      // Default is ['message-tags']. Server only advertises sasl.
      // Intersection is empty → CAP END immediately.
      const { transport, sentLines } = createHarness()

      transport.receive(capLs('testbot', 'sasl'))

      expect(sentLines).toEqual(['CAP END'])
    })

    test('CAP NAK sends CAP END and stops processing', () => {
      const { transport, sentLines, errors } = createHarness()

      transport.receive(capLs('testbot', 'message-tags'))
      sentLines.length = 0

      transport.receive(capNak('testbot', 'message-tags'))

      expect(sentLines).toEqual(['CAP END'])
      expect(errors).toHaveLength(0)
    })
  })

  describe('CAP continuation lines', () => {
    test('accumulates multi-line CAP LS before requesting', () => {
      const { transport, sentLines } = createHarness({
        sasl: { password: 'hunter2', username: 'bot' },
      })

      transport.receive(capLsContinuation('testbot', 'message-tags'))
      // Still collecting — no REQ yet.
      expect(sentLines).toEqual([])

      transport.receive(`:irc.example.com CAP testbot LS :sasl`)

      expect(sentLines).toEqual(['CAP REQ :message-tags sasl'])
    })

  })

  describe('SASL PLAIN happy path', () => {
    test('full SASL PLAIN flow', () => {
      const { transport, sentLines, runtime } = createHarness({
        sasl: { password: 'sesame', username: 'jilles' },
      })

      // Initial registration burst was sent and cleared.
      transport.receive(capLs('jilles', 'message-tags sasl'))
      expect(sentLines).toEqual(['CAP REQ :message-tags sasl'])

      sentLines.length = 0
      transport.receive(capAck('jilles', 'message-tags sasl'))
      expect(sentLines).toEqual(['AUTHENTICATE PLAIN'])

      sentLines.length = 0
      transport.receive('AUTHENTICATE +')
      // RFC 4616 PLAIN with empty authzid: \x00jilles\x00sesame
      // btoa("\x00jilles\x00sesame") = "AGppbGxlcwBzZXNhbWU="
      expect(sentLines).toEqual(['AUTHENTICATE AGppbGxlcwBzZXNhbWU='])

      sentLines.length = 0
      transport.receive(':irc.example.com 903 jilles :SASL authentication successful')
      expect(sentLines).toEqual(['CAP END'])

      // Verify activeCaps were written.
      expect(runtime.activeCaps.has('sasl')).toBe(true)
      expect(runtime.activeCaps.has('message-tags')).toBe(true)
    })

    test('sasl config present but server did not advertise sasl cap', () => {
      // Server doesn't advertise sasl (only message-tags). The intersection
      // of requested caps with available caps won't include sasl, so no
      // SASL flow occurs → CAP END immediately after ACK.
      const { transport, sentLines } = createHarness({
        sasl: { password: 'pw', username: 'bot' },
      })

      transport.receive(capLs('testbot', 'message-tags'))
      expect(sentLines).toEqual(['CAP REQ message-tags'])

      sentLines.length = 0
      transport.receive(capAck('testbot', 'message-tags'))
      // No sasl in ACK → CAP END, no AUTHENTICATE.
      expect(sentLines).toEqual(['CAP END'])
    })

    test('sasl capability ACKed but sasl config missing from runtime', () => {
      // Without sasl config, auto-include doesn't add 'sasl' to requested
      // caps. Server advertises sasl but we don't request it.
      const { transport, sentLines } = createHarness()

      transport.receive(capLs('testbot', 'message-tags sasl'))
      // Default config only requests message-tags (no sasl config → no auto-include).
      expect(sentLines).toEqual(['CAP REQ message-tags'])

      sentLines.length = 0
      transport.receive(capAck('testbot', 'message-tags'))
      expect(sentLines).toEqual(['CAP END'])
    })
  })

  describe('SASL PLAIN payload chunking', () => {
    test('payload under 400 bytes sends single AUTHENTICATE command', () => {
      const { transport, sentLines } = createHarness({
        sasl: { password: 'short', username: 'bot' },
      })

      transport.receive(capLs('testbot', 'sasl'))
      sentLines.length = 0
      transport.receive(capAck('testbot', 'sasl'))
      sentLines.length = 0

      transport.receive('AUTHENTICATE +')

      // Single AUTHENTICATE line, no trailing + marker.
      expect(sentLines).toHaveLength(1)
      const [firstLine = ''] = sentLines
      expect(firstLine.startsWith('AUTHENTICATE ')).toBe(true)
      const payload = firstLine.slice('AUTHENTICATE '.length)
      expect(payload.length).toBeLessThanOrEqual(400)
      expect(payload).not.toBe('+')
    })

    test('long password produces chunked AUTHENTICATE commands', () => {
      // btoa("\x00<user>\x00<pw>") where pw is 500 chars → base64 ~ 700 bytes.
      const longPassword = 'A'.repeat(500)
      const { transport, sentLines } = createHarness({
        sasl: { password: longPassword, username: 'user' },
      })

      transport.receive(capLs('testbot', 'sasl'))
      sentLines.length = 0
      transport.receive(capAck('testbot', 'sasl'))
      sentLines.length = 0

      transport.receive('AUTHENTICATE +')

      // Should have multiple AUTHENTICATE commands.
      expect(sentLines.length).toBeGreaterThan(1)

      // All lines start with AUTHENTICATE.
      for (const line of sentLines) {
        expect(line.startsWith('AUTHENTICATE ')).toBe(true)
      }

      // First chunks should be exactly 400 chars of base64.
      for (let i = 0; i < sentLines.length - 1; i += 1) {
        const payload = sentLines[i]?.slice('AUTHENTICATE '.length) ?? ''
        expect(payload.length).toBe(400)
      }

      // Last chunk is either < 400 bytes of base64, or "+" if previous was
      // exactly 400.
      const lastPayload = sentLines.at(-1)?.slice('AUTHENTICATE '.length) ?? ''
      expect(lastPayload === '+' || lastPayload.length < 400).toBe(true)
    })

    test('payload landing on exactly 400-byte boundary sends trailing +', () => {
      // base64 output length = ceil(n / 3) * 4, where n = raw bytes.
      // We need base64 output length = 400 → raw = 300 bytes.
      // Raw = 1 (NUL) + userLen + 1 (NUL) + pwLen.
      // With user = "u" (1 byte): pwLen = 300 - 3 = 297.
      const user = 'u'
      const password = 'x'.repeat(297)
      const { transport, sentLines } = createHarness({
        sasl: { password, username: user },
      })

      transport.receive(capLs('testbot', 'sasl'))
      sentLines.length = 0
      transport.receive(capAck('testbot', 'sasl'))
      sentLines.length = 0

      transport.receive('AUTHENTICATE +')

      // Two lines: the 400-byte chunk, then "+".
      expect(sentLines).toHaveLength(2)
      const payload = sentLines[0]?.slice('AUTHENTICATE '.length) ?? ''
      expect(payload.length).toBe(400)
      expect(sentLines[1]).toBe('AUTHENTICATE +')
    })
  })

  describe('SASL error paths', () => {
    function setupSaslAuthenticating() {
      const harness = createHarness({
        sasl: { password: 'pw', username: 'bot' },
      })
      harness.transport.receive(capLs('testbot', 'sasl'))
      harness.sentLines.length = 0
      harness.transport.receive(capAck('testbot', 'sasl'))
      harness.sentLines.length = 0
      return harness
    }

    function setupSaslSendingPayload() {
      const harness = setupSaslAuthenticating()
      harness.transport.receive('AUTHENTICATE +')
      harness.sentLines.length = 0
      return harness
    }

    test('904 ERR_SASLFAIL in authenticating state emits error', () => {
      const { transport, sentLines, errors } = setupSaslAuthenticating()

      transport.receive(':irc.example.com 904 testbot :SASL authentication failed')

      expect(errors).toHaveLength(1)
      expect(errors[0]?.message).toContain('904')
      expect(sentLines).toEqual([])
    })

    test('904 ERR_SASLFAIL in sending_payload state emits error', () => {
      const { transport, sentLines, errors } = setupSaslSendingPayload()

      transport.receive(':irc.example.com 904 testbot :SASL authentication failed')

      expect(errors).toHaveLength(1)
      expect(errors[0]?.message).toContain('904')
      expect(sentLines).toEqual([])
    })

    test('908 RPL_SASLMECHS in authenticating state emits error', () => {
      const { transport, sentLines, errors } = setupSaslAuthenticating()

      transport.receive(':irc.example.com 908 testbot EXTERNAL :are available SASL mechanisms')

      expect(errors).toHaveLength(1)
      expect(errors[0]?.message).toContain('908')
      expect(sentLines).toEqual([])
    })

    test('902 ERR_NICKLOCKED in sending_payload state emits error', () => {
      const { transport, sentLines, errors } = setupSaslSendingPayload()

      transport.receive(':irc.example.com 902 testbot :You must use a nick assigned to you')

      expect(errors).toHaveLength(1)
      expect(errors[0]?.message).toContain('902')
      expect(sentLines).toEqual([])
    })

    test('905 ERR_SASLTOOLONG in sending_payload state emits error', () => {
      const { transport, sentLines, errors } = setupSaslSendingPayload()

      transport.receive(':irc.example.com 905 testbot :SASL message too long')

      expect(errors).toHaveLength(1)
      expect(errors[0]?.message).toContain('905')
      expect(sentLines).toEqual([])
    })
  })

  describe('edge cases', () => {
    test('NOTICE during authenticating state is ignored by registration', () => {
      const { transport, sentLines } = createHarness({
        sasl: { password: 'pw', username: 'bot' },
      })

      transport.receive(capLs('testbot', 'sasl'))
      sentLines.length = 0
      transport.receive(capAck('testbot', 'sasl'))
      sentLines.length = 0

      // NOTICE during SASL — ignored by registration machine.
      // Skip asserting on sentLines since the ping feature may produce PONG
      // for PING, but NOTICE should produce no registration output.
      transport.receive(':irc.example.com NOTICE * :Looking up your hostname...')
      // Machine is still in authenticating — AUTHENTICATE + still works.
      transport.receive('AUTHENTICATE +')
      expect(sentLines.length).toBeGreaterThan(0)
    })

    test('messages after done state are ignored', () => {
      const { transport, sentLines } = createHarness({
        sasl: { password: 'pw', username: 'bot' },
      })

      // Full happy path to done.
      transport.receive(capLs('testbot', 'message-tags sasl'))
      sentLines.length = 0
      transport.receive(capAck('testbot', 'message-tags sasl'))
      sentLines.length = 0
      transport.receive('AUTHENTICATE +')
      sentLines.length = 0
      transport.receive(':irc.example.com 903 testbot :SASL authentication successful')

      expect(sentLines).toEqual(['CAP END'])

      // Spurious 903 after done — should not produce additional CAP END.
      sentLines.length = 0
      transport.receive(':irc.example.com 903 testbot :SASL authentication successful')
      expect(sentLines).toEqual([])
    })

    test('messages after error state are ignored', () => {
      const { transport, sentLines, errors } = createHarness({
        sasl: { password: 'pw', username: 'bot' },
      })

      transport.receive(capLs('testbot', 'sasl'))
      sentLines.length = 0
      transport.receive(capAck('testbot', 'sasl'))
      sentLines.length = 0

      // Trigger error via 904.
      transport.receive(':irc.example.com 904 testbot :SASL authentication failed')
      expect(errors).toHaveLength(1)

      // Spurious 903 after error — should not produce CAP END.
      sentLines.length = 0
      transport.receive(':irc.example.com 903 testbot :SASL authentication successful')
      expect(sentLines).toEqual([])
      // No additional error emitted.
      expect(errors).toHaveLength(1)
    })

    test('PASS is sent when password is configured', () => {
      const transport2 = createMockTransport()
      const runtime = createRuntime(
        {
          nick: 'bot',
          password: 'serverpw',
          sendDelayMs: 0,
        },
        transport2.stream,
      )

      runtime.register()

      const initialLines = [...transport2.sentLines]
      expect(initialLines.some((l) => l === 'PASS serverpw')).toBe(true)
    })

    test('cap value suffixes are stripped in LS', () => {
      const { transport, sentLines } = createHarness({
        sasl: { password: 'pw', username: 'bot' },
      })

      // sasl=PLAIN,EXTERNAL → stripped to "sasl" for matching.
      // Server only advertises sasl (not message-tags), so intersection
      // of ['message-tags', 'sasl'] ∩ {sasl} = ['sasl'].
      transport.receive(capLs('testbot', 'sasl=PLAIN,EXTERNAL'))
      expect(sentLines).toEqual(['CAP REQ sasl'])
    })

    test('ACK caps with dash prefix are handled as disabled', () => {
      const { transport, sentLines, runtime } = createHarness()

      transport.receive(capLs('testbot', 'message-tags'))

      sentLines.length = 0
      transport.receive(capAck('testbot', '-multi-prefix message-tags'))

      expect(runtime.activeCaps.has('message-tags')).toBe(true)
      // -multi-prefix means it was disabled, not enabled.
      expect(runtime.activeCaps.has('multi-prefix')).toBe(false)
      expect(sentLines).toEqual(['CAP END'])
    })
  })
})
