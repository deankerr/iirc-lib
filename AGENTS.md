# iirc-lib

IRC client library. Protocol parsing, connection lifecycle, state tracking, message enrichment.

- `TODO.md` Check and update frequently.

## Commands

- `bun run check`
- `bun test`

## Comments

- Document the code with comments.
- Especially for features - add a short description, any use protocol references, list of state values read/set, events emitted, etc.

## Design Goals

- Prioritise high-quality, deliberate API design over matching existing library conventions.
- Favour a small number of strong primitives that compose well, rather than a wide surface of convenience APIs.
- Keep the library buffer-centric: consistently label which channel, query, server, or status area an event belongs to.
- Maintain one canonical event stream rather than emitting a different event type for each IRC command or numeric.
- Preserve raw protocol fidelity while layering derived context and enrichment on top; enrichment should add clarity, not hide wire data.
- Avoid sprawling command-helper APIs on the client object; command I/O should stay centered on a small, typed, general mechanism.
- Treat the design as iterative. Aim for tasteful, well-thought-out abstractions and be willing to refine shapes over time instead of locking in premature patterns.

## Architecture

- `Runtime` is the shared data and toolkit layer, used by `features` which implement the majority of functionality.
- Do not try to "protect" `Runtime` from features - indirection adds needless complexity.
- No feature is too small.

## References

The `references/` directory is .gitignored, but contains:

- `references/modern-irc-protocol` The most detailed IRC Protocol specification on the planet (`https://modern.ircdocs.horse/`)
  - `references/modern-irc-protocol/05-client-to-server-protocol-structure.md` Fundemental message parsing requirements
