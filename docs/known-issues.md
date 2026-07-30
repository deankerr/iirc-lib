# Known Interoperability Issues

IRC servers do not always emit the structures or character encodings described
by the modern protocol. This document records deviations observed in real
traffic and the current iirc-lib behaviour around them.

All examples are anonymised and lightly simplified. Hostnames, network names,
nicknames, software names, addresses, and prose are synthetic, while the
relevant wire structure is preserved.

## Invalid UTF-8

Some legacy networks send text in a regional single-byte encoding. A line may
therefore contain bytes which are not valid UTF-8:

```text
:irc.legacy.example NOTICE sampleNick :Ol<e1>
```

Here `<e1>` denotes the single byte `0xE1`, not the two-byte UTF-8 encoding of
`á`. Other observed traffic used bytes whose intended characters depend on a
Windows code page, so interpreting every invalid byte as Latin-1 would not
recover the intended text reliably.

Current behaviour:

- Input is framed and length-checked as bytes.
- Each complete line is decoded as UTF-8.
- Invalid sequences become the Unicode replacement character (`U+FFFD`).
- Parsing continues normally.
- The library does not detect legacy encodings or expose a configurable codec.

The byte-oriented framing is important independently of character decoding:
IRC line limits are byte limits, and a multibyte character may be split across
stream chunks. Pluggable decoding is deferred until the transport's modularity
supports it without creating parallel data flows or complicating every message.

## Oversized Lines

A client must allow 512 message bytes plus 8191 tag bytes per line — 8703 wire
bytes. A longer line can never become a valid message, so the limit is a
derived protocol bound, not a policy about server behaviour.

Current behaviour:

- Any line longer than the limit is rejected, whether it arrives in one stream
  chunk or many.
- The transport emits `parse_error` once per oversized line, carrying a
  100-byte excerpt of it.
- The rest of the line is discarded until its terminating LF, so an
  unterminated line cannot grow the input buffer without bound.
- Framing resumes with the next line; the session continues.

## Messages Missing Required Parameters

Servers and services occasionally send a known command without the parameters
required to enrich it. One observed shape was equivalent to:

```irc
:InfoBot PRIVMSG sampleNick
```

The line is a syntactically parseable IRC message, but `PRIVMSG` requires
message text after its target.

Current behaviour:

- The transport produces the canonical raw message.
- Event enrichment throws because the required trailing parameter is absent.
- The runtime emits `parse_error` with the raw message and error.
- No enriched `PRIVMSG` event is emitted for that message.
- The session remains active and later messages continue to flow.

This is an acceptable failure mode for now. The library does not invent empty
text, reinterpret the command, or add server-specific recovery.

## Inconsistent `004 RPL_MYINFO`

The documented shape is:

```text
<client> <servername> <version> <available user modes>
<available channel modes> [<channel modes with a parameter>]
```

Real servers have been observed using `004` in incompatible ways.

### Required fields omitted

One server sent a decorated server name and version followed only by a label:

```irc
:irc.example 004 sampleNick \x0312irc.example ExampleIRCd-v4 Mode:\x03
```

There is no available-channel-modes parameter. iirc-lib attempts the normal
`RPL_MYINFO` enrichment and emits `parse_error` when the required field is
absent. The raw `004` message remains available on the error.

### Numeric repurposed as prose

Another server used `004` for an untranslated greeting:

```irc
:irc.example 004 sampleNick We hope you enjoy chatting on ExampleNet
```

This contains enough space-separated parameters to satisfy the enricher, but
the resulting fields are semantically meaningless—for example, `servername`
would be `"We"` and `version` would be `"hope"`. Extra parameters after the
known optional field are retained on `event.raw` but are not part of the
enriched fields.

Current behaviour:

- iirc-lib continues to recognize and enrich `RPL_MYINFO`.
- Missing required fields produce `parse_error`.
- No heuristic attempts to distinguish structured fields from prose.
- Built-in features do not consume `RPL_MYINFO`.
- Connection state does not include or infer a server version.
- Operational mode information comes from `005 RPL_ISUPPORT`, not `004`.

This is consistent with the current event model: known messages are enriched
according to their documented shape, enrichment failures are observable and
self-quenching, and consumers retain access to the raw message.

## Known Messages Without Enrichers

Some messages observed in real traffic have no entry in the event enricher
table and therefore arrive as `UNKNOWN` events:

- `396`, commonly used to report the client's displayed or hidden host.
- `TAGMSG`, including client-only tags used for typing notifications.
- `250`, commonly used for connection statistics.
- `042`, commonly used to report a unique client identifier.
- `020`, used by some implementations for a pre-registration status notice.

Current behaviour:

- The event's `command` is `UNKNOWN`.
- `event.raw.command` preserves the original command or numeric.
- All parameters, tags, and source information remain available on
  `event.raw`.
- No connection, identity, or channel state is inferred from these messages.

This fallback is intentional, but `TAGMSG` is a notable omission because the
library requests `message-tags` by default. Enriching `TAGMSG` with its target,
and enriching `396` if displayed-host state becomes part of the runtime, would
be general additions rather than implementation-specific recovery.

## Channel State After a Terminal Close

A client may send `QUIT` and receive only an `ERROR` followed by transport
closure. It is not guaranteed to receive its own `QUIT` message first.

Current behaviour:

- The channel tracker clears `joined` after a self `PART`, `KICK`, `QUIT`, or
  `KILL`.
- Transport closure does not mutate channel state.
- Channels may consequently retain `joined: true` after the session has
  finished.
- Membership and topic data remain as the final observed session snapshot.

The lifecycle contract already makes closure terminal, so consumers must not
interpret this snapshot as a live connection. A future change should explicitly
choose whether terminal closure preserves historical state or marks every
channel as departed.

## Unsupported and Non-ASCII Case Mappings

ISUPPORT may advertise a `CASEMAPPING` value other than `ascii`,
`rfc1459`, or `rfc1459-strict`.

Current behaviour:

- The advertised value is retained in the ISUPPORT map.
- Unknown mappings fall through to the same path used for `ascii`.
- That path calls JavaScript `toLowerCase()`, which lowercases Unicode
  characters as well as ASCII `A` through `Z`.
- Identifier comparison and the case-folded channel/member maps therefore
  cannot implement an advertised custom mapping exactly.
- For strict `ascii` mapping, non-ASCII case pairs may also compare equal even
  though the mapping only defines ASCII folding.

No mapping is inferred from network identity or character content. Supporting
additional mappings should use explicit, general case-fold functions, while
the `ascii` implementation should limit folding to its defined character
range.

## Constraints on Future Changes

Changes intended to address these cases should remain general:

- Do not identify or special-case particular networks.
- Do not silently manufacture required fields.
- Do not treat parameter count alone as proof that prose is structured data.
- Preserve the canonical raw message whenever enrichment fails or loses detail.
- Keep unexpected input self-quenching so one bad message does not alter later
  session behaviour.
