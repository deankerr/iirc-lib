import type { Runtime } from '..'
import type { IrcMessage } from '../transport'

// See registration.md for the protocol notes, state diagram, and feature
// boundary for this machine.

type State =
  | 'collecting_ls'
  | 'awaiting_ack'
  | 'authenticating'
  | 'sending_payload'
  | 'done'
  | 'error'

type ParsedCapMessage =
  | {
      subcommand: 'LS' | 'ACK' | 'NAK'
      names: string[]
      hasContinuation: boolean
    }
  | undefined

// Strip value suffixes from caps (e.g. "sasl=PLAIN,EXTERNAL" → "sasl").
// ACK caps may carry a "-" prefix (disabled cap) — preserved as-is.
function parseCapNames(capsString: string): string[] {
  return capsString
    .split(' ')
    .filter((cap) => cap.length > 0)
    .map((cap) => {
      const [name = ''] = cap.split('=')
      return name
    })
}

// CAP is unusual in IRC: the subcommand lives in params[1], and multi-line
// replies move the capability string from params[2] to params[3]. Normalize
// that layout so the state machine can reason in terms of LS/ACK/NAK.
function parseCapMessage(message: IrcMessage): ParsedCapMessage {
  if (message.command !== 'CAP') {
    return undefined
  }

  const [, subcommand] = message.params
  if (subcommand !== 'LS' && subcommand !== 'ACK' && subcommand !== 'NAK') {
    return undefined
  }

  const hasContinuation = message.params[2] === '*'
  const capsString = hasContinuation ? (message.params[3] ?? '') : (message.params[2] ?? '')

  return {
    hasContinuation,
    names: parseCapNames(capsString),
    subcommand,
  }
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
  return btoa(`\u0000${username}\u0000${password}`)
}

// Base64 payload must be split into ≤400-byte AUTHENTICATE commands.
// If the final chunk is exactly 400 bytes, a trailing AUTHENTICATE + is
// required to signal end-of-response.
function chunkPayload(base64: string): string[] {
  const CHUNK_SIZE = 400
  const chunks: string[] = []

  for (let i = 0; i < base64.length; i += CHUNK_SIZE) {
    chunks.push(base64.slice(i, i + CHUNK_SIZE))
  }

  // Final chunk of exactly CHUNK_SIZE bytes needs a trailing "+" marker.
  if (chunks.at(-1)?.length === CHUNK_SIZE) {
    chunks.push('+')
  }

  return chunks
}

type RegistrationContext = {
  availableCaps: Set<string>
  config: Runtime['config']
  runtime: Runtime
}

type RegistrationStateContext = RegistrationContext & {
  capMessage: ParsedCapMessage
  message: IrcMessage
  state: State
}

// 001/004 are registration facts, not CAP/SASL phase transitions. We observe
// them independently so the phase machine can stay focused on negotiation.
function observeRegistrationMetadata(runtime: Runtime, message: IrcMessage): boolean {
  // 001 RPL_WELCOME confirms registration. The first param is the assigned
  // nickname (may differ from what we requested). The trailing param may
  // contain nick!user@host.
  if (message.command === runtime.numerics.RPL_WELCOME) {
    const self = runtime.parseSource(message.params.at(-1))

    // 001 guarantees the assigned initial nick. Some networks also include
    // nick!user@host in the trailing welcome text, which we treat as
    // best-effort enrichment rather than a protocol guarantee.
    const [nick] = message.params
    if (nick !== undefined && nick.length > 0) {
      runtime.connectionState.nick = nick
    }
    if (self.user !== undefined) {
      runtime.connectionState.user = self.user
    }
    if (self.host !== undefined) {
      runtime.connectionState.host = self.host
    }
    if (message.source !== undefined && message.source.length > 0) {
      runtime.connectionState.serverHost = message.source
    }

    runtime.connectionState.registered = true
    runtime.emit('registered')
    return true
  }

  // 004 RPL_MYINFO is part of the required post-registration burst.
  if (message.command === runtime.numerics.RPL_MYINFO) {
    runtime.connectionState.serverVersion =
      message.params[2] ?? runtime.connectionState.serverVersion
    return true
  }

  return false
}

// CAP bookkeeping is observational: LS grows the available set and ACK mutates
// active caps. These updates stay separate from the narrower phase transitions.
function observeCapabilityBookkeeping(
  { availableCaps, runtime }: RegistrationContext,
  capMessage: ParsedCapMessage,
): void {
  if (capMessage?.subcommand === 'LS') {
    for (const name of capMessage.names) {
      availableCaps.add(name)
    }
    return
  }

  if (capMessage?.subcommand === 'ACK') {
    applyAckCaps(runtime, capMessage.names)
  }
}

function handleCapLs({
  availableCaps,
  capMessage,
  config,
  runtime,
  state,
}: RegistrationStateContext): State | undefined {
  // CAP message format (server-sent):
  //   CAP <nick> <subcommand> [*] :<caps>
  // params[0] = nick (or *), params[1] = subcommand,
  // params[2] = * (continuation) or caps string,
  // params[3] = caps string (when continuation).
  if (capMessage?.subcommand !== 'LS') {
    return undefined
  }

  // Continuation lines are just accumulation — stay in current state.
  if (capMessage.hasContinuation) {
    return state
  }

  // Only the initial registration LS should decide whether we request any
  // capabilities or finish negotiation immediately.
  if (state !== 'collecting_ls') {
    return state
  }

  const capsToRequest = config.requestedCapabilities.filter((cap) => availableCaps.has(cap))

  if (capsToRequest.length === 0) {
    runtime.send('CAP', 'END')
    return 'done'
  }

  runtime.send({
    command: 'CAP',
    params: ['REQ', capsToRequest.join(' ')],
  })
  return 'awaiting_ack'
}

function handleCapAck({
  capMessage,
  config,
  runtime,
  state,
}: RegistrationStateContext): State | undefined {
  if (capMessage?.subcommand !== 'ACK') {
    return undefined
  }

  // Continuation lines are just accumulation — stay in current state.
  if (capMessage.hasContinuation) {
    return state
  }

  // Only the ACK for our registration REQ should advance registration.
  if (state !== 'awaiting_ack') {
    return state
  }

  // SASL must complete before CAP END. If the server acknowledged sasl and we
  // have credentials, begin authentication.
  if (config.sasl && runtime.activeCaps.has('sasl')) {
    runtime.send('AUTHENTICATE', 'PLAIN')
    return 'authenticating'
  }

  runtime.send('CAP', 'END')
  return 'done'
}

function handleCapNak({ capMessage, state }: RegistrationStateContext): State | undefined {
  if (capMessage?.subcommand !== 'NAK') {
    return undefined
  }

  // Only the NAK for our registration REQ should terminate this machine.
  if (state !== 'awaiting_ack') {
    return state
  }

  return 'error'
}

function handleAuthenticate({
  config,
  message,
  runtime,
  state,
}: RegistrationStateContext): State | undefined {
  // Server accepts our PLAIN mechanism and is ready for the payload.
  if (state !== 'authenticating' || message.command !== 'AUTHENTICATE') {
    return undefined
  }

  if (message.params[0] !== '+') {
    return state
  }

  const saslConfig = config.sasl
  if (!saslConfig) {
    return state
  }

  const payload = encodeSaslPlain(saslConfig.username, saslConfig.password)
  for (const chunk of chunkPayload(payload)) {
    runtime.send('AUTHENTICATE', chunk)
  }
  return 'sending_payload'
}

function handleSaslOutcome({
  message,
  runtime,
  state,
}: RegistrationStateContext): State | undefined {
  // 903 RPL_SASLSUCCESS: authentication succeeded.
  if (state === 'sending_payload' && message.command === runtime.numerics.RPL_SASLSUCCESS) {
    runtime.send('CAP', 'END')
    return 'done'
  }

  // 902 ERR_NICKLOCKED: account locked or administratively unavailable.
  if (state === 'sending_payload' && message.command === runtime.numerics.ERR_NICKLOCKED) {
    runtime.emit('error', new Error('SASL authentication failed: account locked (902)'))
    return 'error'
  }

  // 904 ERR_SASLFAIL: invalid credentials or general SASL failure.
  if (
    (state === 'authenticating' || state === 'sending_payload') &&
    message.command === runtime.numerics.ERR_SASLFAIL
  ) {
    runtime.emit('error', new Error('SASL authentication failed (904)'))
    return 'error'
  }

  // 905 ERR_SASLTOOLONG: client-sent AUTHENTICATE data exceeded server limit.
  if (state === 'sending_payload' && message.command === runtime.numerics.ERR_SASLTOOLONG) {
    runtime.emit('error', new Error('SASL authentication failed: message too long (905)'))
    return 'error'
  }

  // 908 RPL_SASLMECHS: server rejected mechanism — listed available ones.
  if (state === 'authenticating' && message.command === runtime.numerics.RPL_SASLMECHS) {
    runtime.emit('error', new Error('SASL PLAIN not supported by server (908)'))
    return 'error'
  }

  return undefined
}

function advanceRegistrationState(context: RegistrationStateContext): State {
  return (
    handleCapLs(context) ??
    handleCapAck(context) ??
    handleCapNak(context) ??
    handleAuthenticate(context) ??
    handleSaslOutcome(context) ??
    context.state
  )
}

export function registration(runtime: Runtime): void {
  const { config } = runtime
  let state: State = 'collecting_ls'
  const availableCaps = new Set<string>()

  // Registration order per spec: CAP LS, PASS, NICK, USER.
  // CAP LS suspends registration server-side until CAP END.
  runtime.on('register', () => {
    runtime.send('CAP', 'LS', '302')
    if (config.password !== undefined) {
      runtime.send('PASS', config.password)
    }
    runtime.send('NICK', config.nick)
    runtime.send({
      command: 'USER',
      params: [config.user, '0', '*', config.realname],
    })
  })

  // State diagram is documented in state-machine.md. Unrecognised messages
  // in any state are ignored — the machine stays put and waits.
  runtime.on('message', (message) => {
    if (observeRegistrationMetadata(runtime, message)) {
      return
    }

    if (state === 'done' || state === 'error') {
      return
    }

    const capMessage = parseCapMessage(message)

    observeCapabilityBookkeeping({ availableCaps, config, runtime }, capMessage)

    state = advanceRegistrationState({
      availableCaps,
      capMessage,
      config,
      message,
      runtime,
      state,
    })
  })
}
