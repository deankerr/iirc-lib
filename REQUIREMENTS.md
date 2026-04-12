# @iirc/irc — Requirements

Standalone IRC client library. Used by the iirc IRC plugin and potentially other projects. Must work independently of the iirc server architecture.

See `ARCHITECTURE.md` for current internal design — protocol layer, message flow, target computation, state management.

## Design Principles

- **Stream-based** — consumer provides transport via a connect function, library handles protocol
- **Server is authority** — all state reactive from server messages
- **Graceful degradation** — every IRCv3 capability is progressive enhancement; baseline IRC always works without any of them
- **EventEmitter API** — unified `message` event, no per-command events

## R1: Nick Collision Handling

**When:** Server sends `433 ERR_NICKNAMEINUSE` during registration (before 001).

**Behavior:**

- Append incremental numeric suffix starting with `2`: `nick` → `nick2` → `nick3` → ...
- Only during registration. After 001, nick collisions are the consumer's problem.
- Send new NICK command automatically.
- Once registered (001), `self.nick` reflects whatever nick succeeded.

**Not in scope:** Consumer-defined alternate nick strategies, ghost/regain flows.

## R2: Reconnection

Activates when `reconnect` config is present. On unexpected disconnect, creates a fresh inner Client and reconnects.

**Behavior:**

- Activates on unexpected `close` (socket closed without us sending QUIT).
- Exponential backoff with jitter. Configurable base delay, max delay, max attempts (or infinite).
- On reconnect: snapshots joined channel names from channel tracker, creates fresh inner Client, calls consumer's connect function, passes stream to new Client. All modules re-attach.
- On successful registration (001): re-joins previously joined channels.
- On explicit `quit()`: no reconnection.
- Additional events: `reconnecting` (attempt number), `reconnected`, `exhausted` (max attempts reached).

## R3: IRCv3 — CAP Negotiation

Activates when any cap-dependent config is present. Foundation for all IRCv3 features.

- Sends `CAP LS 302` alongside NICK/USER during registration.
- Collects server's capability list from `CAP LS` / multiline `CAP LS *`.
- Requests capabilities based on which modules are active.
- Handles ACK/NAK responses. Sends `CAP END` to complete registration.
- If server doesn't support CAP, registration proceeds normally (fallback to baseline).
- Runtime `CAP NEW`/`CAP DEL` for capability changes mid-session.

## R4: SASL PLAIN

Activates when `sasl` config is present. Depends on R3.

- Requests `sasl` capability during CAP negotiation.
- If ACK'd, performs AUTHENTICATE PLAIN flow.
- Handles 900 (logged in), 903 (success), 904 (fail), 905 (too long), 906 (aborted), 907 (already authenticated).
- On failure: emit event, continue registration without auth (don't block).

## R5: Message Metadata

Always active when CAP is active. Trivial — just request and read from tags.

- **`message-tags`** — enables arbitrary key-value tags on messages. Parser already handles tag syntax.
- **`server-time`** — `@time=` tag with ISO 8601 timestamp. Expose as typed field on ParsedMessage.
- **`msgid`** — server-assigned unique message ID. Read from tags.

## R6: echo-message

Always active when CAP is active. Depends on R3.

- Request `echo-message` capability.
- When enabled, server echoes sent messages back as real messages.
- Expose `echoMessage: boolean` so consumers know if it's active.
- **Critical:** `fromSelf` must work without echo-message. This cap improves accuracy (server-confirmed delivery) but consumers must handle both cases.

## R7: Account & Presence Enrichment

Always active when CAP is active. Low complexity — each is one new command updating ChannelMember fields.

- **`account-notify`** — ACCOUNT command when users log in/out. Updates `ChannelMember.account`.
- **`account-tag`** — account name as tag on every message. Read from tags.
- **`extended-join`** — JOIN includes account and realname. Parse two extra params, store on ChannelMember.
- **`away-notify`** — AWAY command when users go away/return. Updates `ChannelMember.away`.
- **`chghost`** — CHGHOST command when user's host/ident changes. Updates ChannelMember user/host.

**ChannelMember additions:**

```typescript
type ChannelMember = {
  nick: string
  user?: string
  host?: string
  modes: string[]
  account?: string // from extended-join, account-notify
  realname?: string // from extended-join
  away?: boolean // from away-notify
}
```

## R8: User Listing Improvements

Always active when CAP is active.

- **`multi-prefix`** — all prefix modes in NAMES/WHO, not just highest. Trivial — just request, parser already handles it.
- **`userhost-in-names`** — NAMES replies include `user@host`. Parse and populate ChannelMember.
