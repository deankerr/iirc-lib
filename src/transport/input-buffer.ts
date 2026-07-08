// 8191 bytes (tags) + 512 bytes (message incl. CRLF) per IRCv3 spec.
const MAX_LINE_LENGTH = 8703

export interface BufferResult {
  lines: string[]
  overflowExcerpt?: string
}

export class InputBuffer {
  private buffer = ''
  private skipping = false

  push(chunk: string): BufferResult {
    this.buffer += chunk

    const lines: string[] = []
    let overflowExcerpt: string | undefined

    let newlineIndex = this.buffer.indexOf('\n')
    while (newlineIndex !== -1) {
      let line = this.buffer.slice(0, newlineIndex)
      this.buffer = this.buffer.slice(newlineIndex + 1)

      if (line.endsWith('\r')) {
        line = line.slice(0, -1)
      }

      if (this.skipping) {
        // This \n ends the oversized line — resume normal parsing.
        this.skipping = false
      } else {
        lines.push(line)
      }

      newlineIndex = this.buffer.indexOf('\n')
    }

    // Remaining buffer is a partial line with no \n yet.
    if (this.skipping) {
      // Still inside the oversized line: everything up to the next \n is part
      // of it. Discard rather than accumulate, or an endless unterminated line
      // would grow the buffer without bound — the very thing skipping prevents.
      this.buffer = ''
    } else if (this.buffer.length > MAX_LINE_LENGTH) {
      // A partial line already past the protocol limit will never produce a
      // valid message. Report it once and skip until the line terminates.
      overflowExcerpt = this.buffer.slice(0, 100)
      this.buffer = ''
      this.skipping = true
    }

    return overflowExcerpt === undefined ? { lines } : { lines, overflowExcerpt }
  }

  clear(): void {
    this.buffer = ''
    this.skipping = false
  }
}
