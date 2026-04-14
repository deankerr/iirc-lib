# TODO

Based on the current library surface, this list focuses on the biggest missing
client-library features after transport, registration, CAP negotiation, and
SASL PLAIN.

## Core Client State

- [ ] Track joined channels
  - [ ] Apply `JOIN`, `PART`, `KICK`, and `QUIT` membership deltas
  - [ ] Build channel rosters from `RPL_NAMREPLY` / `RPL_ENDOFNAMES`
  - [ ] Track topics from `332`, `333`, and `TOPIC`
  - [ ] Track channel modes from `324` and `MODE`
- [ ] Track known users
  - [ ] Parse and store nick, user, host, and server prefixes
  - [ ] Track nick changes from `NICK`
  - [ ] Track account, away, and host changes from `ACCOUNT`, `AWAY`, and `CHGHOST`
  - [ ] Track display-name changes if `setname` is added
- [ ] Respect server-specific matching rules
  - [ ] Use `CASEMAPPING` instead of ASCII-only folding
  - [ ] Use `CHANTYPES`, `PREFIX`, and `CHANMODES` to drive parsing/state

## Event Stream And Enrichment

- [ ] Enrich raw messages into typed protocol shapes
  - [ ] Parse source into server vs `nick!user@host`
  - [ ] Derive consistent buffer labels for channel, query, server, and status traffic
  - [ ] Attach normalized actor/target metadata without branching the event API
  - [ ] Normalize tag access for `time`, `account`, `msgid`, and similar metadata
- [ ] Keep one canonical event stream
  - [ ] Preserve the original IRC command and params on every event
  - [ ] Include derived state context alongside raw wire data
  - [ ] Avoid one-event-per-command fanout

## Query And Reply Assemblers

- [ ] Add collectors for multi-line server replies
  - [ ] Assemble `WHOIS` replies into one result object
  - [ ] Assemble `WHO` / `WHOX` replies into typed rows
  - [ ] Assemble `NAMES`, `LIST`, `MODE`, and topic lookups
  - [ ] Assemble ban, exception, and invite-exception lists

## Capability Follow-Through

- [ ] Make requested capabilities actually useful
  - [ ] Consume `extended-join` for account/realname on joins
  - [ ] Consume `account-notify` and `account-tag`
  - [ ] Consume `away-notify`
  - [ ] Consume `chghost`
  - [ ] Consume `multi-prefix` and `userhost-in-names`
  - [ ] Consume `echo-message`, `server-time`, and `message-tags`
- [ ] Add more modern IRCv3 support
  - [ ] `batch`
  - [ ] `labeled-response`
  - [ ] `monitor`
  - [ ] `invite-notify`
  - [ ] `setname`
  - [ ] `draft/chathistory`
  - [ ] `FAIL`, `WARN`, and `NOTE` message handling

## Outbound Protocol Features

- [ ] Expand outbound command modeling
  - [ ] Support outbound tags
  - [ ] Support client-only tags
  - [ ] Support labeled requests
  - [ ] Support `TAGMSG` if the library wants first-class coverage
- [ ] Add safer send helpers
  - [ ] Split long messages against IRC length limits
  - [ ] Account for message-tag length budgets

## Authentication And Security

- [ ] Broaden SASL support
  - [ ] Add `EXTERNAL`
  - [ ] Add a mechanism abstraction beyond hard-coded `PLAIN`
  - [ ] Surface richer auth success/failure state
- [ ] Add transport upgrade features
  - [ ] `STARTTLS`
  - [ ] STS policy handling if this library wants modern secure defaults

## Connection Lifecycle

- [ ] Improve session resilience
  - [ ] Detect ping timeouts
  - [ ] Add reconnect and backoff hooks
  - [ ] Re-run registration and CAP flows cleanly after reconnect
  - [ ] Preserve or rebuild client state after reconnect
- [ ] Improve transport lifecycle ergonomics
  - [ ] Public `detach()` / reattach support on `Client`
  - [ ] Better close/error reason reporting

## API And Ergonomics

- [ ] Expose safe read APIs over runtime state
  - [ ] `getSelf()`
  - [ ] `getChannel(name)`
  - [ ] `getUser(nick)`
  - [ ] Iterators or snapshots for channels and users
- [ ] Decide how opinionated the library should be
  - [ ] Stay low-level and composable
  - [ ] Keep command I/O centered on one typed send path and one event stream

## Tests And Fixtures

- [ ] Broaden test coverage beyond registration and transport
  - [ ] Channel-state transitions
  - [ ] Capability-driven message enrichment
  - [ ] Multi-line numeric collectors
  - [ ] Reconnect and lifecycle behavior
- [ ] Add fixtures for modern IRCv3 flows
  - [ ] `batch`
  - [ ] labeled responses
  - [ ] account/away/chghost updates
  - [ ] `WHOX` and `NAMES` parsing edge cases
