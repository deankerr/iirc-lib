// 8191 bytes (tags) + 512 bytes (message incl. CRLF) per IRCv3 spec.
const MAX_LINE_LENGTH = 8703

export type BufferResult = {
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

    // Remaining buffer is a partial line with no \n yet. If it already
    // exceeds the protocol limit it will never produce a valid message.
    if (!this.skipping && this.buffer.length > MAX_LINE_LENGTH) {
      overflowExcerpt = this.buffer.slice(0, 100)
      this.buffer = ''
      this.skipping = true
    }

    return { lines, overflowExcerpt }
  }

  clear(): void {
    this.buffer = ''
    this.skipping = false
  }
}
