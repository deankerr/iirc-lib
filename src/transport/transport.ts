import { EventEmitter } from 'node:events'
import type { Duplex } from 'node:stream'

import { encodeCommand } from './encode-command'
import { InputBuffer } from './input-buffer'
import { OutputQueue } from './output-queue'
import { parseMessage } from './parse-message'
import type { IrcCommand, IrcMessage } from './types'

export type TransportEvents = {
  read: [line: string]
  write: [line: string]
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
  private transportOk = true

  private readonly handleDataRef = (chunk: string) => {
    this.handleChunk(chunk)
  }

  private readonly handleCloseRef = () => {
    this.handleClose()
  }

  private readonly handleErrorRef = (error: Error) => {
    this.handleError(error)
  }

  constructor(stream: Duplex, options: { sendDelayMs: number }) {
    super()

    this.stream = stream
    this.outputQueue = new OutputQueue(
      (line) => {
        this.writeLine(line)
      },
      {
        delayMs: options.sendDelayMs,
      },
    )

    stream.setEncoding('utf-8')
    stream.on('data', this.handleDataRef)
    stream.on('close', this.handleCloseRef)
    stream.on('error', this.handleErrorRef)
  }

  get ok(): boolean {
    return this.transportOk
  }

  send(command: IrcCommand): void {
    this.outputQueue.enqueue(encodeCommand(command))
  }

  private handleChunk(chunk: string): void {
    const lines = this.inputBuffer.push(chunk)

    for (const line of lines) {
      if (line.length === 0) {
        continue
      }

      // Emit the raw inbound IRC line before parsing so observers can see
      // exactly what arrived off the wire.
      this.emit('read', line)

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
    if (!this.transportOk) {
      throw new Error('Transport is no longer ok for writes')
    }

    // Emit the encoded outbound line at the point it actually reaches the
    // attached stream so observers see real writes, not just enqueue requests.
    this.emit('write', line)
    this.stream.write(`${line}\r\n`)
  }

  private handleClose(): void {
    this.finish()
    this.emit('close')
  }

  private handleError(error: Error): void {
    this.finish()
    this.emit('error', error)
  }

  private finish(): void {
    this.inputBuffer.clear()
    this.outputQueue.clear()
    this.transportOk = false
  }
}
