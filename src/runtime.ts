import { EventEmitter } from 'node:events'
import type { Duplex } from 'node:stream'

import { CaseFoldMap } from './case-fold-map'
import type { RuntimeConfig, RuntimeInputConfig } from './config'
import { resolveConfig } from './config'
import type { IrcEvent } from './events'
import { buildEvent } from './events'
import type { Channel } from './features/channel-tracker'
import { channelTracker } from './features/channel-tracker'
import { identity } from './features/identity'
import { IsupportMap, isupport } from './features/isupport'
import { ping } from './features/ping'
import { registration } from './features/registration'
import type { IrcCommand, IrcMessage } from './transport'
import { Transport } from './transport'

export type ModeChange = {
  action: '+' | '-'
  mode: string
  argument?: string
}

// Features are applied in order. clientEvents must precede any feature that
// subscribes to 'clientEvent', because EventEmitter delivers synchronously and
// a subscriber that has not yet been registered will miss events.
const defaultRuntimeFeatures = [registration, ping, identity, isupport, channelTracker]

export type RuntimeEvents = {
  register: [stream: Duplex]
  event: [event: IrcEvent]
  parse_error: [message: IrcMessage, error: Error]
  registered: []
  close: []
  error: [Error]
}

export type ConnectionState = {
  user: string
  realname: string
  registered: boolean
  nick: string
  serverHost?: string
  serverVersion?: string
  account?: string
}

export type ParsedSource = {
  name: string
  user?: string
  host?: string
  isSelf: boolean
}

export class Runtime extends EventEmitter<RuntimeEvents> {
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

    this.transport.on('message', (message) => {
      let event: IrcEvent
      try {
        event = buildEvent(message, this.parseSource(message.source))
      } catch (error) {
        this.emit('parse_error', message, error instanceof Error ? error : new Error(String(error)))
        return
      }
      this.emit('event', event)
    })

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

  // Whether a target string starts with a known channel prefix per ISUPPORT.
  isChannel(target: string): boolean {
    return this.isupport.isChannel(target)
  }

  // Runtime exposes source parsing as a shared utility so features do not each
  // invent their own partial hostmask parser.
  //
  // IRC source format: name[!user][@host]
  // Per spec the server may omit source for any message. When absent or empty
  // we return a fallback. The server may also send a bare hostname or any
  // arbitrary string — name reflects that it might not be a nick.
  parseSource(source: string | undefined): ParsedSource {
    if (source === undefined || source.length === 0) {
      return { isSelf: false, name: this.connectionState.serverHost ?? '' }
    }

    const bangIndex = source.indexOf('!')
    const atIndex = source.indexOf('@')

    let nameEnd = source.length
    if (bangIndex !== -1) {
      nameEnd = bangIndex
    } else if (atIndex !== -1) {
      nameEnd = atIndex
    }

    const name = nameEnd > 0 ? source.slice(0, nameEnd) : '(unknown)'

    const userStart = bangIndex === -1 ? -1 : bangIndex + 1
    const userEnd = atIndex === -1 ? source.length : atIndex
    const user =
      userStart === -1 || userEnd <= userStart ? undefined : source.slice(userStart, userEnd)

    const host = atIndex === -1 ? undefined : source.slice(atIndex + 1) || undefined

    return {
      host,
      isSelf: this.sameIdentifier(name, this.connectionState.nick),
      name,
      user,
    }
  }

  private handleClose(): void {
    this.emit('close')
  }

  private handleError(error: Error): void {
    this.emit('error', error)
  }

  parseNames(names: string) {
    return names
      .split(' ')
      .filter((name) => name.length > 0)
      .map((name) => {
        const mode = this.isupport.prefixToMode.get(name[0] ?? '')
        if (mode === undefined) {
          return { nick: name }
        }

        return { mode, nick: name.slice(1) }
      })
  }

  // Parse a modestring and its trailing arguments into a flat list of changes.
  // Argument consumption follows CHANMODES type groups and PREFIX from ISUPPORT.
  // User mode letters are always type D (no argument) and fall through naturally.
  parseModeChanges(modes: string, args: string[]): ModeChange[] {
    const changes: ModeChange[] = []
    let action: '+' | '-' = '+'
    let argIndex = 0

    const [typeA, typeB, typeC] = this.isupport.chanModeGroups
    const { prefixModes } = this.isupport

    for (const mode of modes) {
      if (mode === '+' || mode === '-') {
        action = mode
        continue
      }

      // Prefix and type A/B modes always consume an argument.
      if (prefixModes.includes(mode) || typeA.includes(mode) || typeB.includes(mode)) {
        changes.push({ action, argument: args[argIndex] ?? '', mode })
        argIndex += 1
        continue
      }

      // Type C consumes an argument only when being set.
      if (typeC.includes(mode)) {
        if (action === '+') {
          changes.push({ action, argument: args[argIndex] ?? '', mode })
          argIndex += 1
        } else {
          changes.push({ action, mode })
        }
        continue
      }

      // Type D (and unknown/user modes) — no argument.
      changes.push({ action, mode })
    }

    return changes
  }
}

// Default session-construction path. Callers still register the session
// explicitly so every runtime follows the same observable lifecycle.
export function createRuntime(input: RuntimeInputConfig, stream: Duplex): Runtime {
  const config = resolveConfig(input)
  const transport = new Transport(stream, { sendDelayMs: config.sendDelayMs })
  return new Runtime(config, transport)
}
