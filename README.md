# iirc-lib

A stream-based IRC client library for Node and Bun.

You provide the transport — any `Duplex` stream. The library handles wire
framing, canonical message parsing, typed event enrichment, registration, CAP
negotiation, SASL PLAIN, and channel state tracking. It stays faithful to the
wire: enrichment adds clarity on top of the raw protocol, it never hides it.

- **ESM only.** `type: module`; there is no CommonJS build. CJS consumers must
  use dynamic `import()`.
- **Node ≥ 22 or Bun.** Zero runtime dependencies.

## Install

```bash
npm install iirc-lib
# or
bun add iirc-lib
```

## Quick start

```ts
import { connect } from 'node:net'
import { createRuntime } from 'iirc-lib'

const socket = connect({ host: 'irc.libera.chat', port: 6667 })
const runtime = createRuntime({ nick: 'demobot' }, socket)

// Registration is explicit: start the CAP/NICK/USER burst once the socket is
// open, so you can observe transport I/O beforehand if you want to.
socket.on('connect', () => runtime.register())

runtime.on('registered', () => runtime.send('JOIN', '#demo'))

runtime.on('event', (event) => {
  if (event.command === 'PRIVMSG') {
    // `event` is narrowed here: `target` and `text` are typed and present.
    console.log(`${event.from.name} → ${event.target}: ${event.text}`)
  }
})

runtime.on('close', () => console.log('session finished'))
```

## Providing a transport

`createRuntime(config, stream)` accepts any `Duplex` — TCP, TLS, a proxied
socket, or a mock stream in tests. The library never opens a connection itself.

```ts
import { connect as tlsConnect } from 'node:tls'

// TLS: register on 'secureConnect' rather than 'connect'.
const socket = tlsConnect({ host: 'irc.libera.chat', port: 6697 })
const runtime = createRuntime({ nick: 'demobot' }, socket)
socket.on('secureConnect', () => runtime.register())
```

Because the transport is just a stream, tests can drive a full session against
an in-memory `Duplex` with no network at all.

The stream stays yours, with one contract: it must be a binary byte stream. Do
not call `setEncoding()` and do not use `objectMode` — IRC line limits are byte
limits, and framing is only sound on bytes, so construction verifies this once
and throws otherwise. Everything else about the stream (pausing, lifecycle
options, extra listeners, pipes) remains under your control.

## Configuration

`createRuntime` validates its config at the boundary and fails loudly on bad
input. Only `nick` is required.

| Option                  | Type                             | Default            | Notes                                                       |
| ----------------------- | -------------------------------- | ------------------ | ----------------------------------------------------------- |
| `nick`                  | `string`                         | —                  | Required.                                                   |
| `user`                  | `string`                         | `nick`             | Username sent in the `USER` command.                        |
| `realname`              | `string`                         | `nick`             | Realname / gecos field.                                     |
| `password`              | `string`                         | —                  | Server password (`PASS`), not SASL.                         |
| `sasl`                  | `{ username: string; password }` | —                  | Enables SASL PLAIN and auto-requests the `sasl` capability. |
| `sendDelayMs`           | `number`                         | `1500`             | Minimum delay between outbound lines (flood protection).    |
| `requestedCapabilities` | `string[]`                       | `['message-tags']` | Extra capabilities to request; merged over the defaults.    |

```ts
const runtime = createRuntime(
  {
    nick: 'demobot',
    sasl: { username: 'demobot', password: process.env.IRC_PASSWORD! },
  },
  socket,
)
```

## Consuming events

All enriched traffic arrives on a single `event` stream. `IrcEvent` is a
discriminated union keyed on `command`; narrow it with a check on
`event.command` and the command-specific fields become typed.

```ts
import type { IrcEvent, IrcEventOf } from 'iirc-lib'

runtime.on('event', (event: IrcEvent) => {
  switch (event.command) {
    case 'PRIVMSG':
      handleMessage(event) // typed as IrcEventOf<'PRIVMSG'>
      break
    case 'JOIN':
      console.log(`${event.from.name} joined ${event.channel}`)
      break
    case 'UNKNOWN':
      // No enricher for this command — read event.raw.command.
      break
  }
})

// Use IrcEventOf<T> to type a handler for a single command.
function handleMessage(event: IrcEventOf<'PRIVMSG'>) {
  console.log(event.target, event.text)
}
```

Every event carries:

- `command` — the discriminant. Numerics resolve to their spec name (`001` →
  `RPL_WELCOME`); ~140 commands and replies have typed payloads.
- `from` — the parsed source: `{ name, user?, host?, isSelf }`.
- `raw` — the untouched `IrcMessage` (`{ tags, source, command, params }`).
  Enrichment never discards protocol data; drop down to `raw` for anything the
  enricher didn't surface.

Unrecognized commands arrive as an `UNKNOWN` event with the raw message intact,
so you can listen at the wire level for anything not yet enriched.

## Sending

`send()` has two shapes — a shorthand for common commands and the canonical
command object:

```ts
runtime.send('PRIVMSG', '#demo', 'hello') // string + params
runtime.send({ command: 'PRIVMSG', params: ['#demo', 'hello'] }) // full shape
```

There is deliberately no per-command helper surface. `send()` speaks the
protocol directly, and the typed events make the replies legible.

## Reading state

The runtime tracks a narrow, always-available slice of session state:

```ts
runtime.connectionState // { nick, user, realname, registered, serverHost?, account?, ... }
runtime.isupport // ISUPPORT params + derived CASEMAPPING / CHANMODES / PREFIX
runtime.activeCaps // Set<string> of negotiated capabilities
runtime.channels // case-folded map of joined channels → members, modes, topic
runtime.transport // the wire boundary — emits every raw line in and out
```

The transport frames and length-checks inbound data as bytes, then decodes each
complete line as UTF-8. Above that boundary, lines, messages, and events remain
one focused string-based flow.

## Protocol helpers

The runtime exposes the same toolkit its built-in features use, so consumers
never reimplement the fiddly parts:

```ts
runtime.caseFold(name) // fold per the server's CASEMAPPING
runtime.sameIdentifier(a, b) // compare two identifiers correctly
runtime.isChannel(target) // is this a channel per ISUPPORT PREFIX?
runtime.parseSource(source) // name[!user][@host] → ParsedSource
runtime.parseNames(namesReply) // NAMES tokens → { nick, mode? }[]
runtime.parseModeChanges(modes, args) // modestring → flat ModeChange[]
```

## Lifecycle events

Beyond the `event` stream, the runtime emits:

| Event         | Payload          | When                                            |
| ------------- | ---------------- | ----------------------------------------------- |
| `register`    | `stream`         | You called `register()`; the burst begins.      |
| `registered`  | —                | Registration completed; safe to `JOIN`.         |
| `parse_error` | `message, error` | A line failed to enrich; the session continues. |
| `close`       | —                | Stream closed. **Terminal** — session finished. |
| `error`       | `Error`          | Transport error. **Terminal.**                  |

Error and close are terminals: no recovery, no retry. **One runtime, one
transport, one session** — the library never reconnects or resumes. To
reconnect, build a new runtime from scratch. That policy belongs to you.

## Built-in features

Behaviour ships as **features** — plain `(runtime) => void` functions that
subscribe to the same event stream you do. They have no privileged access; a
consumer can do anything a built-in feature can.

| Feature           | Does                                                          |
| ----------------- | ------------------------------------------------------------- |
| `registration`    | CAP LS/REQ/END negotiation, SASL PLAIN, NICK/USER burst       |
| `ping`            | automatic PONG replies                                        |
| `identity`        | tracks post-registration nick and account state               |
| `isupport`        | ISUPPORT parameters with derived CASEMAPPING/CHANMODES/PREFIX |
| `channel-tracker` | members, prefix modes, topics, join/part/quit/kick/nick       |

Adding your own is the same pattern — subscribe and react:

```ts
function echo(runtime) {
  runtime.on('event', (event) => {
    if (event.command === 'PRIVMSG' && !event.from.isSelf) {
      runtime.send('PRIVMSG', event.target, event.text)
    }
  })
}

echo(runtime)
```

## Design

IRC is a 35-year-old protocol whose spec is more observed than specified. Every
server implements it slightly differently, and a client library's real job is
normalization — turning inconsistent wire behaviour into a coherent, typed
interface without pretending the protocol is simpler than it is.

- **Observe the server, don't police it.** Record what the server says; when
  something unexpected arrives, stay put and wait. No assertions about server
  correctness.
- **One canonical event stream.** Not an emitter per command. Every feature and
  every consumer subscribes to the same `event` stream.
- **Capabilities are progressive enhancement.** Every IRCv3 capability also
  works when absent — each one is isolated and composable.
- **Terminal sessions.** One runtime, one transport, one session; error states
  are terminal. Reconnection is consumer policy.
- **Small public surface.** No sprawling command-helper API and no false safety
  layers over the wire.

## What it deliberately does not do

- Reconnect, resume, or retry — start a new session from scratch.
- Buffer/window management or message routing — that's client policy.
- Hide the wire — `runtime.transport` emits every raw line in and out.

## Testing

```bash
bun test
```

The test suite covers the parser, encoder, transport framing, runtime, and
stateful features, largely table-driven against protocol fixtures. `docs/`
contains an abridged copy of the
[Modern IRC](https://modern.ircdocs.horse/) spec the implementation was written
against. [Known interoperability issues](docs/known-issues.md) records
anonymised examples of observed server deviations and the library's current
behaviour around them.

## License

MIT
