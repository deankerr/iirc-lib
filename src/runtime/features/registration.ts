import type { Runtime } from '..'

// Registration state machine. Handles CAP negotiation and SASL
// authentication from attach through CAP END. Post-registration concerns
// (001, nick errors, PING) are handled by other features.
//
// Protocol ref: Connection Registration (§06), Capability Negotiation (§08),
// IRCv3 Capability Negotiation, IRCv3 SASL v3.1/v3.2, RFC 4616 (SASL PLAIN).
//
// State values read: runtime.activeCaps
// State values set: runtime.activeCaps
// Events emitted: error (on SASL failure)
// Messages sent: CAP LS, PASS, NICK, USER, CAP REQ, CAP END, AUTHENTICATE

type State =
  | 'collecting_ls'
  | 'awaiting_ack'
  | 'authenticating'
  | 'sending_payload'
  | 'done'
  | 'error'

// Strip value suffixes from caps (e.g. "sasl=PLAIN,EXTERNAL" → "sasl").
// ACK caps may carry a "-" prefix (disabled cap) — preserved as-is.

function parseCapNames(capsString: string): string[] {
  if (!capsString) return []
  return capsString
    .split(' ')
    .filter((cap) => cap.length > 0)
    .map((cap) => cap.split('=')[0]!)
}

// Apply acknowledged caps directly to runtime.activeCaps. No buffering
// needed — each ACK line is final for those caps.

function applyAckCaps(runtime: Runtime, caps: string[]): void {
  for (const cap of caps) {
    if (cap.startsWith('-')) {
      runtime.activeCaps.delete(cap.slice(1))
    } else {
      runtime.activeCaps.add(cap)
    }
  }
}

// RFC 4616: authzid NUL authcid NUL password. Empty authzid is the common
// case (server infers authorization identity from authentication identity).
function encodeSaslPlain(username: string, password: string): string {
  return btoa(`\x00${username}\x00${password}`)
}

// Base64 payload must be split into ≤400-byte AUTHENTICATE commands.
// If the final chunk is exactly 400 bytes, a trailing AUTHENTICATE + is
// required to signal end-of-response.
function chunkPayload(base64: string): string[] {
  const CHUNK_SIZE = 400
  const chunks: string[] = []

  for (let i = 0; i < base64.length; i += CHUNK_SIZE) {
    chunks.push(base64.slice(i, i + CHUNK_SIZE)!)
  }

  // Final chunk of exactly CHUNK_SIZE bytes needs a trailing "+" marker.
  const lastChunk = chunks[chunks.length - 1]!
  if (lastChunk.length === CHUNK_SIZE) {
    chunks.push('+')
  }

  return chunks
}

export function registration(runtime: Runtime): void {
  const config = runtime.getConfig()
  let state: State = 'collecting_ls'
  const availableCaps = new Set<string>()

  // Registration order per spec: CAP LS, PASS, NICK, USER.
  // CAP LS suspends registration server-side until CAP END.
  runtime.on('attach', () => {
    runtime.send('CAP', 'LS', '302')
    if (config.password) runtime.send('PASS', config.password)
    runtime.send('NICK', config.nick)
    runtime.sendCommand({
      command: 'USER',
      params: [config.user, '0', '*', config.realname],
      trailing: true,
    })
  })

  // State diagram is documented in state-machine.md. Unrecognised messages
  // in any state are ignored — the machine stays put and waits.
  runtime.on('message', (message) => {
    if (state === 'done' || state === 'error') return

    // --- CAP messages (all states) ---

    if (message.command === 'CAP') {
      const subcommand = message.params[1]
      if (!subcommand) return

      // CAP message format (server-sent):
      //   CAP <nick> <subcommand> [*] :<caps>
      // params[0] = nick (or *), params[1] = subcommand,
      // params[2] = * (continuation) or caps string,
      // params[3] = caps string (when continuation).
      const hasContinuation = message.params[2] === '*'
      const capsString = hasContinuation ? (message.params[3] ?? '') : (message.params[2] ?? '')
      const caps = parseCapNames(capsString)

      // Accumulate. LS caps go into availableCaps for later intersection;
      // ACK caps go straight into runtime.activeCaps.
      if (subcommand === 'LS') {
        for (const cap of caps) availableCaps.add(cap)
      } else if (subcommand === 'ACK') {
        applyAckCaps(runtime, caps)
      }

      // Continuation lines are just accumulation — stay in current state.
      if (hasContinuation) return

      // Final line: state-specific action.
      if (state === 'collecting_ls' && subcommand === 'LS') {
        const requested = config.requestedCapabilities
        const capsToRequest = requested.filter((cap) => availableCaps.has(cap))

        if (capsToRequest.length === 0) {
          runtime.send('CAP', 'END')
          state = 'done'
          return
        }

        runtime.sendCommand({
          command: 'CAP',
          params: ['REQ', capsToRequest.join(' ')],
          trailing: true,
        })
        state = 'awaiting_ack'
        return
      }

      if (state === 'awaiting_ack' && subcommand === 'ACK') {
        // SASL must complete before CAP END. If the server acknowledged
        // sasl and we have credentials, begin authentication.
        if (config.sasl && runtime.activeCaps.has('sasl')) {
          runtime.send('AUTHENTICATE', 'PLAIN')
          state = 'authenticating'
          return
        }

        runtime.send('CAP', 'END')
        state = 'done'
        return
      }

      if (state === 'awaiting_ack' && subcommand === 'NAK') {
        state = 'error'
        return
      }

      return
    }

    // --- AUTHENTICATE + (authenticating state) ---
    // Server accepts our PLAIN mechanism and is ready for the payload.

    if (state === 'authenticating' && message.command === 'AUTHENTICATE') {
      if (message.params[0] !== '+') return

      const payload = encodeSaslPlain(config.sasl!.username, config.sasl!.password)
      for (const chunk of chunkPayload(payload)) {
        runtime.send('AUTHENTICATE', chunk)
      }
      state = 'sending_payload'
      return
    }

    // --- SASL numerics (sending_payload state) ---

    // 903 RPL_SASLSUCCESS: authentication succeeded.
    if (state === 'sending_payload' && message.command === runtime.numerics.RPL_SASLSUCCESS) {
      runtime.send('CAP', 'END')
      state = 'done'
      return
    }

    // 902 ERR_NICKLOCKED: account locked or administratively unavailable.
    if (state === 'sending_payload' && message.command === runtime.numerics.ERR_NICKLOCKED) {
      runtime.emit('error', new Error('SASL authentication failed: account locked (902)'))
      state = 'error'
      return
    }

    // 904 ERR_SASLFAIL: invalid credentials or general SASL failure.
    if (
      (state === 'authenticating' || state === 'sending_payload') &&
      message.command === runtime.numerics.ERR_SASLFAIL
    ) {
      runtime.emit('error', new Error('SASL authentication failed (904)'))
      state = 'error'
      return
    }

    // 905 ERR_SASLTOOLONG: client-sent AUTHENTICATE data exceeded server limit.
    if (state === 'sending_payload' && message.command === runtime.numerics.ERR_SASLTOOLONG) {
      runtime.emit('error', new Error('SASL authentication failed: message too long (905)'))
      state = 'error'
      return
    }

    // 908 RPL_SASLMECHS: server rejected mechanism — listed available ones.
    if (state === 'authenticating' && message.command === runtime.numerics.RPL_SASLMECHS) {
      runtime.emit('error', new Error('SASL PLAIN not supported by server (908)'))
      state = 'error'
      return
    }
  })
}
