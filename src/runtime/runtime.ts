import { EventEmitter } from 'node:events'
import type { Duplex } from 'node:stream'

import { installBuiltinFeatures, type RuntimeFeature } from './features'
import { TransportHarness } from './transport/transport-harness'
import type { IrcCommand, IrcMessage } from './transport/types'

export type SaslConfig = {
  mechanism?: 'PLAIN'
  username: string
  password: string
  authorizationIdentity?: string
  required?: boolean
}

export type RuntimeConfig = {
  nick: string
  user: string
  realname: string
  password?: string
  sendDelayMs?: number
  requestedCapabilities?: string[]
  sasl?: SaslConfig
}

export type RuntimeStatus = 'idle' | 'registering' | 'registered' | 'closed' | 'error'

export type RuntimeEvents = {
  attach: [stream: Duplex]
  line: [string]
  message: [IrcMessage]
  registered: []
  close: []
  error: [Error]
}

export class Runtime extends EventEmitter<RuntimeEvents> {
  status: RuntimeStatus

  private readonly harness: TransportHarness
  private readonly config: RuntimeConfig
  private readonly sharedState = new Map<string, unknown>()

  constructor(config: RuntimeConfig) {
    super()

    this.config = config
    this.harness = new TransportHarness({ sendDelayMs: config.sendDelayMs })
    this.status = 'idle'

    this.harness.on('line', (line) => this.emit('line', line))
    this.harness.on('message', (message) => this.emit('message', message))
    this.harness.on('close', () => this.handleClose())
    this.harness.on('error', (error) => this.handleError(error))

    installBuiltinFeatures(this)
  }

  attach(stream: Duplex): void {
    this.status = 'registering'
    this.harness.attach(stream)
    this.emit('attach', stream)
  }

  send(command: string, ...params: ReadonlyArray<string | undefined>): void {
    const definedParams = params.filter((param): param is string => param !== undefined)
    this.sendCommand({
      command,
      params: definedParams,
    })
  }

  sendCommand(command: IrcCommand): void {
    this.harness.send(command)
  }

  getConfig(): Readonly<RuntimeConfig> {
    return this.config
  }

  getState<T>(key: string): T | undefined {
    return this.sharedState.get(key) as T | undefined
  }

  setState<T>(key: string, value: T): T {
    this.sharedState.set(key, value)
    return value
  }

  updateState<T>(key: string, updater: (state: T | undefined) => T): T {
    const next = updater(this.getState<T>(key))
    this.sharedState.set(key, next)
    return next
  }

  install(feature: RuntimeFeature): void {
    feature(this)
  }

  private handleClose(): void {
    this.status = 'closed'
    this.emit('close')
  }

  private handleError(error: Error): void {
    this.status = 'error'
    this.emit('error', error)
  }
}
