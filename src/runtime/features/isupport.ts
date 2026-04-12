import { Numeric } from '../numerics'
import type { Runtime } from '../runtime'
import { getIsupportState, setIsupportState, type IsupportValue } from './state'

export function installIsupportFeature(runtime: Runtime): void {
  runtime.on('message', (message) => {
    if (message.command !== Numeric.RPL_ISUPPORT) return

    const next = new Map(getIsupportState(runtime))
    for (const token of message.params.slice(1, -1)) {
      applyIsupportToken(next, token)
    }

    setIsupportState(runtime, next)
  })
}

function applyIsupportToken(map: Map<string, IsupportValue>, token: string): void {
  if (token.startsWith('-')) {
    map.delete(token.slice(1).toUpperCase())
    return
  }

  const equalsIndex = token.indexOf('=')
  if (equalsIndex === -1) {
    map.set(token.toUpperCase(), true)
    return
  }

  const key = token.slice(0, equalsIndex).toUpperCase()
  const value = token.slice(equalsIndex + 1)
  map.set(key, value)
}
