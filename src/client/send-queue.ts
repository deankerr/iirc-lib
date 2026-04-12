export type SendQueue = {
  send(line: string): void
  clear(): void
}

export function createSendQueue(write: (line: string) => void, delay: number): SendQueue {
  const queue: string[] = []
  let timer: ReturnType<typeof setTimeout> | null = null

  function drain() {
    timer = null
    const next = queue.shift()
    if (!next) return

    write(next)
    timer = setTimeout(drain, delay)
  }

  return {
    send(line) {
      if (delay === 0) {
        write(line)
        return
      }

      if (!timer) {
        write(line)
        timer = setTimeout(drain, delay)
      } else {
        queue.push(line)
      }
    },

    clear() {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      queue.length = 0
    },
  }
}
