import type { IsupportValue, Runtime } from '../runtime'

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
      const code = parseInt(hex, 16)
      if (!Number.isNaN(code)) {
        result += String.fromCharCode(code)
        i += 4
        continue
      }
    }
    result += value[i]
    i++
  }
  return result
}

export function isupport(runtime: Runtime): void {
  runtime.on('message', (message) => {
    if (message.command !== runtime.numerics.RPL_ISUPPORT) return

    for (const token of message.params.slice(1, -1)) {
      applyIsupportToken(runtime.isupport, token)
    }
  })
}

function applyIsupportToken(map: Map<string, IsupportValue>, token: string): void {
  // Negation tokens remove a previously advertised parameter. The client
  // MUST revert to default behaviour. The token MUST NOT contain a value.
  if (token.startsWith('-')) {
    map.delete(token.slice(1).toUpperCase())
    return
  }

  const equalsIndex = token.indexOf('=')
  if (equalsIndex === -1) {
    // Token advertised without a value. Some parameters define an "empty
    // value" that is the semantic default (e.g. EXCEPTS → "e", INVEX → "I").
    // Others are true boolean flags (e.g. SAFELIST) and stored as `true`.
    const key = token.toUpperCase()
    const emptyDefault = EMPTY_VALUE_DEFAULTS[key]
    map.set(key, emptyDefault ?? true)
    return
  }

  const key = token.slice(0, equalsIndex).toUpperCase()
  const rawValue = token.slice(equalsIndex + 1)
  map.set(key, unescapeIsupportValue(rawValue))
}
