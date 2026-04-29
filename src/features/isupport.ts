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

// Parse a PREFIX value like "(ov)@+" into a mode-letter string and a
// prefix-character → mode-letter map.
function parsePrefix(value: string): { modes: string; prefixToMode: Map<string, string> } {
  const match = /^\(([^)]*)\)(.*)$/.exec(value)
  const modes = match?.[1] ?? ''
  const prefixes = match?.[2] ?? ''
  const prefixToMode = new Map<string, string>()

  for (let index = 0; index < prefixes.length; index += 1) {
    prefixToMode.set(prefixes[index] ?? '', modes[index] ?? '')
  }

  return { modes, prefixToMode }
}

// Parse a CHANMODES value like "b,k,l,imnpst" into a four-element tuple of
// mode groups: [typeA, typeB, typeC, typeD].
function parseChanModes(value: string): [string, string, string, string] {
  const groups = value.split(',')
  return [groups[0] ?? '', groups[1] ?? '', groups[2] ?? '', groups[3] ?? '']
}

export class IsupportMap {
  private readonly values = new Map<string, string | true>()

  // Cached core strings — recomputed whenever set/delete touches them.
  private casemapping: string = ISUPPORT_DEFAULTS.CASEMAPPING
  private chanmodes: string = ISUPPORT_DEFAULTS.CHANMODES
  private chantypes: string = ISUPPORT_DEFAULTS.CHANTYPES
  private modes: string = ISUPPORT_DEFAULTS.MODES
  private prefix: string = ISUPPORT_DEFAULTS.PREFIX

  // Cached derived values — recomputed alongside the strings they depend on.
  private prefixToModeCached: ReadonlyMap<string, string>
  private prefixModesCached: string
  private chanModeGroupsCached: [string, string, string, string]

  constructor() {
    const parsed = parsePrefix(this.prefix)
    this.prefixToModeCached = parsed.prefixToMode
    this.prefixModesCached = parsed.modes
    this.chanModeGroupsCached = parseChanModes(this.chanmodes)
  }

  // --- Core parameter access ---

  get CASEMAPPING(): string {
    return this.casemapping
  }

  get CHANMODES(): string {
    return this.chanmodes
  }

  get CHANTYPES(): string {
    return this.chantypes
  }

  get MODES(): string {
    return this.modes
  }

  get PREFIX(): string {
    return this.prefix
  }

  // --- Derived access ---

  // Prefix character → mode letter (e.g. '@' → 'o', '+' → 'v').
  get prefixToMode(): ReadonlyMap<string, string> {
    return this.prefixToModeCached
  }

  // PREFIX mode letters as a string (e.g. "ov").
  get prefixModes(): string {
    return this.prefixModesCached
  }

  // CHANMODES split into [typeA, typeB, typeC, typeD] groups.
  get chanModeGroups(): [string, string, string, string] {
    return this.chanModeGroupsCached
  }

  // Whether a target string is a channel name per the advertised CHANTYPES.
  isChannel(target: string): boolean {
    return this.chantypes.includes(target[0] ?? '')
  }

  // --- Arbitrary parameter lookup ---

  get(key: string): string | true | undefined {
    return this.values.get(key)
  }

  set(key: string, value: string | true): void {
    this.values.set(key, value)
    this.recompute(key)
  }

  delete(key: string): boolean {
    const deleted = this.values.delete(key)
    this.recompute(key)
    return deleted
  }

  clear(): void {
    this.values.clear()
    this.recomputeAll()
  }

  // --- Private ---

  private recompute(key: string): void {
    const upperKey = key.toUpperCase()

    if (upperKey === 'CASEMAPPING') {
      this.casemapping = this.stringOrDefault('CASEMAPPING')
    } else if (upperKey === 'CHANMODES') {
      this.chanmodes = this.stringOrDefault('CHANMODES')
      this.chanModeGroupsCached = parseChanModes(this.chanmodes)
    } else if (upperKey === 'CHANTYPES') {
      this.chantypes = this.stringOrDefault('CHANTYPES')
    } else if (upperKey === 'MODES') {
      this.modes = this.stringOrDefault('MODES')
    } else if (upperKey === 'PREFIX') {
      this.prefix = this.stringOrDefault('PREFIX')
      const parsed = parsePrefix(this.prefix)
      this.prefixToModeCached = parsed.prefixToMode
      this.prefixModesCached = parsed.modes
    }
  }

  private recomputeAll(): void {
    this.casemapping = this.stringOrDefault('CASEMAPPING')
    this.chanmodes = this.stringOrDefault('CHANMODES')
    this.chantypes = this.stringOrDefault('CHANTYPES')
    this.modes = this.stringOrDefault('MODES')
    this.prefix = this.stringOrDefault('PREFIX')

    const parsed = parsePrefix(this.prefix)
    this.prefixToModeCached = parsed.prefixToMode
    this.prefixModesCached = parsed.modes
    this.chanModeGroupsCached = parseChanModes(this.chanmodes)
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
        const tokenKey = token.toUpperCase()
        const emptyDefault = EMPTY_VALUE_DEFAULTS[tokenKey]
        runtime.isupport.set(tokenKey, emptyDefault ?? true)
        continue
      }

      const tokenKey = token.slice(0, equalsIndex).toUpperCase()
      const rawValue = token.slice(equalsIndex + 1)
      runtime.isupport.set(tokenKey, unescapeIsupportValue(rawValue))
    }
  })
}
