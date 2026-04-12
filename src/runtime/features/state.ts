import type { Runtime } from '../runtime'

export const CONNECTION_STATE_KEY = 'connection'
export const ISUPPORT_STATE_KEY = 'isupport'
export const CAPABILITIES_STATE_KEY = 'capabilities'
export const SASL_STATE_KEY = 'sasl'

export type ConnectionState = {
  baseNick: string
  attemptedNick: string
  nickAttempt: number
  nick?: string
  user: string
  realname: string
  password?: string
  registered: boolean
  serverHost?: string
  serverVersion?: string
  account?: string
}

export type IsupportValue = string | true

export type CapabilityState = {
  supported: boolean
  lsComplete: boolean
  endSent: boolean
  available: Map<string, string | true>
  enabled: Set<string>
  desired: Set<string>
  pendingAck: string[]
  pendingNak: string[]
}

export type SaslState = {
  mechanism: string
  availableMechanisms: string[]
  started: boolean
  waitingForChallenge: boolean
  completed: boolean
  successful: boolean
  failed: boolean
  required: boolean
}

export function getConnectionState(runtime: Runtime): ConnectionState {
  return (
    runtime.getState<ConnectionState>(CONNECTION_STATE_KEY) ?? {
      baseNick: runtime.getConfig().nick,
      attemptedNick: runtime.getConfig().nick,
      nickAttempt: 0,
      user: runtime.getConfig().user,
      realname: runtime.getConfig().realname,
      password: runtime.getConfig().password,
      registered: false,
    }
  )
}

export function setConnectionState(runtime: Runtime, state: ConnectionState): ConnectionState {
  return runtime.setState(CONNECTION_STATE_KEY, state)
}

export function updateConnectionState(
  runtime: Runtime,
  updater: (state: ConnectionState) => ConnectionState,
): ConnectionState {
  return runtime.updateState(CONNECTION_STATE_KEY, (state) =>
    updater(getConnectionStateFromMaybe(runtime, state)),
  )
}

export function getIsupportState(runtime: Runtime): ReadonlyMap<string, IsupportValue> {
  return runtime.getState<ReadonlyMap<string, IsupportValue>>(ISUPPORT_STATE_KEY) ?? new Map()
}

export function setIsupportState(
  runtime: Runtime,
  state: ReadonlyMap<string, IsupportValue>,
): ReadonlyMap<string, IsupportValue> {
  return runtime.setState(ISUPPORT_STATE_KEY, state)
}

export function getCapabilityState(runtime: Runtime): CapabilityState {
  return (
    runtime.getState<CapabilityState>(CAPABILITIES_STATE_KEY) ?? {
      supported: false,
      lsComplete: false,
      endSent: false,
      available: new Map(),
      enabled: new Set(),
      desired: new Set(),
      pendingAck: [],
      pendingNak: [],
    }
  )
}

export function setCapabilityState(runtime: Runtime, state: CapabilityState): CapabilityState {
  return runtime.setState(CAPABILITIES_STATE_KEY, state)
}

export function updateCapabilityState(
  runtime: Runtime,
  updater: (state: CapabilityState) => CapabilityState,
): CapabilityState {
  return runtime.updateState(CAPABILITIES_STATE_KEY, (state) =>
    updater(
      state ?? {
        supported: false,
        lsComplete: false,
        endSent: false,
        available: new Map(),
        enabled: new Set(),
        desired: new Set(),
        pendingAck: [],
        pendingNak: [],
      },
    ),
  )
}

export function getSaslState(runtime: Runtime): SaslState | undefined {
  return runtime.getState<SaslState>(SASL_STATE_KEY)
}

export function setSaslState(runtime: Runtime, state: SaslState): SaslState {
  return runtime.setState(SASL_STATE_KEY, state)
}

export function updateSaslState(
  runtime: Runtime,
  updater: (state: SaslState | undefined) => SaslState,
): SaslState {
  return runtime.updateState(SASL_STATE_KEY, updater)
}

function getConnectionStateFromMaybe(
  runtime: Runtime,
  state: ConnectionState | undefined,
): ConnectionState {
  return (
    state ?? {
      baseNick: runtime.getConfig().nick,
      attemptedNick: runtime.getConfig().nick,
      nickAttempt: 0,
      user: runtime.getConfig().user,
      realname: runtime.getConfig().realname,
      password: runtime.getConfig().password,
      registered: false,
    }
  )
}
