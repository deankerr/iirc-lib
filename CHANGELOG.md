# Changelog

All notable changes to this package are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
package follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html). While the
major version is `0`, a minor bump may carry breaking changes.

## [0.2.0] - 2026-08-01

This release reworks the transport boundary and the channel mode model. Both carry
breaking changes — see **Changed** and **Removed**.

### Added

- `./testing` entry point, exporting `createMockTransport`. It is separate from the main
  entry so test helpers never reach a production bundle.
- JSON-safe state snapshots: `Runtime.toJSON()`, `Channel.toJSON()`, `IsupportMap.toJSON()`
  and `ChannelModes.toJSON()`, with the `RuntimeJSON`, `ChannelJSON` and `ChannelModesJSON`
  types. A snapshot is copied at one instant and holds no reference into live runtime state.
- `discard` transport event, emitted with the lines dropped when a line goes over the
  protocol byte limit. Output loss is now reported instead of silent.
- `bytes` argument on the `read` and `write` transport events. The raw wire bytes survive
  decoding, so a consumer can inspect what the server actually sent.
- Channel modes are tracked by their `CHANMODES` and `PREFIX` type. `ModeChange` now carries
  a `type` field of `'A' | 'B' | 'C' | 'D' | 'PREFIX'`.
- More types are exported from the main entry: `Channel`, `ChannelMember`, `ChannelTopic`,
  `ChannelModes`, `ChannelModeType`, `IsupportMap`, `IrcCommand`, `IrcMessage`, `IrcTags`
  and `TransportEvents`. The `Transport` class is now exported as a value.

### Changed

- **Breaking.** The transport requires a binary stream. A stream that emits strings is a
  terminal error, because an encoding applied by the stream destroys the wire bytes.
- **Breaking.** The `parse_error` event signature is now `(error, line, bytes)`. The error
  moved to the first position, and the raw bytes were added.
- **Breaking.** `Channel.modes` is a `ChannelModes` instance rather than a
  `Map<string, Set<string>>`. Use its `getMemberModes`, `apply` and `toJSON` methods.
- **Breaking.** The package needs Node 24 or later, and `@types/node` 24 or later.

### Removed

- **Breaking.** `message-tags` is no longer requested by default. The library requests no
  capabilities of its own; enrichment reads whatever you negotiated. Add `'message-tags'` to
  `requestedCapabilities` to keep the previous behaviour.
- **Breaking.** `ConnectionState.serverVersion`. The field recorded a value the protocol does
  not define a stable shape for.

## [0.1.0] - 2026-07-09

First published release. It predates this changelog and carries no `v0.1.0` tag, so the
links below name its commit instead.

[0.2.0]: https://github.com/deankerr/iirc-lib/compare/b6d20a4...v0.2.0
[0.1.0]: https://github.com/deankerr/iirc-lib/tree/b6d20a4
