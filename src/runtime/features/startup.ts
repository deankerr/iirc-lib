import { Numeric } from '../numerics'
import type { Runtime } from '../runtime'
import { getConnectionState, setConnectionState, updateConnectionState } from './state'

export function installStartupFeature(runtime: Runtime): void {
  const config = runtime.getConfig()

  setConnectionState(runtime, {
    ...getConnectionState(runtime),
    baseNick: config.nick,
    attemptedNick: config.nick,
    user: config.user,
    realname: config.realname,
    password: config.password,
  })

  runtime.on('attach', () => {
    const state = getConnectionState(runtime)

    runtime.send('CAP', 'LS', '302')
    if (state.password) {
      runtime.send('PASS', state.password)
    }
    runtime.send('NICK', state.attemptedNick)
    runtime.sendCommand({
      command: 'USER',
      params: [state.user, '0', '*', state.realname],
      trailing: true,
    })
  })

  runtime.on('message', (message) => {
    if (message.command === Numeric.RPL_WELCOME) {
      updateConnectionState(runtime, (state) => ({
        ...state,
        registered: true,
      }))
      return
    }

    if (message.command !== Numeric.ERR_NICKNAMEINUSE) return

    const state = getConnectionState(runtime)
    if (state.registered) return

    const nickAttempt = state.nickAttempt + 1
    const attemptedNick = `${state.baseNick}${nickAttempt + 1}`

    setConnectionState(runtime, {
      ...state,
      nickAttempt,
      attemptedNick,
    })

    runtime.send('NICK', attemptedNick)
  })
}
