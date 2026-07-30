// The framer turns the session's inbound byte stream into frames. It encodes
// the few claims the protocol docs actually make about reading
// (docs/03-irc-protocol.md — "Message Format" and "Compatibility with
// incorrect software"):
//
// 1. Messages are byte sequences separated by CRLF. A bare LF is tolerated
//    the same way; a trailing CR before the LF is part of the delimiter.
// 2. Data buffers until the delimiter arrives. Only complete lines leave.
// 3. Empty messages are silently ignored.
// 4. A client must allow 512 message bytes plus 8191 tag bytes per line —
//    8703 wire bytes. A longer line can never become a valid message: it is
//    reported once as an overflow frame and its remaining bytes are discarded
//    until the terminating LF, so the buffer stays bounded.
// 5. Framing is a byte concern. Decoding to text happens elsewhere, per
//    complete line, so the limits above are true byte limits and a multibyte
//    character split across stream chunks survives intact.
//
// Every outcome is independent of how the stream chunks the bytes.

// 512 bytes including CRLF, plus the 8191 tag bytes a client must allow.
const MAX_WIRE_BYTES = 8703

// The same limit measured on a framed line, after its CRLF is stripped.
const MAX_CONTENT_BYTES = MAX_WIRE_BYTES - 2

// Overflow frames carry only the head of the offending line — enough to
// identify it in diagnostics without retaining an arbitrarily large payload.
const EXCERPT_BYTES = 100

export type InputFrame =
  | { bytes: Uint8Array; type: 'line' }
  | { excerpt: Uint8Array; type: 'overflow' }

export class InputBuffer {
  private buffer: Uint8Array = new Uint8Array()
  private skipping = false

  push(chunk: Uint8Array): InputFrame[] {
    this.buffer = concatBytes(this.buffer, chunk)

    const frames: InputFrame[] = []

    // Claim 2: only complete lines leave the buffer.
    let lfIndex = this.buffer.indexOf(0x0a)
    while (lfIndex !== -1) {
      let line = this.buffer.slice(0, lfIndex)
      this.buffer = this.buffer.slice(lfIndex + 1)

      // Claim 1: a CR directly before the LF belongs to the delimiter.
      if (line.at(-1) === 0x0d) {
        line = line.slice(0, -1)
      }

      if (this.skipping) {
        // This LF terminates an oversized line that was already reported.
        this.skipping = false
      } else if (line.byteLength > MAX_CONTENT_BYTES) {
        // Claim 4: an oversized complete line can never be a valid message.
        // Measuring after framing keeps the verdict independent of chunking.
        frames.push({ excerpt: line.slice(0, EXCERPT_BYTES), type: 'overflow' })
      } else if (line.byteLength > 0) {
        frames.push({ bytes: line, type: 'line' })
      }
      // Claim 3: empty lines vanish here, before anything downstream runs.

      lfIndex = this.buffer.indexOf(0x0a)
    }

    // What remains is a partial line still waiting for its LF.
    if (this.skipping) {
      // Already reported: keep discarding so an unterminated oversized line
      // cannot grow the buffer without bound.
      this.buffer = new Uint8Array()
    } else if (this.buffer.byteLength >= MAX_WIRE_BYTES) {
      // Claim 4 for partials: the most a valid line can hold before its LF
      // arrives is MAX_WIRE_BYTES - 1 bytes (content plus a pending CR).
      // Report once, then discard until the line terminates.
      frames.push({ excerpt: this.buffer.slice(0, EXCERPT_BYTES), type: 'overflow' })
      this.buffer = new Uint8Array()
      this.skipping = true
    }

    return frames
  }

  clear(): void {
    this.buffer = new Uint8Array()
    this.skipping = false
  }
}

function concatBytes(left: Uint8Array, right: Uint8Array): Uint8Array {
  if (left.byteLength === 0) {
    return new Uint8Array(right)
  }
  if (right.byteLength === 0) {
    return left
  }

  const combined = new Uint8Array(left.byteLength + right.byteLength)
  combined.set(left)
  combined.set(right, left.byteLength)
  return combined
}
