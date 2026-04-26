import type { Runtime } from '../runtime'

// ISUPPORT defaults per the Modern IRC Protocol spec. Clients SHOULD assume
// these values until the server explicitly advertises the parameter.
// Ref: https://modern.ircdocs.horse/#rpl_isupport-parameters
const ISUPPORT_DEFAULTS = {
  CASEMAPPING: 'rfc1459',
  CHANMODES: 'b,k,l,imnpst',
  CHANTYPES: '#&',
  MODES: '3',
  PREFIX: '(ov)@+',
} as const

export class IsupportMap {
  private readonly values = new Map<string, string | true>()

  // Core parameters with spec-defined defaults. Always return a string.
  get CASEMAPPING(): string {
    return this.stringOrDefault('CASEMAPPING')
  }

  get CHANMODES(): string {
    return this.stringOrDefault('CHANMODES')
  }

  get CHANTYPES(): string {
    return this.stringOrDefault('CHANTYPES')
  }

  get MODES(): string {
    return this.stringOrDefault('MODES')
  }

  get PREFIX(): string {
    return this.stringOrDefault('PREFIX')
  }

  // Arbitrary parameter lookup. Returns undefined for unadvertised keys,
  // string for valued parameters, true for boolean flags (e.g. SAFELIST).
  get(key: string): string | true | undefined {
    return this.values.get(key)
  }

  set(key: string, value: string | true): void {
    this.values.set(key, value)
  }

  delete(key: string): boolean {
    return this.values.delete(key)
  }

  clear(): void {
    this.values.clear()
  }

  private stringOrDefault(key: keyof typeof ISUPPORT_DEFAULTS): string {
    const value = this.values.get(key)
    if (typeof value === 'string') {
      return value
    }

    return ISUPPORT_DEFAULTS[key]
  }
}

export function isupport(runtime: Runtime): void {
  // ISUPPORT parameters that carry a default "empty value" when advertised
  // without =value. Per the spec: "If an 'empty value' is listed, this is the
  // value when the parameter is advertised without a value."
  // Ref: https://modern.ircdocs.horse/#rpl_isupport-parameters
  const EMPTY_VALUE_DEFAULTS: Record<string, string> = {
    EXCEPTS: 'e',
    INVEX: 'I',
  }

  // ISUPPORT values may contain escape sequences. The spec defines three:
  //   \x20 → space (" ", 0x20)
  //   \x5C → backslash ("\", 0x5C)
  //   \x3D → equal ("=", 0x3D)
  // Ref: https://modern.ircdocs.horse/#rpl_isupport-parameters
  function unescapeIsupportValue(value: string): string {
    let result = ''
    let i = 0
    while (i < value.length) {
      if (value[i] === '\\' && i + 3 < value.length && value[i + 1] === 'x') {
        const hex = value.slice(i + 2, i + 4)
        const code = Number.parseInt(hex, 16)
        if (!Number.isNaN(code)) {
          result += String.fromCodePoint(code)
          i += 4
          continue
        }
      }
      result += value[i]
      i += 1
    }
    return result
  }

  runtime.on('message', (message) => {
    if (message.command !== runtime.numerics.RPL_ISUPPORT) {
      return
    }

    for (const token of message.params.slice(1, -1)) {
      // Negation tokens remove a previously advertised parameter. The client
      // MUST revert to default behaviour. The token MUST NOT contain a value.
      if (token.startsWith('-')) {
        runtime.isupport.delete(token.slice(1).toUpperCase())
        continue
      }

      const equalsIndex = token.indexOf('=')
      if (equalsIndex === -1) {
        // Token advertised without a value. Some parameters define an "empty
        // value" that is the semantic default (e.g. EXCEPTS → "e", INVEX → "I").
        // Others are true boolean flags (e.g. SAFELIST) and stored as `true`.
        const key = token.toUpperCase()
        const emptyDefault = EMPTY_VALUE_DEFAULTS[key]
        runtime.isupport.set(key, emptyDefault ?? true)
        continue
      }

      const key = token.slice(0, equalsIndex).toUpperCase()
      const rawValue = token.slice(equalsIndex + 1)
      runtime.isupport.set(key, unescapeIsupportValue(rawValue))
    }
  })
}
