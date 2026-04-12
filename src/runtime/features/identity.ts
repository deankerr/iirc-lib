import { Numeric } from '../numerics'
import type { Runtime } from '../runtime'
import { getConnectionState, setConnectionState, updateConnectionState } from './state'

export function installIdentityFeature(runtime: Runtime): void {
  runtime.on('message', (message) => {
    switch (message.command) {
      case Numeric.RPL_WELCOME: {
        const state = getConnectionState(runtime)
        const nick = message.params[0] ?? state.attemptedNick

        setConnectionState(runtime, {
          ...state,
          nick,
          attemptedNick: nick,
          registered: true,
          serverHost: message.source ?? state.serverHost,
        })

        runtime.status = 'registered'
        runtime.emit('registered')
        break
      }

      case Numeric.RPL_MYINFO:
        updateConnectionState(runtime, (state) => ({
          ...state,
          serverVersion: message.params[2] ?? state.serverVersion,
        }))
        break

      case 'NICK': {
        const state = getConnectionState(runtime)
        const sourceNick = parseSourceNick(message.source)
        const currentNick = state.nick ?? state.attemptedNick

        if (!sourceNick || !currentNick) break
        if (foldAscii(sourceNick) !== foldAscii(currentNick)) break

        const nextNick = message.params[0]
        if (!nextNick) break

        updateConnectionState(runtime, (current) => ({
          ...current,
          nick: nextNick,
          attemptedNick: nextNick,
        }))
        break
      }

      case Numeric.RPL_LOGGEDIN:
        updateConnectionState(runtime, (state) => ({
          ...state,
          account: message.params[2] ?? state.account,
        }))
        break

      case Numeric.RPL_LOGGEDOUT:
        updateConnectionState(runtime, (state) => ({
          ...state,
          account: undefined,
        }))
        break

      default:
        break
    }
  })
}

function parseSourceNick(source: string | undefined): string | undefined {
  if (!source) return undefined
  const bangIndex = source.indexOf('!')
  const atIndex = source.indexOf('@')

  if (bangIndex !== -1) return source.slice(0, bangIndex)
  if (atIndex !== -1) return source.slice(0, atIndex)
  return source
}

function foldAscii(value: string): string {
  return value.toUpperCase()
}
