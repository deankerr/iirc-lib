# iirc-lib

IRC client library. Protocol parsing, connection lifecycle, state tracking, message enrichment.

## Usage

```typescript
import { connect } from 'node:net'
import { Client } from 'iirc-lib'

const client = new Client({ nick: 'bot', user: 'bot', realname: 'Bot' })
client.on('registered', () => client.join('#dev'))
client.on('message', (msg) => console.log(msg.target, msg.command, msg.params))

const stream = connect({ host: 'localhost', port: 6667 })
client.connect(stream)
```

## Design

- **Stream-based** — you provide transport (`net.connect`/`tls.connect`), we handle protocol
- **Server is authority** — all state reactive from server messages only
- **Buffer-centric** — `target` field on ParsedMessage enables UI routing
- **Unified `message` event** — no per-command events, one stream for everything
- **Channel tracker** — tracks members, topic, modes from server messages
- **Legacy-compatible** — works without IRCv3
- **Every cap must also not exist** — each IRCv3 capability is progressive enhancement. The client must work correctly without it. Adding a cap increases the permutation space (enabled × disabled), so each one must be isolated and composable. This is the CAP system's design constraint — respect it or drown in complexity.

## Protocol Gotchas

- Trailing params are just normal params in `params[]`
- Commands normalized to uppercase on parse. Numerics are commands (`001` = `PRIVMSG`)
- Server assigns your actual nick via 001 params[0], may differ from requested
- CASEMAPPING (from ISUPPORT) affects nick/channel equality — default rfc1459
- IRC `ERROR` command flows through `message` event, not `error` event
- Source can be absent on any message — filled from `serverInfo.host`

## Testing

```bash
bun test    # from this package
```

## Module Pattern

The structure in this document need not be followed to the letter, but it's generally valuable:

@module-glossary.md
