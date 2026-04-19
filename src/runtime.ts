import { EventEmitter } from 'node:events'
import type { Duplex } from 'node:stream'

import { resolveConfig } from './config'
import type { RuntimeConfig, RuntimeInputConfig } from './config'
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
  register: [stream: Duplex]
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

function parseSourceValue(source: string | undefined): ParsedSource | undefined {
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
  return { host, nick, user }
}

export class Runtime extends EventEmitter<RuntimeEvents> {
  readonly numerics = Numeric

  readonly config: RuntimeConfig
  readonly transport: Transport

  readonly connectionState: ConnectionState
  readonly activeCaps = new Set<string>()
  readonly isupport = new Map<string, string | true>()
  private readonly sourceParser = parseSourceValue
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
    return this.sourceParser(source)
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
