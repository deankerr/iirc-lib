export class InputBuffer {
  private buffer = ''

  push(chunk: string): string[] {
    this.buffer += chunk

    const lines: string[] = []

    let newlineIndex = this.buffer.indexOf('\n')
    while (newlineIndex !== -1) {
      let line = this.buffer.slice(0, newlineIndex)
      this.buffer = this.buffer.slice(newlineIndex + 1)

      if (line.endsWith('\r')) {
        line = line.slice(0, -1)
      }

      lines.push(line)
      newlineIndex = this.buffer.indexOf('\n')
    }

    return lines
  }

  clear(): void {
    this.buffer = ''
  }
}
