import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

interface FileLoggerOptions {
  highWaterMark?: number
  ref?: boolean
}

export class FileSinkLogger {
  static localISOString(date = new Date()): string {
    const pad = (n: number, len = 2) => String(n).padStart(len, '0')
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`
    )
  }

  private readonly instanceDir: string
  private readonly sinks = new Map<string, Bun.FileSink>()
  private readonly options: FileLoggerOptions
  open = true

  constructor(
    logsDir: string,
    instance = FileSinkLogger.localISOString(),
    options: FileLoggerOptions = {},
  ) {
    this.instanceDir = join(logsDir, instance)
    this.options = options

    void mkdir(this.instanceDir, { recursive: true })
  }

  tee(filename: string, data: unknown): void {
    console.log(data)
    this.log(filename, data)
  }

  log(filename: string, data: unknown): void {
    if (!this.open) {
      return
    }

    const line = `${typeof data === 'string' ? data : JSON.stringify(data)}\n`

    let sink = this.sinks.get(filename)

    if (sink === undefined) {
      const file = Bun.file(join(this.instanceDir, filename))
      sink = file.writer({ highWaterMark: this.options.highWaterMark })

      if (this.options.ref === false) {
        sink.unref()
      }
      this.sinks.set(filename, sink)
    }

    void sink.write(line)
  }

  async end(): Promise<void> {
    if (!this.open) {
      return
    }
    this.open = false

    await Promise.all(
      [...this.sinks.values()].map(async (sink) => {
        await sink.write('closed')
        await sink.end()
      }),
    )
    this.sinks.clear()
  }
}
