# iirc-lib

IRC client library. Protocol parsing, connection lifecycle, state tracking, message enrichment.

## Commands

- Use `bun run fix` and `bun test` to validate your work.
- Inline disables may be used if the reason is justified.
- Disable `sort-keys` only when object key order is critical.

## Protocol Reference

Always refer to `docs/modern-irc-protocol-abridged` to correctly implement the many quirks and nuances of the protocol.

Use code comments to document the reasoning behind implementation details which may be non-obvious.

## Philosophy

**Derive, don't accrete.** Every behaviour traces to a claim from the protocol docs or a stated contract. Never plug a hole where it was noticed — re-derive the layer, spec-first: claims as a comment block, one test per claim, the minimal machine that satisfies them. A muddy module gets rebuilt, not extended.

**Record, don't police — above the byte level.** We are at the mercy of the server: record what it says, don't judge it. On unexpected content do nothing — hold state, wait, self-quench. Bounds differ: protocol quantities (byte limits, delimiters) are derived facts a finite machine may enforce. Behaviour follows the protocol, never runtime accidents like chunking or timing.

**Treat the consumer as an adult.** Consumers get the same runtime the built-in features use — stream, events, state, helpers; nothing hidden or wrapped. What they hand us stays theirs: never mutate or reconfigure it. Verify cheap, certain preconditions once at the boundary; don't defend per operation or guess where detection is unreliable. Construction is the one place to throw — no session exists yet to quench into. Afterwards errors are terminal events: no recovery, no retry, no silent repair faking a broken guarantee. Reconnection and policy are the consumer's.

**One event stream, thin slices.** One canonical stream, not an event per command. Enrichment adds typed clarity, never hides wire data — `raw` survives everything; listen lower for whatever isn't covered. Every event is labelled with its buffer (channel, query, server, status). A feature is any function that takes the runtime and subscribes: it owns one narrow slice, broadcasts through events, never reads another feature's state, does nothing when a dependency is absent. No feature is too small. Event shapes are evolving — refine, don't lock in.

**Seams, not surface.** Keep evolving policy (decoding, say) behind one named function even while trivial — a documented seam, not a config option. The public surface stays small, typed, general: no per-command helpers, no false safety layers.

**One runtime, one transport, one session.** Close or error finishes it; remaining state is a snapshot, not a live view. New sessions start from scratch.

**Tests serve claims, never design.** Rewrite tests freely from claims; their convenience never leaks into library signatures — fixtures adapt at the test's edge.
