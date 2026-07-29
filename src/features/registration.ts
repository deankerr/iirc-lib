import type { Runtime } from '../runtime'

// RFC 4616: authzid NUL authcid NUL password.
function encodeSaslPlain(username: string, password: string): string {
  return btoa(`\0${username}\0${password}`)
}

// Payload must be split into ≤400-byte AUTHENTICATE commands.
// If the final chunk is exactly 400 bytes, a trailing '+' signals end-of-response.
function chunkPayload(base64: string): string[] {
  const CHUNK_SIZE = 400
  const chunks: string[] = []

  for (let i = 0; i < base64.length; i += CHUNK_SIZE) {
    chunks.push(base64.slice(i, i + CHUNK_SIZE))
  }

  if (chunks.at(-1)?.length === CHUNK_SIZE) {
    chunks.push('+')
  }

  return chunks
}

export function registration(runtime: Runtime): void {
  const { config } = runtime
  const availableCaps = new Set<string>()
  let done = false

  // Registration order per spec: CAP LS, PASS, NICK, USER.
  runtime.on('register', () => {
    runtime.send('CAP', 'LS', '302')
    if (config.password !== undefined) {
      runtime.send('PASS', config.password)
    }
    runtime.send('NICK', config.nick)
    runtime.send({ command: 'USER', params: [config.user, '0', '*', config.realname] })
  })

  runtime.on('event', (event) => {
    // RPL_WELCOME is part of the post-registration burst and must be handled
    // even after the CAP/SASL phase has finished.
    if (event.command === 'RPL_WELCOME') {
      runtime.connectionState.nick = event.client
      if (event.raw.source !== undefined) {
        runtime.connectionState.serverHost = event.raw.source
      }
      runtime.connectionState.registered = true
      runtime.emit('registered')
      return
    }

    // Stop processing once the CAP/SASL phase is complete. RPL_WELCOME above
    // is still handled because it normally arrives after CAP END.
    if (done) {
      return
    }

    if (event.command === 'CAP') {
      if (event.subcommand === 'LS') {
        // Accumulate caps from potentially multi-line reply; strip value suffixes.
        for (const cap of event.capsString.split(' ').filter(Boolean)) {
          availableCaps.add(cap.split('=')[0] ?? cap)
        }

        if (event.hasContinuation) {
          return
        }

        const capsToRequest = config.requestedCapabilities.filter((cap) => availableCaps.has(cap))

        if (capsToRequest.length === 0) {
          runtime.send('CAP', 'END')
          done = true
          return
        }

        runtime.send({ command: 'CAP', params: ['REQ', capsToRequest.join(' ')] })
        return
      }

      if (event.subcommand === 'ACK') {
        for (const cap of event.capsString.split(' ').filter(Boolean)) {
          if (cap.startsWith('-')) {
            runtime.activeCaps.delete(cap.slice(1))
          } else {
            runtime.activeCaps.add(cap)
          }
        }

        if (config.sasl && runtime.activeCaps.has('sasl')) {
          runtime.send('AUTHENTICATE', 'PLAIN')
          return
        }

        runtime.send('CAP', 'END')
        done = true
        return
      }

      if (event.subcommand === 'NAK') {
        runtime.send('CAP', 'END')
        done = true
        return
      }

      return
    }

    if (event.command === 'AUTHENTICATE' && event.data === '+') {
      if (!config.sasl) {
        return
      }
      const payload = encodeSaslPlain(config.sasl.username, config.sasl.password)
      for (const chunk of chunkPayload(payload)) {
        runtime.send('AUTHENTICATE', chunk)
      }
      return
    }

    if (event.command === 'RPL_SASLSUCCESS') {
      runtime.send('CAP', 'END')
      done = true
      return
    }

    if (event.command === 'ERR_NICKLOCKED') {
      runtime.emit('error', new Error('SASL authentication failed: account locked (902)'))
      done = true
      return
    }

    if (event.command === 'ERR_SASLFAIL') {
      runtime.emit('error', new Error('SASL authentication failed (904)'))
      done = true
      return
    }

    if (event.command === 'ERR_SASLTOOLONG') {
      runtime.emit('error', new Error('SASL authentication failed: message too long (905)'))
      done = true
      return
    }

    if (event.command === 'RPL_SASLMECHS') {
      runtime.emit('error', new Error('SASL PLAIN not supported by server (908)'))
      done = true
    }
  })
}
