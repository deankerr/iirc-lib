# Architecture

## Overview

```
┌─────────────────────────────────────────┐
│           Application Layer             │  ← Your code
├─────────────────────────────────────────┤
│              Client                     │  ← Connection lifecycle, events, state
├─────────────────────────────────────────┤
│           Protocol Helpers              │  ← Parser, ISUPPORT, casemapping, numerics
├─────────────────────────────────────────┤
│           Node.js Streams               │  ← net.connect / tls.connect
└─────────────────────────────────────────┘
```

## File Structure

```
src/
├── index.ts                    # Exports: Client, types
├── client/
│   ├── client.ts               # Client class
│   ├── channels.ts             # Channel state tracker (JOIN/PART/KICK/QUIT/NICK/TOPIC/MODE/353)
│   └── protocol/
│       ├── parser.ts           # parseMessage, IrcMessage type
│       ├── isupport.ts         # IsupportState, applyIsupportTokens
│       ├── casemapping.ts      # casefold, caseEqual, getCasemapping
│       ├── modes.ts            # parseChanModes, parseModeChanges, parseNamesReply
│       └── numerics.ts         # Numeric constants (001, 433, etc.)
```

## Client Responsibilities

The `Client` class handles:

1. **Stream management** — Buffering, line splitting, encoding
2. **Registration** — PASS/NICK/USER on connect, PING response
3. **State tracking** — Nick (from 001 and NICK), ISUPPORT, server info
4. **Channel tracking** — `client.channels` tracks JOIN/PART/KICK/QUIT/NICK/TOPIC/MODE/353
5. **Message enrichment** — Computes `target` for buffer routing
6. **Event emission** — `raw`, `message`, `registered`, `close`, `error`

## Message Flow

```
Stream data
    ↓
Buffer + split lines
    ↓
parseMessage() → IrcMessage
    ↓
Internal handling (PING, 001, 005, NICK, ERROR)
    ↓
emit('raw', msg)
    ↓
enrichMessage() → ParsedMessage (adds target)
    ↓
emit('message', enrichedMsg)
```

## Target Computation

The `target` field on `ParsedMessage` indicates where the message should be routed in a buffer-centric UI:

| Message Type              | Target                      |
| ------------------------- | --------------------------- |
| PRIVMSG/NOTICE to channel | Channel name                |
| PRIVMSG/NOTICE to us (PM) | Sender's nick (flipped!)    |
| JOIN/PART/KICK/TOPIC      | Channel from params[0]      |
| MODE (channel)            | Channel name                |
| MODE (user)               | undefined                   |
| RPL\_\* with channel      | Channel name                |
| ERR\_\* numerics          | undefined (server messages) |
| Everything else           | undefined                   |

Design choice: ERR\_\* numerics stay as server messages (errors should be visible, not buried in channel buffers).

## Transport Philosophy

We don't abstract transport. User creates their stream and passes it to `connect()`:

```typescript
const client = new Client({ nick: 'bot', user: 'bot', realname: 'Bot' })

// Plain TCP
const stream = connect({ host: 'irc.example.com', port: 6667 })
client.connect(stream)

// Or TLS
const stream = connect({ host: 'irc.example.com', port: 6697 })
client.connect(stream)
```

The two-step pattern (construct then connect) enables:

- Testing with mock transports
- Attaching event handlers before connection starts
- Clear separation between identity config and transport

Why no transport abstraction? Abstracting across `Bun.connect` and `node:net/tls` added complexity without benefit. Node streams are battle-tested and Bun supports them via compatibility.

## State Management

All state is reactive — updated only from server messages:

| State                | Updated From                                            |
| -------------------- | ------------------------------------------------------- |
| `nick`               | 001 params[0], NICK command                             |
| `serverInfo.host`    | 001 source                                              |
| `serverInfo.version` | 004 params[2]                                           |
| `isupport`           | 005 tokens                                              |
| `status`             | Connection events, 001, ERROR                           |
| `channels`           | JOIN, PART, KICK, QUIT, NICK, TOPIC, MODE, 332-333, 353 |

We send _requests_. The server sends _facts_.

## Error Handling

Only **socket errors** trigger the `error` event.

The IRC `ERROR` command flows through the `message` event like any other command. Despite its name, ERROR is simply the server's way of announcing connection termination — it always precedes the server closing the socket. Common ERROR scenarios:

- QUIT acknowledgment: `ERROR :Closing connection: nick[user@host] ("Quit message")`
- Connection timeout: `ERROR :Connection timeout`
- Killed by operator: `ERROR :Closing Link: ... (Killed (oper (reason)))`

After ERROR, the server closes the connection, triggering the `close` event.

IRC error numerics (433, 432, etc.) are also NOT errors in the event sense. They flow through `message` normally.

## Protocol Gotchas

| Issue                    | Handling                                                                |
| ------------------------ | ----------------------------------------------------------------------- |
| Trailing param           | Just a normal param. Stored in `params[]`.                              |
| Command case             | Normalized to uppercase on parse.                                       |
| Numerics                 | Just commands. `001` is like `PRIVMSG`.                                 |
| Your actual nick         | 001 params[0] is authoritative, may differ from requested.              |
| PING during registration | Servers may PING before 001. We respond.                                |
| Casemapping              | Nick/channel equality depends on ISUPPORT CASEMAPPING. Default rfc1459. |
| Source absence           | Any message can lack source. We fill from serverInfo.host when missing. |

## Out of Scope

| Category       | Reason                                               |
| -------------- | ---------------------------------------------------- |
| IRCv3 CAP/SASL | Baseline IRC must work first                         |
| Bot framework  | Auto-reconnect, commands, plugins belong in userland |
| Rate limiting  | Application concern                                  |
