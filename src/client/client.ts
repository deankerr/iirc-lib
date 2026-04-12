import { EventEmitter } from 'node:events'
import type { Duplex } from 'node:stream'

import { Runtime } from '../runtime/runtime'
import type { IrcMessage } from '../runtime/transport/types'

export type ClientConfig = {
  sendDelayMs?: number
}

export type ClientEvents = {
  line: [string]
  message: [IrcMessage]
  close: []
  error: [Error]
}

export class Client extends EventEmitter<ClientEvents> {
  readonly runtime: Runtime

  constructor(config: ClientConfig = {}) {
    super()

    this.runtime = new Runtime(config)

    // The public client is intentionally thin in this first slice.
    // It owns the ergonomic surface, not the deeper behavior.
    this.runtime.on('line', (line) => this.emit('line', line))
    this.runtime.on('message', (message) => this.emit('message', message))
    this.runtime.on('close', () => this.emit('close'))
    this.runtime.on('error', (error) => this.emit('error', error))
  }

  attach(stream: Duplex): void {
    this.runtime.attach(stream)
  }

  send(command: string, ...params: ReadonlyArray<string | undefined>): void {
    this.runtime.send(command, ...params)
  }
}
