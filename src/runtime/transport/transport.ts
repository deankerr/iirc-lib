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
// Above this boundary the runtime should think in messages and commands, not in
// chunks, line endings, encoding, queue timing, or stream listeners.
export class Transport extends EventEmitter<TransportEvents> {
  private readonly inputBuffer = new InputBuffer()
  private readonly outputQueue: OutputQueue

  private stream?: Duplex
  private currentStatus: TransportStatus = 'idle'

  private readonly handleDataRef = (chunk: string) => this.handleChunk(chunk)
  private readonly handleCloseRef = () => this.handleClose()
  private readonly handleErrorRef = (error: Error) => this.handleError(error)

  constructor(options: { sendDelayMs: number }) {
    super()

    this.outputQueue = new OutputQueue((line) => this.writeLine(line), {
      delayMs: options.sendDelayMs,
    })
  }

  get status(): TransportStatus {
    return this.currentStatus
  }

  attach(stream: Duplex): void {
    if (this.stream) {
      throw new Error('Transport is already attached to a transport')
    }

    this.stream = stream
    this.setStatus('attached')

    stream.setEncoding('utf8')
    stream.on('data', this.handleDataRef)
    stream.on('close', this.handleCloseRef)
    stream.on('error', this.handleErrorRef)
  }

  detach(): void {
    if (!this.stream) return

    this.releaseCurrentStream('idle')
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
    const stream = this.stream
    if (!stream) {
      throw new Error('Transport has no attached transport')
    }

    stream.write(`${line}\r\n`)
  }

  private handleClose(): void {
    this.releaseCurrentStream('closed')
    this.emit('close')
  }

  private handleError(error: Error): void {
    this.releaseCurrentStream('error')
    this.emit('error', error)
  }

  private releaseCurrentStream(status: TransportStatus): void {
    const stream = this.stream
    if (stream) {
      this.unbindStream(stream)
    }

    this.stream = undefined
    this.inputBuffer.clear()
    this.outputQueue.clear()
    this.setStatus(status)
  }

  private unbindStream(stream: Duplex): void {
    stream.removeListener('data', this.handleDataRef)
    stream.removeListener('close', this.handleCloseRef)
    stream.removeListener('error', this.handleErrorRef)
  }

  private setStatus(status: TransportStatus): void {
    this.currentStatus = status
  }
}
