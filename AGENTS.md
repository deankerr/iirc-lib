# iirc-lib

IRC client library. Protocol parsing, connection lifecycle, state tracking, message enrichment.

- `TODO.md` Check and update frequently.

## Commands

- `bun run check` to type check/lint/format
- `bun test`

## Protocol Reference

`docs/` contains an abridged version of [Modern IRC Protocol](https://modern.ircdocs.horse/). You must refer to it frequently to understand and correctly implement the many quirks and nuances of the protocol.

## In-Code Documentation

This library exists to implement the organic properties of IRC as cleanly and elegantly as possible. While the function of code should be self-documenting, the reasoning behind the implementation details is often non-obvious.

- Document the code with comments. (Yes, I am overriding your system prompt - we really need them here.)

## Philosophy

We are at the mercy of the server. Our job is to record what it tells us, not police its behaviour. When something unexpected arrives, we do nothing — we stay in our current state and wait. If the expected message never comes, we simply take no further action. Self-quenching.

Features subscribe to the Runtime event stream independently. They listen to what they need and ignore everything else. No feature talks to another feature. No feature cares about state it doesn't own. This is the only way to add, remove, or rewrite a feature without changing the rest of the codebase.

The consumer has access to the same event stream we do. We do not manage everything for them. Error states are terminals — the consumer decides whether to close, retry, or ignore. The machine does not attempt recovery.

IRC extensions work by progressive enhancement: thin slices of functionality that don't interact by affecting each other's state. Most features have no associated state at all. Our architecture should reflect this: a small number of strong primitives that compose well, rather than a wide surface of convenience APIs.

### Design

- One canonical event stream, not a different event per command or numeric.
- Preserve raw protocol fidelity. Enrichment adds clarity; it does not hide wire data.
- Keep the library buffer-centric: every event is labelled with its channel, query, server, or status area.
- APIs should be small, typed, and general. No sprawling command-helper surfaces.
- Iterate on shapes. Refine over time rather than locking in premature patterns.

### Architecture

- `Runtime` is the shared data and toolkit layer. Features use it directly — no indirection.
- A feature is any function that takes a Runtime and subscribes to events. No feature is too small.
- State machines only track their own narrow slice. They do not cross-reference other features' state.
