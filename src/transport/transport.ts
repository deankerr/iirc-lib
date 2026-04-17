import { EventEmitter } from 'node:events'
import type { Duplex } from 'node:stream'

import { encodeCommand } from './encode-command'
import { InputBuffer } from './input-buffer'
import { OutputQueue } from './output-queue'
import { parseMessage } from './parse-message'
import type { IrcCommand, IrcMessage } from './types'

export type TransportStatus = 'idle' | 'attached' | 'closed' | 'error'

export type TransportEvents = {
  line: [line: string]
  message: [message: IrcMessage]
  close: []
  error: [error: Error]
}

// This is the enclosed transport I/O system for one attached stream.
// A Transport is created already bound to its stream and lives for exactly one
// IRC session. Above this boundary the runtime should think in messages and
// commands, not in chunks, line endings, encoding, queue timing, or stream
// listeners.
export class Transport extends EventEmitter<TransportEvents> {
  private readonly inputBuffer = new InputBuffer()
  private readonly outputQueue: OutputQueue

  readonly stream: Duplex
  private currentStatus: TransportStatus = 'attached'

  private readonly handleDataRef = (chunk: string) => this.handleChunk(chunk)
  private readonly handleCloseRef = () => this.handleClose()
  private readonly handleErrorRef = (error: Error) => this.handleError(error)

  constructor(stream: Duplex, options: { sendDelayMs: number }) {
    super()

    this.stream = stream
    this.outputQueue = new OutputQueue((line) => this.writeLine(line), {
      delayMs: options.sendDelayMs,
    })

    stream.setEncoding('utf8')
    stream.on('data', this.handleDataRef)
    stream.on('close', this.handleCloseRef)
    stream.on('error', this.handleErrorRef)
  }

  get status(): TransportStatus {
    return this.currentStatus
  }

  send(command: IrcCommand): void {
    this.outputQueue.enqueue(encodeCommand(command))
  }

  private handleChunk(chunk: string): void {
    const lines = this.inputBuffer.push(chunk)

    for (const line of lines) {
      if (line.length === 0) continue

      this.emit('line', line)

      let message: IrcMessage
      try {
        message = parseMessage(line)
      } catch {
        continue
      }

      this.emit('message', message)
    }
  }

  private writeLine(line: string): void {
    if (this.currentStatus !== 'attached') {
      throw new Error('Transport is not attached to a live stream')
    }

    this.stream.write(`${line}\r\n`)
  }

  private handleClose(): void {
    this.finish('closed')
    this.emit('close')
  }

  private handleError(error: Error): void {
    this.finish('error')
    this.emit('error', error)
  }

  private finish(status: TransportStatus): void {
    this.unbindStream()
    this.inputBuffer.clear()
    this.outputQueue.clear()
    this.setStatus(status)
  }

  private unbindStream(): void {
    this.stream.removeListener('data', this.handleDataRef)
    this.stream.removeListener('close', this.handleCloseRef)
    this.stream.removeListener('error', this.handleErrorRef)
  }

  private setStatus(status: TransportStatus): void {
    this.currentStatus = status
  }
}
