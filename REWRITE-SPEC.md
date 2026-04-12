# @iirc/irc Rewrite Spec

Status: Draft
Date: 2026-03-24

This document specifies the planned rewrite of `@iirc/irc` around a disposable session core and a high-level client facade.

It intentionally focuses on reimplementing the package's current feature set in a structure that can support future IRCv3 work cleanly. It does not specify the concrete implementation of CAP, SASL, or other future features.

Where details are unresolved, they are marked as:

- `Recommendation` for the current preferred direction
- `Open question` for decisions that still need review
- `Unknown` for details that are intentionally deferred

## Scope

This rewrite covers:

- baseline IRC RFC behavior currently implemented by the package
- UTF-8-only operation
- parsed protocol primitives
- a disposable single-connection session
- a high-level reconnect-capable client facade
- current derived state and helper APIs

This rewrite does not yet cover:

- IRCv3 CAP negotiation
- SASL
- echo-message behavior beyond preserving room for it in the design
- synthetic local events
- additional consumer features outside this package

## Design Goals

- The primary API should be easy to use for normal consumers.
- Lower-level primitives should remain public and composable.
- The public event model should not fragment into `onJoin` / `onMessage` / `onPart` style APIs.
- Consumers should receive a canonical stream of IRC messages suitable for buffer-centric client behavior.
- Consumers should be able to build additional behavior on top of the primitives if the package does not implement it directly.
- Reconnection should replace the entire single-connection state graph rather than attempting to reset it in place.
- Baseline IRC must remain correct even when no IRCv3 features exist.
- Future IRCv3 features must be able to slot into the design as progressive enhancement.
- DX takes priority over imitating low-level IRC client designs from older ecosystems.

## Architectural Summary

The rewritten package is split into four layers:

1. `wire`

- Owns UTF-8 line framing over a Node stream.
- Parses raw IRC lines into structured messages.
- Builds outbound IRC lines from commands and params.
- Handles byte budgeting and UTF-8-safe outbound splitting.

2. `session`

- Represents one disposable IRC connection.
- Owns registration, PING/PONG, nick collision handling, and socket lifecycle.
- Emits canonical inbound events.
- Does not own reconnect logic.
- Does not own channel tracking or message routing state.

3. `state`

- Reducer/subscriber style modules attached to a session event stream.
- Derive client-facing state such as self identity, ISUPPORT, channels, and message enrichment.
- Disposable and recreated alongside each new session.

4. `client`

- High-level facade class for normal consumers.
- Assembles the default session + state stack.
- Exposes the ergonomic API.
- Owns reconnect behavior by replacing the active session graph.

## Primary Public API

`Recommendation`

The primary public API should be a class:

```ts
const client = new Client({
  nick: 'bot',
  user: 'bot',
  realname: 'Bot',
  password: 'secret',
  sendDelay: 0,
  reconnect: { baseDelay: 1000, maxDelay: 30000 },
})
```

This class should be inert at construction time. Creating a client must not require an active stream.

The client should support two connection styles:

```ts
client.attach(stream)
client.connect(() => net.connect({ host: 'irc.example.com', port: 6667 }))
```

Meaning:

- `attach(stream)` uses a stream provided by the consumer
- `connect(factory)` asks the library to obtain a new stream when needed

Reconnect requires a stream factory, since a disconnected IRC connection cannot be resumed.

## Low-Level Public API

The package should also expose lower-level primitives:

- `Session`
- line framing / parser / builder utilities
- ISUPPORT state
- message enrichment utilities
- channel tracker
- send queue and text splitting helpers

These are public to support:

- custom assembly by advanced consumers
- isolated tests
- future substitution of package-owned pieces with consumer-owned pieces

The high-level client remains the primary documented interface.

## Core Types

### `IrcLine`

```ts
type IrcLine = string
```

Raw UTF-8 decoded IRC line text without application-specific interpretation.

### `IrcMessage`

```ts
type IrcMessage = {
  tags?: Record<string, string>
  source?: string
  command: string
  params: string[]
}
```

This is the canonical parsed protocol shape.

### `ClientMessage`

```ts
type ClientMessage = IrcMessage & {
  target?: string
  fromSelf: boolean
}
```

This is an enriched client-facing message view intended for buffer-oriented consumers.

`Recommendation`

`ClientMessage` should exist above the session layer. It is not the protocol's foundational message type.

## Event Model

### Session events

`Session` should emit:

- `line`
  - payload: `IrcLine`
  - every inbound IRC line after UTF-8 decoding and line framing
- `raw`
  - payload: `IrcMessage`
  - every successfully parsed inbound IRC message
- `registered`
  - payload: none
  - emitted when registration completes on `001`
- `close`
  - payload: none
  - emitted when the underlying connection is closed
- `error`
  - payload: `Error`
  - transport/socket errors only

`Recommendation`

`Session` should not emit the enriched `message` event by default. Enrichment belongs in the state/facade layer.

### Client events

`Client` should emit:

- `line`
- `raw`
- `message`
  - payload: `ClientMessage`
- `registered`
- `close`
- `error`
- `reconnecting`
- `reconnected`
- `exhausted`

This preserves the high-DX consumer interface while keeping lower layers canonical.

## Connection Model

Both `Session` and `Client` must be constructible before any transport exists.

### `Session`

Proposed shape:

```ts
class Session extends EventEmitter<SessionEvents> {
  constructor(config: SessionConfig)
  attach(stream: Duplex): void
  connect(factory: () => Duplex): void
}
```

Rules:

- A session is single-use.
- Once the session has terminated, it is not reset and reused.
- `attach(stream)` and `connect(factory)` both start the session lifecycle.
- Calling either while already active is an error.

`Open question`

Do we want both `attach(stream)` and `connect(factory)` on `Session`, or only `attach(stream)` and let consumers call the factory themselves? The current recommendation is to allow both for symmetry with `Client`.

### `Client`

Proposed shape:

```ts
class Client extends EventEmitter<ClientEvents> {
  constructor(config: ClientConfig)
  attach(stream: Duplex): void
  connect(factory: () => Duplex): void
}
```

Rules:

- The client facade owns the current active `Session`.
- If reconnect is configured, only `connect(factory)` supports reconnect.
- If the client was started via `attach(stream)`, disconnect ends the client lifecycle unless the consumer later initiates a fresh connection explicitly.

`Open question`

Should `Client.attach(stream)` be allowed when reconnect config is present, with reconnect simply disabled for that run, or should that combination throw? Recommendation: allow it, and document that reconnect only operates when a factory has been provided.

## State Machines

## Session lifecycle

The session state machine should be explicit.

Proposed states:

- `idle`
- `connecting`
- `registering`
- `connected`
- `closed`
- `error`

Rules:

- Construction starts in `idle`.
- `attach(stream)` or `connect(factory)` enters `connecting`.
- After the stream is attached and registration commands are sent, the session enters `registering`.
- Receipt of `001` transitions to `connected`.
- Socket close transitions to `closed`.
- Transport error transitions to `error`.
- `closed` and `error` are terminal for the session instance.

`Unknown`

Whether `connecting` and `registering` should remain externally visible as distinct public statuses or be collapsed into a simpler API is still a presentation decision. Internally they should remain distinct.

## Registration state machine

Registration is a sub-state machine within a single session.

Owned responsibilities:

- send `PASS` if configured
- send initial `NICK`
- send `USER`
- respond to `PING` during registration
- accept `001` as registration success
- handle `433 ERR_NICKNAMEINUSE` retry policy during registration only

Nick collision policy:

- base nick retries as `nick2`, `nick3`, `nick4`, and so on
- once `001` is received, nick collision recovery stops being automatic

This state machine exists now because later CAP/SASL work will need to slot into registration without rewriting the entire session layer.

## Client reconnect state machine

Reconnect belongs to `Client`, not `Session`.

Proposed states:

- `idle`
- `connecting`
- `connected`
- `waiting`
- `exhausted`

Reconnect behavior:

- unexpected disconnect triggers reconnect only when reconnect config exists and a stream factory is available
- a fresh session graph is created for each attempt
- previous state modules are discarded with the old session
- durable intent needed for reconnect, such as joined channel names, is captured by the facade before replacement

This follows the core IRC rule that reconnect is a brand new connection, not a resumed one.

## Layer Responsibilities

### `wire`

Responsibilities:

- set stream encoding to UTF-8
- frame inbound data into complete IRC lines
- emit raw inbound line text
- parse lines into `IrcMessage`
- build outbound command lines
- split outbound text on UTF-8-safe boundaries
- account for IRC line length budgeting

Non-responsibilities:

- channel tracking
- reconnect
- message routing semantics
- registration policy beyond low-level send/build helpers

`Open question`

Should outbound line observation be part of `wire` for debugging and consumer extensibility? Recommendation: not required for the first rewrite, but keep the design open to adding it without breakage.

### `session`

Responsibilities:

- own one active stream
- drive registration
- respond to server `PING`
- parse inbound lines into `IrcMessage`
- emit canonical inbound events
- maintain session-scoped lifecycle state

Non-responsibilities:

- reconnect
- channels
- higher-level buffer routing
- synthetic events

### `state`

State modules subscribe to canonical session events and derive richer behavior.

Current rewrite should include:

- self tracker
- ISUPPORT tracker
- server info tracker
- message enrichment
- channel tracker

These modules should be disposable and easy to recreate when the facade swaps sessions.

`Recommendation`

State modules should use a common lifecycle shape, even if it remains internal initially:

```ts
type SessionModule = {
  attach(session: Session): void
  detach(): void
}
```

This is worth formalizing early because future IRCv3 work will likely need the same composition pattern.

### `client`

Responsibilities:

- construct and own the default stack
- expose the consumer-friendly API
- proxy the canonical and enriched event streams
- own reconnect behavior
- preserve durable client intent across reconnect

Non-responsibilities:

- low-level parsing rules
- in-place session reset

## Default State Modules

### Self tracker

Tracks:

- current nick
- known user
- known host

Sources:

- `001` authoritative nick
- self-sourced `NICK`
- self-sourced messages carrying `nick!user@host`

### Server info tracker

Tracks:

- server host from `001` source
- server version from `004`

### ISUPPORT tracker

Tracks:

- raw `005` token state
- typed helpers for casemapping, chantypes, prefix, and related RFC defaults

### Message enricher

Produces `ClientMessage` from `IrcMessage` and current state.

Initial responsibilities:

- fill `source` from known server host when absent
- compute `target`
- compute `fromSelf`

`Recommendation`

The enricher should be a dedicated component rather than logic embedded in `Session` or `Client`. This keeps message semantics separate from transport and lifecycle concerns.

### Channel tracker

Tracks current baseline channel state:

- joined flag
- topic
- topic metadata
- channel modes
- users
- per-user prefix modes

Message sources:

- `JOIN`
- `PART`
- `KICK`
- `QUIT`
- `NICK`
- `TOPIC`
- `332`
- `333`
- `MODE`
- `353`

Dependencies:

- casemapping from ISUPPORT
- self-identification from self tracking / enricher context

`Recommendation`

The channel tracker should consume canonical parsed messages plus required context dependencies. It should not depend on direct knowledge of the transport or reconnect logic.

## Message Enrichment Rules

The default `Client` should expose a `message` event using a buffer-centric message view.

Initial enrichment rules match the current behavior:

- `PRIVMSG` or `NOTICE` to a channel targets the channel
- `PRIVMSG` or `NOTICE` to us targets the sender nick
- `JOIN`, `PART`, `KICK`, `TOPIC` target `params[0]`
- channel `MODE` targets the channel
- user `MODE` has no target
- channel-scoped numerics target the relevant channel param
- server/global messages have no target
- `fromSelf` is computed from current known self identity, without synthetic local sends

This must remain valid in a world where `echo-message` may later exist, but the current rewrite does not implement that feature.

`Open question`

Should the enricher consume only `raw` messages and a read-only state view, or should it also have access to session lifecycle state? Recommendation: only parsed messages plus read-only state.

## Sending API

The high-level client should preserve a helper-based outbound API:

- `send(command, ...params)`
- `join(channel, key?)`
- `part(channel, reason?)`
- `privmsg(target, text)`
- `notice(target, text)`
- `ping(token)`
- `pong(token)`
- `setNick(nick)`
- `quit(reason?)`

Sending behavior:

- low-level send builds correct trailing params
- `PRIVMSG` and `NOTICE` text may be split on UTF-8-safe boundaries
- queueing/flood protection remains available
- `QUIT` and `PONG` bypass normal queueing

`Unknown`

Whether the send queue belongs under `wire`, `session`, or as a small adjacent outbound pipeline module is mostly organizational. Functionally it remains part of the outbound path. Recommendation: keep it as a separate reusable primitive used by `Session`.

## Transport Policy

Transport remains consumer-owned in terms of technology choice.

The package accepts Node-compatible duplex streams and does not wrap TLS, DNS, or connection policy itself.

This preserves:

- testability
- stream injection
- separation between IRC protocol logic and transport setup

## Internal Access for Advanced Consumers

The design should permit advanced consumers to attach to lower layers without making the high-level facade leaky.

`Recommendation`

`Client` should expose the current active session as a readonly property or getter:

```ts
client.session // Session | undefined
```

This gives advanced consumers a way to subscribe to canonical lower-level events.

`Open question`

Is a plain readonly property enough, or do we also want a session lifecycle event when the active session object changes across reconnect? This may matter for advanced composition.

## Public Composition Strategy

The package should support two styles of use:

### High-level

Consumer uses `Client` and gets:

- reconnect support
- state tracking
- enriched messages
- ergonomic helpers

### Low-level

Consumer builds on primitives:

- constructs `Session` directly
- attaches selected state modules
- consumes `line` and `raw`
- optionally adds custom enrichment or synthetic local behavior

The rewrite should favor exposing reusable primitives over adding many configuration toggles to the main `Client` constructor.

`Recommendation`

The first rewrite should keep the high-level `Client` constructor opinionated and assemble the full default stack. Custom compositions should primarily happen by using the lower-level public pieces directly.

## File Layout

Exact filenames may change, but the rewrite should follow this structure:

```text
src/
  index.ts
  wire/
    line-framer.ts
    parser.ts
    builder.ts
    split.ts
    send-queue.ts
  session/
    session.ts
    registration.ts
    types.ts
  state/
    self.ts
    server-info.ts
    isupport.ts
    message-enricher.ts
    channels.ts
    types.ts
  client/
    client.ts
    reconnect.ts
    types.ts
```

`Unknown`

Whether registration should be a helper used by `Session` or a dedicated internal object is still flexible. The important constraint is that it be a distinct state machine with a clean boundary.

## Testing Strategy

The new structure should support tests at multiple levels:

1. Pure protocol tests

- parser
- builder
- split logic
- ISUPPORT parsing
- mode parsing

2. Session tests

- registration
- PING/PONG
- nick collision
- lifecycle events

3. State module tests

- self tracking
- message enrichment
- channels

4. Client tests

- default assembly
- reconnect behavior
- event continuity across session replacement

This is one of the main reasons to keep the layers explicit.

## Migration Notes

The current package exports both a low-level `Client` and a `createClient` facade. The rewrite should converge this split.

Target public direction:

- high-level facade becomes `Client`
- disposable low-level primitive becomes `Session`

`Open question`

Should we preserve compatibility aliases temporarily, or treat this rewrite as a deliberate API break inside the monorepo? Recommendation: treat it as a deliberate package-level API cleanup unless compatibility pressure appears during consumer migration.

## Non-Goals

The rewrite is not trying to:

- implement all future IRCv3 features immediately
- design a per-command event emitter API
- support non-UTF-8 encodings
- hide all protocol details from advanced consumers
- resume a disconnected IRC connection in place

## Acceptance Criteria

The rewrite is successful if:

- the default `Client` reproduces the package's current feature set
- `Session` can be used independently in tests and advanced consumers
- reconnect is implemented by replacing disposable session graphs
- state tracking is no longer embedded in the single-session core
- `raw` remains canonical and `message` remains a high-DX enriched view
- future IRCv3 work can be added by extending registration/session/state boundaries rather than rewriting them
