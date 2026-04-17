import { EventEmitter } from 'node:events'
import type { Duplex } from 'node:stream'

import { resolveConfig, type RuntimeConfig, type RuntimeInputConfig } from './config'
import { identity } from './features/identity'
import { isupport } from './features/isupport'
import { ping } from './features/ping'
import { registration } from './features/registration'
import { Numeric } from './numerics'
import { Transport } from './transport'
import type { IrcCommand, IrcMessage } from './transport'

export type RuntimeFeature = (runtime: Runtime) => void

const defaultRuntimeFeatures: RuntimeFeature[] = [registration, ping, identity, isupport]

export type RuntimeEvents = {
  attach: [stream: Duplex]
  message: [IrcMessage]
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
}

export class Runtime extends EventEmitter<RuntimeEvents> {
  readonly numerics = Numeric

  readonly config: RuntimeConfig
  readonly transport: Transport

  readonly connectionState: ConnectionState
  readonly activeCaps = new Set<string>()
  readonly isupport = new Map<string, string | true>()

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
    this.transport.on('close', () => this.handleClose())
    this.transport.on('error', (error) => this.handleError(error))

    for (const feature of features) {
      feature(this)
    }

    // Keep the "attach" event name for now as the runtime startup signal.
    // The runtime is already session-bound at this point, so this fires once
    // when construction is complete and features are ready to run.
    this.emit('attach', this.transport.stream)
  }

  send(command: string, ...params: ReadonlyArray<string | undefined>): void {
    const definedParams = params.filter((param): param is string => param !== undefined)
    this.sendCommand({
      command,
      params: definedParams,
    })
  }

  sendCommand(command: IrcCommand): void {
    this.transport.send(command)
  }

  // Fold a value using the active server CASEMAPPING when available so
  // features and advanced consumers can compare identifiers consistently.
  caseFold(value: string): string {
    const caseMapping = this.isupport.get('CASEMAPPING')
    return foldCaseMapping(value, caseMapping)
  }

  parseSource(source: string | undefined): ParsedSource | undefined {
    if (!source) return undefined

    const bangIndex = source.indexOf('!')
    const atIndex = source.indexOf('@')

    const nickEnd = bangIndex === -1 ? (atIndex === -1 ? source.length : atIndex) : bangIndex
    const nick = nickEnd > 0 ? source.slice(0, nickEnd) : undefined

    const userStart = bangIndex === -1 ? -1 : bangIndex + 1
    const userEnd = atIndex === -1 ? source.length : atIndex
    const user =
      userStart === -1 || userEnd <= userStart ? undefined : source.slice(userStart, userEnd)

    const host = atIndex === -1 ? undefined : source.slice(atIndex + 1) || undefined

    if (!nick && !user && !host) return undefined
    return { nick, user, host }
  }

  parseSourceNick(source: string | undefined): string | undefined {
    return this.parseSource(source)?.nick
  }

  private handleClose(): void {
    this.emit('close')
  }

  private handleError(error: Error): void {
    this.emit('error', error)
  }
}

// Fold a value using the server's advertised CASEMAPPING. Per the spec,
// clients SHOULD assume rfc1459 until the server explicitly advertises a
// different mapping.
//
// Mappings:
//   ascii          — only A-Z fold to a-z
//   rfc1459        — ascii + [→{ ]→} \→| ~→^
//   rfc1459-strict — ascii + [→{ ]→} \→|   (no ~→^)
//   rfc7613        — PRECIS-based (falls back to ascii here)
function foldCaseMapping(value: string, caseMapping: string | true | undefined): string {
  const asciiFolded = value.toLowerCase()

  // Default to rfc1459 per spec until the server advertises CASEMAPPING.
  const mapping = typeof caseMapping === 'string' ? caseMapping.toLowerCase() : 'rfc1459'

  switch (mapping) {
    case 'rfc1459':
      return asciiFolded
        .replaceAll('[', '{')
        .replaceAll(']', '}')
        .replaceAll('\\', '|')
        .replaceAll('~', '^')

    case 'rfc1459-strict':
      return asciiFolded.replaceAll('[', '{').replaceAll(']', '}').replaceAll('\\', '|')

    case 'ascii':
    default:
      return asciiFolded
  }
}

// Default session-construction path. This keeps the common case small while
// still leaving the raw Runtime + Transport constructor path available for
// consumers who want to inspect or alter the pieces directly.
export function createRuntime(
  input: RuntimeInputConfig,
  stream: Duplex,
  features = defaultRuntimeFeatures,
): Runtime {
  const config = resolveConfig(input)
  const transport = new Transport(stream, { sendDelayMs: config.sendDelayMs })
  return new Runtime(config, transport, features)
}
