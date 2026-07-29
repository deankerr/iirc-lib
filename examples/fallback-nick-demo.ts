import { createMockTransport } from '../src/mock-transport'
import { createRuntime } from '../src/runtime'

const nickCandidates = ['iirc-demo', 'iirc-demo_', 'iirc-demo__']
const [initialNick, ...fallbackNicks] = nickCandidates

if (initialNick === undefined) {
  throw new Error('At least one nickname candidate is required')
}

const transport = createMockTransport()
const runtime = createRuntime({ nick: initialNick, sendDelayMs: 0 }, transport.stream)
const remainingFallbacks = fallbackNicks.values()

runtime.transport.on('read', (line) => {
  console.log(`server → ${line}`)
})

runtime.transport.on('write', (line) => {
  console.log(`client → ${line}`)
})

// Nickname selection is consumer policy. The registration feature exposes the
// typed rejection and leaves the session open, so a consumer can send another
// NICK without reaching into registration internals.
runtime.on('event', (event) => {
  if (event.command !== 'ERR_NICKNAMEINUSE' || runtime.connectionState.registered) {
    return
  }

  const fallbackNick = remainingFallbacks.next().value
  if (fallbackNick === undefined) {
    console.error('No fallback nicknames remain')
    return
  }

  console.log(`"${event.nick}" is unavailable; trying "${fallbackNick}"`)
  runtime.send('NICK', fallbackNick)
})

runtime.on('registered', () => {
  console.log('registered:', runtime.connectionState)
})

runtime.register()

// Drive the registration exchange as though the first two nicknames are
// occupied and the server accepts the final fallback.
transport.receive([
  ':irc.example.test 433 * iirc-demo :Nickname is already in use',
  ':irc.example.test 433 * iirc-demo_ :Nickname is already in use',
  ':irc.example.test 001 iirc-demo__ :Welcome to the test network',
])
