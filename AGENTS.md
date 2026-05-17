## OXC

- Use `bun run fix` type check, lint, and format with `oxlint`/`oxlint-tsgolint`/`oxfmt`
- Do not use `tsc`.
- Inline disables may be used if the reasoning is justified
- Vendored code like `shadcn-ui` is added to ignorePatterns, e.g. `**/components/ui/**`
- `sort-keys` is enabled - allow it to re-order object keys.

## TypeScript 6

- `@types/*` packages are manually specified `"types": ["bun"]`, only if required
- Subpath Imports support, e.g. `"#/*": "./dist/*"`, replace deep relative paths `../../utils.js` with `#root/utils.js`
- `rootDir` defaults to `.`
- `baseUrl` is deprecated
- `target` `es2025` supports `RegExp.escape`, `Promise.try`, `Iterator` methods, `Set` methods
- `target` `esnext` supports `Temporal`, `Map.getOrInsert`

# iirc-lib

IRC client library. Protocol parsing, connection lifecycle, state tracking, message enrichment.

## Commands

- `bun run check` to type check/lint/format
- `bun test`

## Protocol Reference

`docs/` contains an abridged version of [Modern IRC Protocol](https://modern.ircdocs.horse/). You must refer to it frequently to understand and correctly implement the many quirks and nuances of the protocol.

## In-Code Documentation

This library exists to implement the organic properties of IRC as cleanly and elegantly as possible. While the function of code should be self-documenting, the reasoning behind the implementation details is often non-obvious.

- Document the code with comments. (Yes, I am overriding your system prompt - we really need them here.)

## Philosophy

We are at the mercy of the server. Record what it tells us, don't police its behaviour. When something unexpected arrives, do nothing — stay in the current state and wait. Self-quenching.

The library does not hide the protocol or the runtime from its consumer. Features and consumers stand in the same relationship to the runtime: observe the event stream, read state, use helpers, mutate if they choose.

Features are progressive enhancement: thin slices that listen for what they need and ignore what they don't. Features do not talk to other features directly — they broadcast through the event stream. A feature may depend on another for functionality, but never on its state. If a dependency is absent, the dependent feature simply does nothing rather than breaking.

Client events are the intended main way for consumers and features to consume the message stream. They enrich raw wire data with parsed, typed payloads. Their shape is still evolving — iterate, refine, don't lock in premature patterns. Not every IRC command needs an enriched event type. Simple features may listen to raw messages directly. When something isn't covered, listen at a lower level.

Error states are terminals — no recovery, no retry. Consumers who want to close, reconnect, or patch behaviour decide that for themselves.

### Design

- One canonical event stream, not a different event per command or numeric.
- Preserve raw protocol fidelity. Enrichment adds clarity; it does not hide wire data.
- Keep the library buffer-centric: every event is labelled with its channel, query, server, or status area.
- Keep the public surface small, typed, and general. No sprawling command-helper surfaces or false safety layers.
- Consumers should have access to the same runtime primitives that built-in features use.

### Architecture

- The runtime is the shared data, event stream, and toolkit for a single IRC session, used directly by both built-in features and consumers. No outer layer hides it.
- A feature is any function that takes a runtime and subscribes to events. No feature is too small.
- State machines track only their own narrow slice — no coordination through hidden side channels or cross-referencing other features' state.

#### Lifecycle Contract

- One runtime, one transport, one session. The library does not reconnect or resume.
- When the stream closes or errors, that session is finished. Start a new session from scratch.
