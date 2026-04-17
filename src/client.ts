import { EventEmitter } from 'node:events'
import type { Duplex } from 'node:stream'

import { type ClientConfig, resolveConfig } from './config'
import { Runtime } from './runtime'
import type { IrcMessage } from './runtime'

export type { ClientConfig }

export type ClientEvents = {
  message: [IrcMessage]
  registered: []
  close: []
  error: [Error]
}

export class Client extends EventEmitter<ClientEvents> {
  readonly runtime: Runtime

  constructor(config: ClientConfig) {
    super()

    this.runtime = new Runtime(resolveConfig(config))

    this.runtime.on('message', (message) => this.emit('message', message))
    this.runtime.on('registered', () => this.emit('registered'))
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
