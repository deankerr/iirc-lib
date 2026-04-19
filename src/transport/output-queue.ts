export class OutputQueue {
  private readonly delayMs: number
  private readonly writeLine: (line: string) => void

  private queue: string[] = []
  private timer: ReturnType<typeof setTimeout> | undefined

  constructor(writeLine: (line: string) => void, options: { delayMs: number }) {
    this.writeLine = writeLine
    this.delayMs = options.delayMs
  }

  enqueue(line: string): void {
    if (this.delayMs <= 0) {
      this.writeLine(line)
      return
    }

    if (!this.timer) {
      this.writeLine(line)
      this.timer = setTimeout(() => this.drain(), this.delayMs)
      return
    }

    this.queue.push(line)
  }

  clear(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = undefined
    }

    this.queue = []
  }

  private drain(): void {
    this.timer = undefined

    const next = this.queue.shift()
    if (!next) {
      return
    }

    this.writeLine(next)
    this.timer = setTimeout(() => this.drain(), this.delayMs)
  }
}
