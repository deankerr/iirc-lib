import { EventEmitter } from 'node:events'
import type { Duplex } from 'node:stream'

import { CaseFoldMap } from './case-fold-map'
import { resolveConfig } from './config'
import type { RuntimeConfig, RuntimeInputConfig } from './config'
import type { Channel } from './features/channel-tracker'
import { channelTracker } from './features/channel-tracker'
import { clientEvents } from './features/client-events'
import type { ClientEvent } from './features/client-events'
import { identity } from './features/identity'
import { IsupportMap, isupport } from './features/isupport'
import { ping } from './features/ping'
import { registration } from './features/registration'
import { Numeric } from './numerics'
import { Transport } from './transport'
import type { IrcCommand, IrcMessage } from './transport'

export type RuntimeFeature = (runtime: Runtime) => void

// Features are applied in order. clientEvents must precede any feature that
// subscribes to 'clientEvent', because EventEmitter delivers synchronously and
// a subscriber that has not yet been registered will miss events.
const defaultRuntimeFeatures: RuntimeFeature[] = [
  registration,
  ping,
  identity,
  isupport,
  clientEvents,
  channelTracker,
]

export type RuntimeEvents = {
  register: [stream: Duplex]
  message: [IrcMessage]
  clientEvent: [event: ClientEvent]
  registered: []
  close: []
  error: [Error]
}

export type ConnectionState = {
  user: string
  realname: string
  registered: boolean
  nick: string
  host?: string
  serverHost?: string
  serverVersion?: string
  account?: string
}

export type ParsedSource = {
  nick?: string
  user?: string
  host?: string
  isSelf: boolean
}

export class Runtime extends EventEmitter<RuntimeEvents> {
  readonly numerics = Numeric

  readonly config: RuntimeConfig
  readonly transport: Transport

  readonly connectionState: ConnectionState
  readonly activeCaps = new Set<string>()
  readonly isupport = new IsupportMap()
  readonly channels = new CaseFoldMap<Channel>((name) => this.caseFold(name))
  private started = false

  constructor(config: RuntimeConfig, transport: Transport, features = defaultRuntimeFeatures) {
    super()

    this.config = config
    this.connectionState = {
      nick: config.nick,
      realname: config.realname,
      registered: false,
      user: config.user,
    }

    this.transport = transport

    this.transport.on('message', (message) => this.emit('message', message))
    this.transport.on('close', () => {
      this.handleClose()
    })
    this.transport.on('error', (error) => {
      this.handleError(error)
    })

    for (const feature of features) {
      feature(this)
    }
  }

  // Registration is explicit so callers can observe transport I/O before the
  // initial CAP/NICK/USER burst begins.
  register(): void {
    if (this.started) {
      throw new Error('Runtime has already been registered')
    }

    this.started = true
    this.emit('register', this.transport.stream)
  }

  // Runtime exposes one outbound entry point with two call shapes:
  // a shorthand string + params form for common commands, and the canonical
  // IrcCommand object when callers already have a full command shape.
  send(command: string, ...params: ReadonlyArray<string | undefined>): void
  send(command: IrcCommand): void
  send(commandOrMessage: string | IrcCommand, ...params: ReadonlyArray<string | undefined>): void {
    if (typeof commandOrMessage === 'string') {
      const definedParams = params.filter((param): param is string => param !== undefined)
      this.transport.send({
        command: commandOrMessage,
        params: definedParams,
      })
      return
    }

    this.transport.send(commandOrMessage)
  }

  // Fold a value using the active server CASEMAPPING when available so
  // features and advanced consumers can compare identifiers consistently.
  caseFold(value: string): string {
    const mapping = this.isupport.CASEMAPPING.toLowerCase()
    const asciiFolded = value.toLowerCase()

    switch (mapping) {
      case 'rfc1459': {
        return asciiFolded
          .replaceAll('[', '{')
          .replaceAll(']', '}')
          .replaceAll('\\', '|')
          .replaceAll('~', '^')
      }

      case 'rfc1459-strict': {
        return asciiFolded.replaceAll('[', '{').replaceAll(']', '}').replaceAll('\\', '|')
      }

      default: {
        return asciiFolded
      }
    }
  }

  // Compare IRC identifiers using the active server CASEMAPPING.
  sameIdentifier(left: string, right: string): boolean {
    return this.caseFold(left) === this.caseFold(right)
  }

  // Runtime exposes source parsing as a shared utility so features do not each
  // invent their own partial hostmask parser.
  //
  // IRC source format: nick[!user][@host]
  // The nick portion is everything up to the first '!' or '@'. User is between
  // '!' and '@'. Host is everything after '@'. Any segment may be absent.
  parseSource(source: string | undefined): ParsedSource | undefined {
    if (source === undefined || source.length === 0) {
      return undefined
    }

    const bangIndex = source.indexOf('!')
    const atIndex = source.indexOf('@')

    let nickEnd = source.length
    if (bangIndex !== -1) {
      nickEnd = bangIndex
    } else if (atIndex !== -1) {
      nickEnd = atIndex
    }

    const nick = nickEnd > 0 ? source.slice(0, nickEnd) : undefined

    const userStart = bangIndex === -1 ? -1 : bangIndex + 1
    const userEnd = atIndex === -1 ? source.length : atIndex
    const user =
      userStart === -1 || userEnd <= userStart ? undefined : source.slice(userStart, userEnd)

    const host = atIndex === -1 ? undefined : source.slice(atIndex + 1) || undefined

    if (nick === undefined && user === undefined && host === undefined) {
      return undefined
    }
    return {
      host,
      isSelf: nick !== undefined && this.sameIdentifier(nick, this.connectionState.nick),
      nick,
      user,
    }
  }

  private handleClose(): void {
    this.emit('close')
  }

  private handleError(error: Error): void {
    this.emit('error', error)
  }
}

// Default session-construction path. Callers still register the session
// explicitly so every runtime follows the same observable lifecycle.
export function createRuntime(
  input: RuntimeInputConfig,
  stream: Duplex,
  features = defaultRuntimeFeatures,
): Runtime {
  const config = resolveConfig(input)
  const transport = new Transport(stream, { sendDelayMs: config.sendDelayMs })
  return new Runtime(config, transport, features)
}
