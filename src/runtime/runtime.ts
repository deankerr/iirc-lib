import { EventEmitter } from 'node:events'
import type { Duplex } from 'node:stream'

import { TransportHarness } from './transport/transport-harness'
import type { IrcMessage } from './transport/types'

export type RuntimeConfig = {
  sendDelayMs?: number
}

export type RuntimeStatus = 'idle' | 'attached' | 'closed' | 'error'

export type RuntimeEvents = {
  line: [string]
  message: [IrcMessage]
  close: []
  error: [Error]
}

export class Runtime extends EventEmitter<RuntimeEvents> {
  status: RuntimeStatus

  private readonly harness: TransportHarness

  constructor(config: RuntimeConfig = {}) {
    super()

    this.harness = new TransportHarness({ sendDelayMs: config.sendDelayMs })
    this.status = 'idle'

    this.harness.on('line', (line) => this.emit('line', line))
    this.harness.on('message', (message) => this.emit('message', message))
    this.harness.on('close', () => this.handleClose())
    this.harness.on('error', (error) => this.handleError(error))
  }

  attach(stream: Duplex): void {
    this.status = 'attached'
    this.harness.attach(stream)
  }

  send(command: string, ...params: ReadonlyArray<string | undefined>): void {
    const definedParams = params.filter((param): param is string => param !== undefined)
    this.harness.send({
      command,
      params: definedParams,
    })
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
