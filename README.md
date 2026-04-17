# iirc-lib

Stream-based IRC client library.

You provide the transport. The library handles wire framing, canonical message
parsing, registration, CAP negotiation, and SASL PLAIN.

## Install

```bash
bun install
```

## Use

```ts
import { connect } from 'node:net'
import { createRuntime } from 'iirc-lib'

const stream = connect({ host: 'irc.example.com', port: 6667 })

const runtime = createRuntime(
  {
    nick: 'bot',
    user: 'bot',
    realname: 'Bot',
    password: process.env.IRC_PASSWORD,
    sasl: {
      username: 'bot',
      password: process.env.IRC_SASL_PASSWORD!,
    },
  },
  stream,
)

runtime.on('registered', () => {
  runtime.send('JOIN', '#dev')
})

runtime.on('message', (message) => {
  console.log(message.command, message.params)
})
```

## Config

`createRuntime()` currently accepts:

- `nick`
- `user`
- `realname`
- `password?`
- `sendDelayMs?`
- `requestedCapabilities?`
- `sasl?`

SASL config currently supports:

- `username`
- `password`
- `mechanism?` with `PLAIN`
- `authorizationIdentity?`
- `required?`

## Built-in Behavior

Built-in runtime features currently provide:

- startup registration with `CAP LS 302`, optional `PASS`, then `NICK` and `USER`
- automatic `PING`/`PONG`
- self/server identity tracking from `001`, `004`, and `NICK`
- `005 RPL_ISUPPORT` token capture
- CAP negotiation with multiline `LS` handling and `NEW`/`DEL`
- SASL PLAIN authentication

## Capability Registry

The built-in capability registry currently lives alongside the negotiation logic in
[src/runtime/features/capabilities.ts](/Users/dean/code/iirc-lib/src/runtime/features/capabilities.ts).

The current built-in requested capabilities are:

- `message-tags`
- `server-time`
- `echo-message`
- `account-notify`
- `account-tag`
- `extended-join`
- `away-notify`
- `chghost`
- `multi-prefix`
- `userhost-in-names`

Additional capabilities can be requested with `requestedCapabilities`.

## Test

```bash
bun test
```
