import { EventEmitter } from 'node:events'
import type { Duplex } from 'node:stream'

import { encodeCommand } from './encode-command'
import { InputBuffer } from './input-buffer'
import { OutputQueue } from './output-queue'
import { parseMessage } from './parse-message'
import type { IrcCommand, IrcMessage } from './types'

export interface TransportEvents {
  read: [line: string]
  write: [line: string]
  parse_error: [line: string, error: Error]
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

  private readonly handleDataRef = (chunk: Uint8Array | string) => {
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

    // The transport does not own its stream — the consumer creates it and can
    // keep using it. Byte framing is only sound on a binary readable, so that
    // single precondition is verified here, before any session exists. This is
    // the one place the library throws: there is no session yet to quench
    // into.
    if (stream.readableObjectMode || stream.readableEncoding !== null) {
      throw new Error('Transport requires a binary stream (no readableEncoding, no objectMode)')
    }

    this.stream = stream
    this.outputQueue = new OutputQueue(
      (line) => {
        this.writeLine(line)
      },
      {
        delayMs: options.sendDelayMs,
      },
    )

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

  private handleChunk(chunk: Uint8Array | string): void {
    // The session is terminal after close or error; late chunks are noise.
    if (!this.transportOk) {
      return
    }

    // A string chunk means the consumer set an encoding on the stream after
    // construction. The byte contract is broken, and the session with it —
    // silently re-encoding would fake a byte fidelity we no longer have.
    if (typeof chunk === 'string') {
      this.handleError(new Error('Transport stream emitted a string; a binary stream is required'))
      return
    }

    for (const frame of this.inputBuffer.push(chunk)) {
      if (frame.type === 'overflow') {
        this.emit(
          'parse_error',
          decodeLine(frame.excerpt),
          new Error('IRC line exceeded maximum length and was discarded'),
        )
        continue
      }

      // Framing and protocol limits are byte concerns. Once a complete line
      // is isolated, the rest of the transport follows one string-based flow.
      const line = decodeLine(frame.bytes)
      this.emit('read', line)

      let message: IrcMessage
      try {
        message = parseMessage(line)
      } catch (error) {
        this.emit('parse_error', line, error instanceof Error ? error : new Error(String(error)))
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

// Decoding is a policy applied per complete line — the single seam where a
// legacy-encoding fallback or a consumer-supplied codec would slot in. Today
// the policy is UTF-8 with invalid sequences replaced by U+FFFD.
const utf8Decoder = new TextDecoder()

function decodeLine(bytes: Uint8Array): string {
  return utf8Decoder.decode(bytes)
}
