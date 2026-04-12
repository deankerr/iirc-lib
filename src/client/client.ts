import { EventEmitter } from 'node:events'
import type { Duplex } from 'node:stream'

import { createIsupport, type Isupport } from './protocol/isupport'
import { Numeric } from './protocol/numerics'
import { type IrcMessage, buildLine, parseMessage, parseUserhost } from './protocol/parser'
import { createSendQueue, type SendQueue } from './send-queue'
import { splitText } from './split'

export type ClientConfig = {
  nick: string
  user: string
  realname: string
  password?: string
  sendDelay?: number // ms between outgoing messages (default 1500, 0 to disable)
}

export type ClientStatus = 'disconnected' | 'registering' | 'connected' | 'error'

export type ServerInfo = {
  host?: string // Source of 001 - canonical server identity
  version?: string // Software version from 004
}

export type Self = {
  nick: string // Always known (from 001, updated on NICK)
  user?: string // Populated opportunistically from self-sourced messages
  host?: string // Populated opportunistically from self-sourced messages
}

export type ParsedMessage = IrcMessage & {
  target?: string // undefined = server message
  fromSelf: boolean // true if message originated from us
}

export type ClientEvents = {
  raw: [IrcMessage]
  message: [ParsedMessage]
  registered: []
  close: []
  error: [Error]
}

// Commands that bypass the queue and write immediately
const IMMEDIATE = new Set(['QUIT', 'PONG'])

// Commands whose text param gets split at word boundaries
const SPLITTABLE = new Set(['PRIVMSG', 'NOTICE'])

export class Client extends EventEmitter<ClientEvents> {
  private readonly config: ClientConfig
  private stream?: Duplex
  private buffer = ''

  private _status: ClientStatus = 'disconnected'
  private readonly _self: Self
  private readonly _isupport: Isupport = createIsupport()
  private readonly _serverInfo: ServerInfo = {}

  private readonly _baseNick: string
  private _nickAttempt = 0

  private queue?: SendQueue

  constructor(config: ClientConfig) {
    super()

    this.config = config
    this._self = { nick: config.nick }
    this._baseNick = config.nick
  }

  connect(stream: Duplex): void {
    if (this._status !== 'disconnected') {
      throw new Error(`Cannot connect: status is "${this._status}"`)
    }

    this.stream = stream
    this._status = 'registering'

    stream.setEncoding('utf8')
    stream.on('data', (chunk: string) => this.handleData(chunk))
    stream.on('close', () => this.handleClose())
    stream.on('error', (err: Error) => this.handleError(err))

    this.queue = createSendQueue((line) => this.writeLine(line), this.config.sendDelay ?? 1500)

    // Registration bypasses the pipeline — direct writeLine
    if (this.config.password) {
      this.writeLine(buildLine('PASS', [this.config.password]))
    }
    this.writeLine(buildLine('NICK', [this.config.nick]))
    this.writeLine(buildLine('USER', [this.config.user, '0', '*', this.config.realname]))
  }

  // --- State getters ---

  get status(): ClientStatus {
    return this._status
  }

  get self(): Self {
    return this._self
  }

  get nick(): string {
    return this._self.nick
  }

  get isupport(): Isupport {
    return this._isupport
  }

  get serverInfo(): ServerInfo {
    return this._serverInfo
  }

  // --- Public methods ---

  /**
   * Pipeline entry point: split → classify → route → write.
   * PRIVMSG/NOTICE text is split at word boundaries when it exceeds maxTextBytes.
   * QUIT/PONG bypass the queue. Everything else is queued for flood protection.
   */
  send(command: string, ...params: (string | undefined)[]): void {
    this.guardConnected()
    const cmd = command.toUpperCase()
    const lines = this.buildLines(cmd, params)
    const immediate = IMMEDIATE.has(cmd)

    for (const line of lines) {
      if (immediate) {
        this.writeLine(line)
      } else {
        this.queue!.send(line)
      }
    }
  }

  quit(reason?: string): void {
    this.send('QUIT', reason)
  }

  join(channel: string, key?: string): void {
    this.send('JOIN', channel, key)
  }

  part(channel: string, reason?: string): void {
    this.send('PART', channel, reason)
  }

  privmsg(target: string, text: string): void {
    this.send('PRIVMSG', target, text)
  }

  notice(target: string, text: string): void {
    this.send('NOTICE', target, text)
  }

  ping(token: string): void {
    this.send('PING', token)
  }

  pong(token: string): void {
    this.send('PONG', token)
  }

  setNick(nick: string): void {
    this.send('NICK', nick)
  }

  nickEqual(a: string, b: string): boolean {
    return this._isupport.casemapper.equal(a, b)
  }

  isSelf(source: string): boolean {
    // Handle both bare nick and full nick!user@host
    const nick = source.includes('!') ? parseUserhost(source).nick : source
    return this.nickEqual(nick, this._self.nick)
  }

  isChannel(name: string): boolean {
    return this._isupport.chantypes.includes(name[0] ?? '')
  }

  /**
   * Maximum bytes available for message text in a PRIVMSG/NOTICE.
   * Accounts for the server-relayed prefix (:nick!user@host), command, and target.
   */
  maxTextBytes(command: string, target: string): number {
    return this._isupport.maxTextBytes(this._self.nick, command, target)
  }

  // --- Pipeline internals ---

  private guardConnected(): void {
    if (!this.stream) throw new Error('Cannot send: not connected')
  }

  /**
   * Build IRC line(s) for a command. Splits PRIVMSG/NOTICE text at word
   * boundaries when it exceeds maxTextBytes. Other commands produce one line.
   */
  private buildLines(cmd: string, params: (string | undefined)[]): string[] {
    if (!SPLITTABLE.has(cmd)) return [buildLine(cmd, params)]

    // PRIVMSG/NOTICE: params are [target, text]
    const target = params[0]
    const text = params[1]
    if (!target || text === undefined) return [buildLine(cmd, params)]

    const max = this.maxTextBytes(cmd, target)
    if (max <= 0) return [buildLine(cmd, params)]

    const chunks = splitText(text, max)
    return chunks.map((chunk) => buildLine(cmd, [target, chunk]))
  }

  private writeLine(line: string): void {
    this.stream!.write(`${line}\r\n`)
  }

  // --- Stream handlers ---

  private handleData(chunk: string): void {
    this.buffer += chunk

    let idx = this.buffer.indexOf('\n')
    while (idx !== -1) {
      let line = this.buffer.slice(0, idx)
      this.buffer = this.buffer.slice(idx + 1)

      if (line.endsWith('\r')) {
        line = line.slice(0, -1)
      }

      if (line.length > 0) {
        this.handleLine(line)
      }

      idx = this.buffer.indexOf('\n')
    }
  }

  private handleLine(line: string): void {
    let msg: IrcMessage
    try {
      msg = parseMessage(line)
    } catch {
      return
    }

    // Extract user/host from any self-sourced message
    if (msg.source?.includes('!')) {
      const parsed = parseUserhost(msg.source)
      if (this.nickEqual(parsed.nick, this._self.nick)) {
        if (parsed.user) this._self.user = parsed.user
        if (parsed.host) this._self.host = parsed.host
      }
    }

    switch (msg.command) {
      case 'PING':
        this.pong(msg.params[0] ?? '')
        break

      case 'NICK': {
        if (!msg.source) break
        const oldNick = parseUserhost(msg.source).nick
        const newNick = msg.params[0]
        if (newNick && this.nickEqual(oldNick, this._self.nick)) {
          this._self.nick = newNick
        }
        break
      }

      case Numeric.RPL_WELCOME: {
        const actualNick = msg.params[0]
        if (actualNick) {
          this._self.nick = actualNick
        }
        this._serverInfo.host = msg.source
        this._nickAttempt = 0
        this._status = 'connected'
        this.emit('registered')
        break
      }

      // Nick collision during registration — try baseNick2, baseNick3, ...
      case Numeric.ERR_NICKNAMEINUSE: {
        if (this._status !== 'registering') break
        this._nickAttempt++
        const newNick = `${this._baseNick}${this._nickAttempt + 1}`
        this._self.nick = newNick
        this.writeLine(buildLine('NICK', [newNick]))
        break
      }

      case Numeric.RPL_MYINFO:
        this._serverInfo.version = msg.params[2]
        break

      case Numeric.RPL_ISUPPORT: {
        const tokens = msg.params.slice(1, -1)
        this._isupport.apply(tokens)
        break
      }

      default:
        break
    }

    this.emit('raw', msg)
    this.emit('message', this.enrichMessage(msg))
  }

  private enrichMessage(msg: IrcMessage): ParsedMessage {
    return {
      ...msg,
      source: msg.source ?? this._serverInfo.host,
      target: this.computeTarget(msg),
      fromSelf: msg.source ? this.isSelf(msg.source) : false,
    }
  }

  private computeTarget(msg: IrcMessage): string | undefined {
    const param0 = msg.params[0]

    switch (msg.command) {
      case 'PRIVMSG':
      case 'NOTICE': {
        if (!param0) return undefined
        // If target is us, flip to sender's nick (PM case)
        if (this.isSelf(param0)) {
          return msg.source ? parseUserhost(msg.source).nick : undefined
        }
        return param0
      }

      case 'JOIN':
      case 'PART':
      case 'KICK':
      case 'TOPIC':
        return param0

      case 'MODE': {
        // Only if target is a channel
        if (param0 && this.isChannel(param0)) {
          return param0
        }
        return undefined
      }

      // RPL_* numerics with channel in params[1]
      case Numeric.RPL_TOPIC:
      case Numeric.RPL_TOPICWHOTIME:
      case Numeric.RPL_NOTOPIC:
      case Numeric.RPL_CHANNELMODEIS:
      case Numeric.RPL_CREATIONTIME:
      case Numeric.RPL_ENDOFNAMES:
      case Numeric.RPL_BANLIST:
      case Numeric.RPL_ENDOFBANLIST:
      case Numeric.RPL_INVITELIST:
      case Numeric.RPL_ENDOFINVITELIST:
      case Numeric.RPL_INVEXLIST:
      case Numeric.RPL_ENDOFINVEXLIST:
      case Numeric.RPL_EXCEPTLIST:
      case Numeric.RPL_ENDOFEXCEPTLIST: {
        const channel = msg.params[1]
        if (channel && this.isChannel(channel)) {
          return channel
        }
        return undefined
      }

      // RPL_NAMREPLY has channel in params[2]
      case Numeric.RPL_NAMREPLY: {
        const channel = msg.params[2]
        if (channel && this.isChannel(channel)) {
          return channel
        }
        return undefined
      }

      default:
        return undefined
    }
  }

  private handleClose(): void {
    this.queue?.clear()
    this.queue = undefined
    this.stream = undefined
    this._status = 'disconnected'
    this.emit('close')
  }

  private handleError(error: Error): void {
    this.queue?.clear()
    this.queue = undefined
    this.stream = undefined
    this._status = 'error'
    this.emit('error', error)
  }
}
