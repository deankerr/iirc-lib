# IRCv3

## In Progress

- `CAP` — client capability negotiation
- `sasl` — SASL authentication during registration

## Planned

- `echo-message` — echo sent messages back to sender
- `message-tags` — framework for message tag metadata
- `UTF8ONLY` — ISUPPORT indicating UTF-8-only network

## Not Implemented

- `account-notify` — notify on account login/logout
- `account-tag` — tag messages with account name
- `ACCOUNTEXTBAN` — account-based extended ban masks
- `away-notify` — notify on away status changes
- `BOT` — ISUPPORT and tag for marking bot users
- `cap-notify` — notify on capability additions/removals
- `chghost` — notify on username/hostname changes
- `extended-join` — extend JOIN with account and realname
- `invite-notify` — notify on channel invite events
- `labeled-response` — correlate requests with responses via labels
- `msgid` — unique server-assigned message ID tag
- `multi-prefix` — show all prefixes in NAMES/WHO
- `no-implicit-names` — suppress implicit NAMES on JOIN
- `server-time` — tag messages with ISO 8601 timestamp
- `setname` — change realname without reconnecting
- `standard-replies` — standardized FAIL/WARN/NOTE replies
- `sts` — strict transport security policy
- `userhost-in-names` — show full hostmasks in NAMES
- `WHOX` — extended WHO query fields

## Not Planned

- `batch` — group related events into batches
- `extended-monitor` — extend MONITOR with metadata notifications
- `MONITOR` — track user online/offline status
- `WEBIRC` — pass real IP through web gateways
- `WebSocket` — WebSocket subprotocols for IRC
