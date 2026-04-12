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
import { Client } from 'iirc-lib'

const client = new Client({
  nick: 'bot',
  user: 'bot',
  realname: 'Bot',
  password: process.env.IRC_PASSWORD,
  sasl: {
    username: 'bot',
    password: process.env.IRC_SASL_PASSWORD!,
  },
})

client.on('registered', () => {
  client.send('JOIN', '#dev')
})

client.on('message', (message) => {
  console.log(message.command, message.params)
})

const stream = connect({ host: 'irc.example.com', port: 6667 })
client.attach(stream)
```

## Config

`Client` currently accepts:

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
- pre-registration nick retry on `433 ERR_NICKNAMEINUSE`
- self/server identity tracking from `001`, `004`, and `NICK`
- `005 RPL_ISUPPORT` token capture
- CAP negotiation with multiline `LS` handling and `NEW`/`DEL`
- SASL PLAIN authentication

## Capability Registry

The built-in capability registry lives in
[src/runtime/features/capability-registry.ts](/Users/dean/code/iirc-lib/src/runtime/features/capability-registry.ts).

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
