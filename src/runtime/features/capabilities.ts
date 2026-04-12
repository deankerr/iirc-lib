import type { Runtime } from '../runtime'
import { parseCapMessage } from './cap-message'
import { builtinCapabilities } from './capability-registry'
import { getCapabilityState, setCapabilityState } from './state'

export function installCapabilityFeature(runtime: Runtime): void {
  setCapabilityState(runtime, {
    supported: false,
    lsComplete: false,
    endSent: false,
    available: new Map(),
    enabled: new Set(),
    desired: new Set(getDesiredCapabilities(runtime)),
    pendingAck: [],
    pendingNak: [],
  })

  runtime.on('message', (message) => {
    const cap = parseCapMessage(message)
    if (!cap) return

    const state = getCapabilityState(runtime)

    switch (cap.subcommand) {
      case 'LS': {
        const available = new Map(state.available)
        const enabled = new Set(state.enabled)
        for (const token of cap.tokens) {
          available.set(token.name, token.value ?? true)
        }
        enabled.add('cap-notify')

        const next = {
          ...state,
          supported: true,
          lsComplete: !cap.continuation,
          available,
          enabled,
        }

        setCapabilityState(runtime, next)

        if (cap.continuation) return

        const wanted = [...next.desired].filter(
          (name) => available.has(name) && name !== 'cap-notify',
        )
        if (wanted.length > 0) {
          runtime.send('CAP', 'REQ', wanted.join(' '))
          return
        }

        finishCapabilityNegotiation(runtime)
        return
      }

      case 'ACK': {
        const ackedNames = [...state.pendingAck, ...cap.tokens.map((token) => token.name)]
        if (cap.continuation) {
          setCapabilityState(runtime, {
            ...state,
            pendingAck: ackedNames,
          })
          return
        }

        const enabled = new Set(state.enabled)
        for (const name of ackedNames) {
          if (name.startsWith('-')) {
            enabled.delete(name.slice(1))
          } else {
            enabled.add(name)
          }
        }

        const next = {
          ...state,
          enabled,
          pendingAck: [],
        }

        setCapabilityState(runtime, next)

        if (enabled.has('sasl') && runtime.getConfig().sasl) {
          return
        }

        finishCapabilityNegotiation(runtime)
        return
      }

      case 'NAK': {
        const rejectedNames = [...state.pendingNak, ...cap.tokens.map((token) => token.name)]
        if (cap.continuation) {
          setCapabilityState(runtime, {
            ...state,
            pendingNak: rejectedNames,
          })
          return
        }

        if (runtime.getConfig().sasl?.required && rejectedNames.some((name) => name === 'sasl')) {
          runtime.emit('error', new Error('Server rejected required SASL capability'))
        }

        setCapabilityState(runtime, {
          ...state,
          pendingNak: [],
        })
        finishCapabilityNegotiation(runtime)
        return
      }

      case 'NEW': {
        const available = new Map(state.available)
        for (const token of cap.tokens) {
          available.set(token.name, token.value ?? true)
        }

        const next = {
          ...state,
          supported: true,
          available,
        }
        setCapabilityState(runtime, next)

        const wanted = cap.tokens
          .map((token) => token.name)
          .filter(
            (name) => next.desired.has(name) && !next.enabled.has(name) && name !== 'cap-notify',
          )

        if (wanted.length > 0) {
          runtime.send('CAP', 'REQ', wanted.join(' '))
        }
        return
      }

      case 'DEL': {
        const available = new Map(state.available)
        const enabled = new Set(state.enabled)

        for (const token of cap.tokens) {
          available.delete(token.name)
          enabled.delete(token.name)
        }

        setCapabilityState(runtime, {
          ...state,
          available,
          enabled,
        })
        return
      }

      default:
        return
    }
  })
}

function getDesiredCapabilities(runtime: Runtime): string[] {
  const requested = new Set<string>(builtinCapabilities)

  for (const capability of runtime.getConfig().requestedCapabilities ?? []) {
    requested.add(capability)
  }

  if (runtime.getConfig().sasl) {
    requested.add('sasl')
  }

  return [...requested]
}

export function finishCapabilityNegotiation(runtime: Runtime): void {
  const state = getCapabilityState(runtime)
  if (!state.supported || state.endSent) return

  setCapabilityState(runtime, {
    ...state,
    endSent: true,
  })

  runtime.send('CAP', 'END')
}
