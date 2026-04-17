import { EventEmitter } from 'node:events'
import type { Duplex } from 'node:stream'

import type { RuntimeConfig } from '../config'
import { builtinRuntimeFeatures } from './features'
import { Numeric } from './numerics'
import { TransportHarness } from './transport'
import type { IrcCommand, IrcMessage } from './transport'

export type RuntimeStatus = 'idle' | 'registering' | 'registered' | 'closed' | 'error'

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

export type IsupportValue = string | true

export type ParsedSource = {
  nick?: string
  user?: string
  host?: string
}

export class Runtime extends EventEmitter<RuntimeEvents> {
  status: RuntimeStatus
  readonly numerics = Numeric
  readonly activeCaps = new Set<string>()

  private readonly harness: TransportHarness
  private readonly config: RuntimeConfig

  connectionState: ConnectionState
  isupport = new Map<string, IsupportValue>()

  constructor(config: RuntimeConfig) {
    super()

    this.config = config
    this.connectionState = {
      nick: config.nick,
      realname: config.realname,
      registered: false,
      user: config.user,
    }

    this.harness = new TransportHarness({ sendDelayMs: config.sendDelayMs })
    this.status = 'idle'

    this.harness.on('message', (message) => this.emit('message', message))
    this.harness.on('close', () => this.handleClose())
    this.harness.on('error', (error) => this.handleError(error))

    for (const feature of builtinRuntimeFeatures) {
      feature(this)
    }
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

  getConfig(): Readonly<RuntimeConfig> {
    return this.config
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

function foldCaseMapping(value: string, caseMapping: string | true | undefined): string {
  const asciiFolded = value.toLowerCase()
  if (typeof caseMapping !== 'string') {
    return asciiFolded
  }

  switch (caseMapping.toLowerCase()) {
    case 'rfc1459':
      return asciiFolded
        .replaceAll('[', '{')
        .replaceAll(']', '}')
        .replaceAll('\\', '|')
        .replaceAll('~', '^')

    case 'strict-rfc1459':
      return asciiFolded.replaceAll('[', '{').replaceAll(']', '}').replaceAll('\\', '|')

    case 'ascii':
    default:
      return asciiFolded
  }
}
