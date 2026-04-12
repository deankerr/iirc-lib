import { type Casemapper, casemapping, defaultCasemapper } from './casemapping'

const PREFIX_REGEX = /^\(([^)]*)\)(.*)$/

export type Isupport = {
  readonly _state: Map<string, string | true>
  apply(tokens: string[]): void
  get(key: string): string | true | undefined
  has(key: string): boolean

  // Typed getters with protocol defaults
  readonly casemapper: Casemapper
  readonly chantypes: string
  readonly network: string | undefined
  readonly prefix: { modes: string; prefixes: string }
  readonly nicklen: number
  readonly userlen: number
  readonly hostlen: number

  prefixLen(nick: string): number
  maxTextBytes(nick: string, command: string, target: string): number
}

export function createIsupport(): Isupport {
  const state = new Map<string, string | true>()

  return {
    _state: state,

    get(key: string) {
      return state.get(key.toUpperCase())
    },

    has(key: string) {
      return state.has(key.toUpperCase())
    },

    apply(tokens: string[]) {
      for (const token of tokens) {
        if (token.startsWith('-')) {
          state.delete(token.slice(1).toUpperCase())
          continue
        }

        const eqIndex = token.indexOf('=')
        if (eqIndex === -1) {
          const upper = token.toUpperCase()
          // EXCEPTS and INVEX have implicit default values when no = present
          if (upper === 'EXCEPTS') {
            state.set(upper, 'e')
          } else if (upper === 'INVEX') {
            state.set(upper, 'I')
          } else {
            state.set(upper, true)
          }
        } else {
          const key = token.slice(0, eqIndex).toUpperCase()
          const value = decodeValue(token.slice(eqIndex + 1))
          state.set(key, value)
        }
      }
    },

    get casemapper() {
      const v = state.get('CASEMAPPING')
      if (v === 'ascii' || v === 'rfc1459' || v === 'rfc1459-strict') {
        return casemapping[v]
      }
      return defaultCasemapper
    },

    get chantypes() {
      const v = state.get('CHANTYPES')
      // If published with value, use it (even empty string)
      if (typeof v === 'string') return v
      // If not published at all, default per spec
      return '#&'
    },

    get network() {
      const v = state.get('NETWORK')
      return typeof v === 'string' ? v : undefined
    },

    get prefix() {
      const v = state.get('PREFIX')
      if (typeof v === 'string') {
        const match = v.match(PREFIX_REGEX)
        if (match?.[1] !== undefined && match[2] !== undefined) {
          return { modes: match[1], prefixes: match[2] }
        }
      }
      // Default per spec
      return { modes: 'ov', prefixes: '@+' }
    },

    get nicklen() {
      return numericValue(state.get('NICKLEN'), 9)
    },

    get userlen() {
      return numericValue(state.get('USERLEN'), 10)
    },

    get hostlen() {
      return numericValue(state.get('HOSTLEN'), 63)
    },

    prefixLen(nick: string) {
      const nickLen = Buffer.byteLength(nick, 'utf8')
      // :nick!user@host(space) — worst-case user includes ~ ident prefix
      return 1 + nickLen + 1 + this.userlen + 1 + 1 + this.hostlen + 1
    },

    maxTextBytes(nick: string, command: string, target: string) {
      return 510 - this.prefixLen(nick) - command.length - 1 - Buffer.byteLength(target, 'utf8') - 2
    },
  }
}

function decodeValue(raw: string): string {
  return raw.replace(/\\x20/gi, ' ').replace(/\\x5C/gi, '\\').replace(/\\x3D/gi, '=')
}

function numericValue(v: string | true | undefined, fallback: number): number {
  if (typeof v === 'string') {
    const n = Number.parseInt(v, 10)
    if (!Number.isNaN(n) && n > 0) return n
  }
  return fallback
}
