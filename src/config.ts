// Consumer-supplied config, validated by hand at the boundary. This is the
// only place the library ever validated data with a schema library, and the
// checks are small enough that hand-rolling them keeps the package
// dependency-free — a property worth more to consumers than the schema was
// to us.

export interface SaslConfig {
  password: string
  username: string
}

export interface RuntimeInputConfig {
  nick: string
  password?: string | undefined
  realname?: string | undefined
  requestedCapabilities?: string[] | undefined
  sasl?: SaslConfig | undefined
  sendDelayMs?: number | undefined
  user?: string | undefined
}

export interface RuntimeConfig {
  nick: string
  password?: string | undefined
  realname: string
  requestedCapabilities: string[]
  sasl?: SaslConfig | undefined
  sendDelayMs: number
  user: string
}

const DEFAULT_DELAYMS = 1500
const DEFAULT_CAPABILITIES = ['message-tags']

// Fail loudly at the boundary: a bad config should throw here with a clear
// message, not surface as a cryptic server rejection mid-registration.
function invalid(message: string): never {
  throw new TypeError(`Invalid config: ${message}`)
}

// Trim a string field, treating a whitespace-only value as absent so that
// fallback logic (e.g. nick → user) has a chance to run.
function normalise(value: string | undefined, name: string): string | undefined {
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== 'string') {
    invalid(`${name} must be a string`)
  }
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

// SASL: the username is trimmed like other identifiers, but the password is
// preserved byte-for-byte — surrounding whitespace could be intentional.
function resolveSasl(sasl: RuntimeInputConfig['sasl']): SaslConfig | undefined {
  if (sasl === undefined) {
    return undefined
  }
  if (typeof sasl !== 'object' || sasl === null) {
    invalid('sasl must be an object')
  }
  if (typeof sasl.username !== 'string') {
    invalid('sasl.username must be a string')
  }
  if (typeof sasl.password !== 'string') {
    invalid('sasl.password must be a string')
  }
  const username = sasl.username.trim()
  if (username === '') {
    invalid('sasl.username is required when sasl is configured')
  }
  if (sasl.password === '') {
    invalid('sasl.password is required when sasl is configured')
  }
  return { password: sasl.password, username }
}

export function resolveConfig(input: RuntimeInputConfig): RuntimeConfig {
  // TypeScript enforces the shape for TS consumers; the runtime checks catch
  // JS consumers and dynamic values (env vars, parsed JSON) at the boundary.
  if (typeof input !== 'object' || input === null) {
    invalid('config must be an object')
  }
  if (typeof input.nick !== 'string') {
    invalid('nick must be a string')
  }

  // Trim identifiers and resolve the fields that fall back to nick. nick backs
  // those fallbacks, so it must survive trimming with something left over.
  const nick = input.nick.trim()
  if (nick === '') {
    invalid('nick is required and must be non-empty')
  }
  const user = normalise(input.user, 'user') ?? nick
  const realname = normalise(input.realname, 'realname') ?? nick
  const password = normalise(input.password, 'password')

  // sendDelayMs: reject NaN and negatives; 0 is a valid "no delay".
  const sendDelayMs = input.sendDelayMs ?? DEFAULT_DELAYMS
  if (typeof sendDelayMs !== 'number' || Number.isNaN(sendDelayMs)) {
    invalid('sendDelayMs must be a number')
  }
  if (sendDelayMs < 0) {
    invalid('sendDelayMs must be non-negative')
  }

  const sasl = resolveSasl(input.sasl)

  // Consumer capabilities merge over the defaults rather than replacing them:
  // the default set backs the library's own enrichment (message-tags), and
  // losing it silently would degrade events.
  const requestedCapabilities = [...DEFAULT_CAPABILITIES]
  if (input.requestedCapabilities !== undefined) {
    if (!Array.isArray(input.requestedCapabilities)) {
      invalid('requestedCapabilities must be an array of strings')
    }
    for (const cap of input.requestedCapabilities) {
      if (typeof cap !== 'string') {
        invalid('requestedCapabilities must be an array of strings')
      }
      const trimmed = cap.trim()
      if (trimmed !== '' && !requestedCapabilities.includes(trimmed)) {
        requestedCapabilities.push(trimmed)
      }
    }
  }

  // Auto-include the 'sasl' capability when SASL auth is configured.
  if (sasl && !requestedCapabilities.includes('sasl')) {
    requestedCapabilities.push('sasl')
  }

  return {
    nick,
    password,
    realname,
    requestedCapabilities,
    sendDelayMs,
    user,
    ...(sasl ? { sasl } : {}),
  }
}
