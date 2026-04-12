import { EventEmitter } from 'node:events'
import type { Duplex } from 'node:stream'

import { createChannelTracker, type ChannelTracker, type ChannelTrackerHost } from './channels'
import { Client, type ClientEvents, type ParsedMessage, type Self, type ServerInfo } from './client'
import { createIsupport, type Isupport } from './protocol/isupport'
import type { IrcMessage } from './protocol/parser'

export type CreateClientConfig = {
  nick: string
  user: string
  realname: string
  password?: string
  sendDelay?: number
  connect: () => Duplex
  reconnect?: {
    baseDelay: number
    maxDelay: number
    maxAttempts?: number
  }
}

export type FacadeStatus = 'idle' | 'connecting' | 'connected' | 'waiting' | 'exhausted'

type FacadeEvents = ClientEvents & {
  reconnecting: [attempt: number]
  reconnected: []
  exhausted: []
}

export function createClient(config: CreateClientConfig) {
  const emitter = new EventEmitter<FacadeEvents>()
  let inner: Client | undefined
  let _status: FacadeStatus = 'idle'
  let _quitting = false
  let _reconnectTimer: ReturnType<typeof setTimeout> | undefined

  // Fallback isupport for when inner Client is not connected
  const fallbackIsupport = createIsupport()

  // Channel tracker host delegates to current inner Client
  const trackerHost: ChannelTrackerHost = {
    get isupport() {
      return inner?.isupport ?? fallbackIsupport
    },
    isSelf(source: string) {
      return inner ? inner.isSelf(source) : false
    },
  }
  const tracker = createChannelTracker(trackerHost)

  // Listener refs for clean unbinding
  let boundListeners:
    | {
        raw: (msg: IrcMessage) => void
        message: (msg: ParsedMessage) => void
        registered: () => void
        close: () => void
        error: (err: Error) => void
      }
    | undefined

  function bind(client: Client) {
    const listeners = {
      raw: (msg: IrcMessage) => emitter.emit('raw', msg),
      message: (msg: ParsedMessage) => {
        tracker.processMessage(msg)
        emitter.emit('message', msg)
      },
      registered: () => {
        _status = 'connected'
        emitter.emit('registered')
      },
      close: () => handleClose(),
      error: (err: Error) => {
        emitter.emit('error', err)
      },
    }
    client.on('raw', listeners.raw)
    client.on('message', listeners.message)
    client.on('registered', listeners.registered)
    client.on('close', listeners.close)
    client.on('error', listeners.error)
    boundListeners = listeners
  }

  function unbind() {
    if (!inner || !boundListeners) return
    inner.removeListener('raw', boundListeners.raw)
    inner.removeListener('message', boundListeners.message)
    inner.removeListener('registered', boundListeners.registered)
    inner.removeListener('close', boundListeners.close)
    inner.removeListener('error', boundListeners.error)
    boundListeners = undefined
  }

  function handleClose() {
    tracker.handleClose()
    unbind()
    inner = undefined

    if (_quitting || !config.reconnect) {
      _status = 'idle'
      _quitting = false
      emitter.emit('close')
      return
    }

    // Start reconnection loop
    reconnect()
  }

  function reconnect() {
    const rc = config.reconnect!
    const maxAttempts = rc.maxAttempts ?? Infinity

    // Snapshot joined channels for rejoin
    const rejoinChannels: string[] = []
    for (const ch of tracker.channels.values()) {
      if (ch.joined || ch.users.size > 0) {
        rejoinChannels.push(ch.name)
      }
    }
    tracker.clear()

    let attempt = 0

    function tryConnect() {
      if (_quitting) {
        _status = 'idle'
        _quitting = false
        emitter.emit('close')
        return
      }

      attempt++
      if (attempt > maxAttempts) {
        _status = 'exhausted'
        emitter.emit('exhausted')
        return
      }

      // Exponential backoff with jitter
      const delay = Math.min(rc.baseDelay * 2 ** (attempt - 1), rc.maxDelay)
      const jitter = delay * 0.2 * Math.random()
      const waitMs = delay + jitter

      _status = 'waiting'
      emitter.emit('reconnecting', attempt)

      _reconnectTimer = setTimeout(() => {
        _reconnectTimer = undefined
        if (_quitting) {
          _status = 'idle'
          _quitting = false
          emitter.emit('close')
          return
        }

        // Create new inner Client
        const client = new Client({
          nick: config.nick,
          user: config.user,
          realname: config.realname,
          password: config.password,
          sendDelay: config.sendDelay,
        })
        inner = client
        _status = 'connecting'

        // Temporary listeners for this attempt
        const onRegistered = () => {
          cleanup()
          bind(client)
          _status = 'connected'

          // Rejoin channels
          for (const ch of rejoinChannels) {
            client.join(ch)
          }

          emitter.emit('reconnected')
        }

        const onClose = () => {
          cleanup()
          inner = undefined
          tryConnect()
        }

        const onError = (err: Error) => {
          emitter.emit('error', err)
          // Close will follow from the stream, triggering retry
        }

        function cleanup() {
          client.removeListener('registered', onRegistered)
          client.removeListener('close', onClose)
          client.removeListener('error', onError)
        }

        client.on('registered', onRegistered)
        client.on('close', onClose)
        client.on('error', onError)

        try {
          client.connect(config.connect())
        } catch (err) {
          cleanup()
          inner = undefined
          emitter.emit('error', err instanceof Error ? err : new Error(String(err)))
          tryConnect()
        }
      }, waitMs)
    }

    tryConnect()
  }

  // --- Public API ---

  const facade = {
    get status(): FacadeStatus {
      return _status
    },

    get self(): Self {
      if (!inner) return { nick: config.nick }
      return inner.self
    },

    get nick(): string {
      return inner?.nick ?? config.nick
    },

    get isupport(): Isupport {
      return inner!.isupport
    },

    get serverInfo(): ServerInfo {
      return inner?.serverInfo ?? {}
    },

    get channels(): ChannelTracker {
      return tracker
    },

    connect() {
      if (_status !== 'idle') {
        throw new Error(`Cannot connect: status is "${_status}"`)
      }
      _quitting = false

      const client = new Client({
        nick: config.nick,
        user: config.user,
        realname: config.realname,
        password: config.password,
        sendDelay: config.sendDelay,
      })
      inner = client
      _status = 'connecting'
      bind(client)
      client.connect(config.connect())
    },

    quit(reason?: string) {
      _quitting = true

      // Cancel any pending reconnect timer
      if (_reconnectTimer) {
        clearTimeout(_reconnectTimer)
        _reconnectTimer = undefined
        _status = 'idle'
        emitter.emit('close')
        return
      }

      if (inner) {
        inner.quit(reason)
      }
    },

    send(command: string, ...params: (string | undefined)[]) {
      inner!.send(command, ...params)
    },

    join(channel: string, key?: string) {
      inner!.join(channel, key)
    },

    part(channel: string, reason?: string) {
      inner!.part(channel, reason)
    },

    privmsg(target: string, text: string) {
      inner!.privmsg(target, text)
    },

    notice(target: string, text: string) {
      inner!.notice(target, text)
    },

    ping(token: string) {
      inner!.ping(token)
    },

    pong(token: string) {
      inner!.pong(token)
    },

    setNick(nick: string) {
      inner!.setNick(nick)
    },

    nickEqual(a: string, b: string): boolean {
      return inner!.nickEqual(a, b)
    },

    isSelf(source: string): boolean {
      if (!inner) return false
      return inner.isSelf(source)
    },

    isChannel(name: string): boolean {
      return inner!.isChannel(name)
    },

    maxTextBytes(command: string, target: string): number {
      return inner!.maxTextBytes(command, target)
    },

    // EventEmitter delegation
    on: emitter.on.bind(emitter),
    once: emitter.once.bind(emitter),
    off: emitter.off.bind(emitter),
    removeListener: emitter.removeListener.bind(emitter),
    removeAllListeners: emitter.removeAllListeners.bind(emitter),
    emit: emitter.emit.bind(emitter),
    addListener: emitter.addListener.bind(emitter),
    listenerCount: emitter.listenerCount.bind(emitter),
  }

  return facade
}

export type IrcClient = ReturnType<typeof createClient>
