import { mkdir } from 'node:fs/promises'
import { connect as connectTcp } from 'node:net'
import type { Socket } from 'node:net'
import { resolve } from 'node:path'
import process from 'node:process'
import { connect as connectTls } from 'node:tls'
import type { TLSSocket } from 'node:tls'

import { Command, InvalidArgumentError } from 'commander'

import { resolveConfig, Runtime } from '../src'
import { Transport } from '../src/transport'

const SEND_DELAY_MS = 100
const CONNECT_TIMEOUT_MS = 10_000
const SESSION_TIMEOUT_MS = 20_000
const TOUR_NICK = 'iirc-tour'
const QUIT_MESSAGE = 'iirc-lib network tour complete'
const DATA_DIR = resolve('data')
const NETWORK_LIST_PATH = resolve(DATA_DIR, 'network-list.json')
const TOUR_OUT_DIR = resolve(
  DATA_DIR,
  `tour-networks-${new Date().toISOString().replaceAll(':', '-')}`,
)
const TLS_REJECT_UNAUTHORIZED = true

type TourOptions = {
  startAt: number
  limit?: number
  skipTls: boolean
}

type ConnectionOption = {
  host: string
  port: number
  tls: boolean
}

type NetworkEntry = {
  name: string
  servers: ConnectionOption[]
}

type AttemptCtx = {
  stream: Socket | TLSSocket | undefined
  connectTimer: ReturnType<typeof setTimeout> | undefined
  sessionTimer: ReturnType<typeof setTimeout> | undefined
}

// Phase 1: wait for the TCP/TLS handshake to complete or fail.
function awaitConnection(server: ConnectionOption, ctx: AttemptCtx): Promise<void> {
  return new Promise((resolve, reject) => {
    const readyEvent = server.tls ? 'secureConnect' : 'connect'

    const onReady = (): void => {
      ctx.stream?.removeListener('error', onError)
      resolve()
    }

    const onError = (error: Error): void => {
      ctx.stream?.removeListener(readyEvent, onReady)
      reject(error)
    }

    ctx.connectTimer = setTimeout(() => {
      reject(new Error(`Timed out connecting to ${server.host}:${server.port}`))
    }, CONNECT_TIMEOUT_MS)

    ctx.stream!.once(readyEvent, onReady)
    ctx.stream!.once('error', onError)
  })
}

// Phase 2: run the IRC registration session and wait for a clean close.
function runSession(
  ctx: AttemptCtx,
  log: (event: string, fields?: Record<string, unknown>) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false
    let quitSent = false

    const settle = (fn: () => void): void => {
      if (settled) return
      settled = true
      fn()
    }

    const scheduleQuit = (): void => {
      ctx.sessionTimer = setTimeout(() => {
        if (quitSent) {
          settle(() => reject(new Error('Timed out waiting for the server after QUIT')))
          return
        }

        quitSent = true
        runtime.sendCommand({ command: 'QUIT', params: [QUIT_MESSAGE], trailing: true })
        scheduleQuit()
      }, SESSION_TIMEOUT_MS)
    }

    // Constructs the Transport and Runtime pair for the ready stream.
    const transport = new Transport(ctx.stream!, { sendDelayMs: SEND_DELAY_MS })
    const runtime = new Runtime(
      resolveConfig({ nick: TOUR_NICK, sendDelayMs: SEND_DELAY_MS }),
      transport,
    )

    // Attach observers before startup so the initial registration burst is logged.
    transport.on('read', (line) => {
      log('read', { line })
      clearTimeout(ctx.sessionTimer)
      scheduleQuit()
    })

    transport.on('write', (line) => {
      log('write', { line })
    })

    runtime.on('error', (error) => {
      settle(() => reject(error))
    })

    runtime.on('close', () => {
      if (!quitSent) {
        settle(() => reject(new Error('Server closed before registration completed')))
        return
      }

      settle(resolve)
    })

    runtime.register()
    scheduleQuit()
  })
}

async function runAttempt(
  network: string,
  server: ConnectionOption,
  attemptNumber: number,
  outputPath: string,
): Promise<boolean> {
  const logs: string[] = []
  const ctx: AttemptCtx = { stream: undefined, connectTimer: undefined, sessionTimer: undefined }

  const log = (event: string, fields: Record<string, unknown> = {}): void => {
    logs.push(`${JSON.stringify({ _t: new Date().toJSON(), event, ...fields })}\n`)
  }

  log('attempt', {
    network,
    attempt: attemptNumber,
    host: server.host,
    port: server.port,
    tls: server.tls,
    nick: TOUR_NICK,
  })

  try {
    ctx.stream = server.tls
      ? connectTls({
          host: server.host,
          port: server.port,
          servername: server.host,
          rejectUnauthorized: TLS_REJECT_UNAUTHORIZED,
        } as Parameters<typeof connectTls>[0])
      : connectTcp({ host: server.host, port: server.port })

    await awaitConnection(server, ctx)
    await runSession(ctx, log)

    return true
  } catch (error) {
    log('attempt_error', { error: Bun.inspect(error) })
    return false
  } finally {
    clearTimeout(ctx.connectTimer)
    clearTimeout(ctx.sessionTimer)
    ctx.stream?.destroy()
    await Bun.write(outputPath, logs.join(''))
  }
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
  return slug.length > 0 ? slug : 'target'
}

function buildOutputPath(
  networkNumber: number,
  networkName: string,
  attemptOffset: number,
  server: ConnectionOption,
): string {
  const networkSlug = slugify(networkName)
  const serverSlug = slugify(`${server.host}-${server.port}-${server.tls ? 'tls' : 'plain'}`)
  return resolve(
    TOUR_OUT_DIR,
    `${String(networkNumber).padStart(3, '0')}-${networkSlug}-${String(attemptOffset + 1).padStart(2, '0')}-${serverSlug}.ndjson`,
  )
}

async function loadNetworkList(): Promise<NetworkEntry[]> {
  const file = Bun.file(NETWORK_LIST_PATH)
  return file.json() as Promise<NetworkEntry[]>
}

async function runTour(options: TourOptions): Promise<void> {
  console.log('Tour options', options)

  const list = await loadNetworkList()

  const startIndex = options.startAt - 1
  const selectedTargets = list.slice(
    startIndex,
    options.limit ? startIndex + options.limit : undefined,
  )

  if (selectedTargets.length === 0) {
    throw new Error('No targets selected after applying --start-at/--limit')
  }

  await mkdir(TOUR_OUT_DIR, { recursive: true })
  console.log(`Writing output to ${TOUR_OUT_DIR}`)

  for (const [offset, target] of selectedTargets.entries()) {
    const networkNumber = options.startAt + offset
    console.log(`[${networkNumber}/${list.length}] ${target.name}`)

    // Keep the checked-in network list intact and apply CLI filtering per run.
    // Sort TLS servers first so we always prefer encrypted connections.
    const servers = (
      options.skipTls ? target.servers.filter((server) => !server.tls) : target.servers
    )
      .slice()
      .sort((a, b) => Number(b.tls) - Number(a.tls))

    // Warn when filtering removes every advertised endpoint for a network.
    if (servers.length === 0) {
      console.warn(`No servers remain for ${target.name} after applying --skip-tls`)
      continue
    }

    // Only fall through to the next option when we never established a ready socket.
    for (const [attemptOffset, server] of servers.entries()) {
      const outputPath = buildOutputPath(networkNumber, target.name, attemptOffset, server)

      const connected = await runAttempt(target.name, server, attemptOffset + 1, outputPath)

      if (connected) {
        break
      }
    }
  }
}

function parseArgs(argv: string[]) {
  const parsePositiveInt = (value: string): number => {
    const parsed = Number.parseInt(value, 10)
    if (!Number.isSafeInteger(parsed) || parsed < 1) {
      throw new InvalidArgumentError(`Expected a positive integer, received "${value}"`)
    }
    return parsed
  }

  const program = new Command()
    .name('tour-networks')
    .description(
      'Attempt registration against the checked-in IRC network list and record one event log per attempt.',
    )
    .showHelpAfterError()
    .option('--start-at <n>', '1-based index to start from', parsePositiveInt, 1)
    .option('--limit <n>', 'only run this many networks', parsePositiveInt)
    .option('--skip-tls', 'skip TLS server entries from the checked-in network list', false)

  program.parse(argv, { from: 'user' })

  return program.opts<TourOptions>()
}

if (import.meta.main) {
  runTour(parseArgs(process.argv.slice(2))).catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
