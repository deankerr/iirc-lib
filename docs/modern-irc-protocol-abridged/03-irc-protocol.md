# IRC Protocol

Clients and servers exchange a stream of bytes containing messages separated by `CR ('\r', 0x0D)` followed by `LF ('\n', 0x0A)`. Messages may be sent at any time from either side and may generate zero or more replies.

- Software SHOULD use UTF-8 encoding, with fallbacks as described in the Character Encodings implementation considerations appendix.
- IRC entity names (clients, servers, channels) are casemapped to prevent confusion (e.g. `'Dan'` vs `'dan'`). Servers MUST advertise their casemapping in the `RPL_ISUPPORT` numeric after connection registration.

## Message Format

An IRC message is a single line delimited by `CR ('\r', 0x0D)` and `LF ('\n', 0x0A)`.

- When reading: buffer incoming data and only parse when `\r\n` is encountered. Silently ignore empty messages.
- When sending: ensure `\r\n` follows every message.

Message format (rough ABNF):

```
message         ::= ['@' <tags> SPACE] [':' <source> SPACE] <command> <parameters> <crlf>
  SPACE           ::=  %x20 *( %x20 )   ; space character(s)
  crlf            ::=  %x0D %x0A        ; "carriage return" "linefeed"
```

Message parts:

- **tags**: Optional metadata, starting with `('@', 0x40)`.
- **source**: Optional origin of the message, starting with `(':', 0x3A)`.
- **command**: The command this message represents.
- **parameters**: Data relevant to this command.

Parts and parameters are separated by one or more ASCII SPACE characters `(' ', 0x20)`.

Most servers limit messages to 512 bytes including `CR-LF`. With message tags, clients must allow 8191 additional bytes and servers must allow 4096 additional bytes for the **tags** section.

Example messages:

```
:irc.example.com CAP LS * :multi-prefix extended-join sasl

@id=234AB :dan!d@localhost PRIVMSG #chan :Hey what's up!

CAP REQ :sasl
```

### Tags

Tags format:

```
<tags>          ::= <tag> [';' <tag>]*
  <tag>           ::= <key> ['=' <escaped value>]
  <key>           ::= [ <client_prefix> ] [ <vendor> '/' ] <sequence of letters, digits, hyphens (`-`)>
  <client_prefix> ::= '+'
  <escaped value> ::= <sequence of any characters except NUL, CR, LF, semicolon (`;`) and SPACE>
  <vendor>        ::= <host>
```

Tags are a series of `<key>[=<value>]` segments separated by `(';', 0x3B)`.

- Tags MUST NOT be sent unless explicitly enabled by a capability.
- The leading `('@', 0x40)` is stripped before processing.
- A key with no `=` has an empty value (equivalent to `<key>=`).

Example tag parsing:

```
@id=123AB;rose         ->  {"id": "123AB", "rose": ""}

@url=;netsplit=tur,ty  ->  {"url": "", "netsplit": "tur,ty"}
```

For tag naming, registration, and value escaping, see the IRCv3 Message Tags specification.

### Source

```
source          ::=  <servername> / ( <nickname> [ "!" <user> ] [ "@" <host> ] )
  nick            ::=  <any characters except NUL, CR, LF, chantype character, and SPACE> <possibly empty sequence of any characters except NUL, CR, LF, and SPACE>
  user            ::=  <sequence of any characters except NUL, CR, LF, and SPACE>
```

The **source** (formerly **prefix**) is optional and starts with `(':', 0x3A)` (which is stripped). If there are no tags, it MUST be the first character of the message.

- The source indicates the true origin of a message. If missing, the message is assumed to originate from the client/server on the other end of the connection.
- Clients MUST NOT include a source when sending.
- Servers MAY include or omit a source on any message. Clients MUST process messages the same way regardless of whether a source is present.

### Command

```
command         ::=  letter* / 3digit
```

The **command** must be a valid IRC command or a numeric (three-digit number as text).

### Parameters

Parameters format:

```
parameters      ::=  *( SPACE middle ) [ SPACE ":" trailing ]
  nospcrlfcl      ::=  <sequence of any characters except NUL, CR, LF, colon (`:`) and SPACE>
  middle          ::=  nospcrlfcl *( ":" / nospcrlfcl )
  trailing        ::=  *( ":" / " " / nospcrlfcl )
```

Parameters are values separated by one or more ASCII SPACE `(' ', 0x20)` characters. The final parameter may be prepended with `(':', 0x3A)` — when present, the colon is stripped and the rest of the message (including any spaces) is treated as that single final parameter.

- Parameters that contain spaces, are empty, or begin with `':'` MUST be sent with a preceding `':'` on the final parameter.
- In other cases, the preceding `':'` on the final parameter is OPTIONAL.
- Software SHOULD AVOID sending more than 15 parameters (older clients may not handle more), but clients MUST parse any number of them.
- A trailing parameter has the same semantics as any other parameter and MUST NOT be treated specially once the `':'` is stripped.

Example parameter parsing:

```
:irc.example.com CAP * LIST :         ->  ["*", "LIST", ""]

CAP * LS :multi-prefix sasl           ->  ["*", "LS", "multi-prefix sasl"]

CAP REQ :sasl message-tags foo        ->  ["REQ", "sasl message-tags foo"]

:dan!d@localhost PRIVMSG #chan :Hey!  ->  ["#chan", "Hey!"]

:dan!d@localhost PRIVMSG #chan Hey!   ->  ["#chan", "Hey!"]

:dan!d@localhost PRIVMSG #chan ::-)   ->  ["#chan", ":-)"]
```

### Compatibility with incorrect software

- Servers SHOULD handle a single `\n` as if it were `\r\n`, and MAY handle a single `\r` the same way. Clients and servers MUST NOT send lone `\r` or `\n`.
- Servers and clients SHOULD ignore empty lines.
- Servers SHOULD gracefully handle messages over 512 bytes by: sending `ERR_INPUTTOOLONG` (`417`), truncating at the 510th byte (preferably at the last full UTF-8 character/grapheme), or ignoring the message / closing the connection.
- Clients and servers SHOULD NOT use more than one `\x20` space as `SPACE`.

## Numeric Replies

Numeric replies use a three-digit numeric as the command. They MUST contain a `<source>` and SHOULD contain the target as the first parameter. Numeric replies MUST NOT originate from a client. In all other respects they are normal messages.

## Wildcard Expressions

When wildcards are allowed in a string, it is called a "mask".

- `('?', 0x3F)` matches exactly one character.
- `('*', 0x2A)` matches any number of any characters (including zero).
- Both can be escaped with `('\', 0x5C)`.

ABNF syntax:

```
mask        =  *( nowild / noesc wildone / noesc wildmany )
  wildone     =  %x3F
  wildmany    =  %x2A
  nowild      =  %x01-29 / %x2B-3E / %x40-FF
                   ; any octet except NUL, "*", "?"
  noesc       =  %x01-5B / %x5D-FF
                   ; any octet except NUL and "\"

  matchone    =  %x01-FF
                   ; matches wildone
  matchmany   =  *matchone
                   ; matches wildmany
```

Examples:

```
a?c         ; Matches any 3-character string starting with "a" and ending with "c"

a*c         ; Matches any string of 2+ characters starting with "a" and ending with "c"
```

## Implementation Notes

The IRC protocol is complex, with implementation-defined choices and commonly incorrect implementations. This section provides discussion, questions, and recommendations for implementors.

## Character Encodings

Character encodings in IRC are hard. UTF-8 is recommended, but Latin-1/ISO-8859-1(5)/CP1252 is also common, and other encodings are used in practice.

- When sending, always use UTF-8.
- When decoding, try UTF-8 and fall back to Latin-1 (the "Hybrid" encoding).
- For clients, incorrect decoding of a private message is visible to the user and can be resolved.
- For servers, arbitrary user input (PRIVMSG/NOTICE, USER, TOPIC, etc.) should be treated as a byte array — accept and re-emit without decoding.

Servers implemented in languages with first-class Unicode strings face an issue: if a line is decoded incorrectly, modified (e.g. by casefolding), and re-encoded, it can cause mojibake. Options:

1. Treat these parameters as byte arrays not to be parsed or decoded (majority existing approach).
2. Decode all incoming lines as UTF-8 (or Hybrid), rejecting lines that cannot be decoded. The IRCv3 UTF8ONLY specification allows servers to signal this to clients.

## Message Parsing and Assembly

Message parsing and assembly is a common source of security issues and runtime problems. Implementors should test their parsers against public-domain test suites like irc-parser-tests.

### Trailing

The trailing parameter is a normal parameter that can contain spaces. When parsing, normal params and trailing should be returned as a single list.

Don't separate them like this:

```
Message
      .Tags
      .Source
      .Verb
      .Params (containing all but the trailing param)
      .Trailing (containing just the trailing param)
```

This will cause breakages, as logic code will depend on the final param being in either `.Params` or `.Trailing`. Instead, output:

```
Message
      .Tags
      .Source
      .Verb
      .Params (including all normal params, and the trailing param if it exists)
```

### Direct String Comparisons on IRC Lines

Don't process incoming lines by comparing raw string prefixes (e.g. `Line.StartsWith("PART")`). Any IRC message may include or omit the source, and this approach breaks when servers include sources on messages.

Instead, parse lines through a message parser and compare the verb:

```
Message = IRCMessageParser(Line)
  If Message.Verb == "PART" {
        Part(...etc...)
  } Else If Message.Verb == "QUIT" {
        Quit(...etc...)
  }
```

The message verb is always case-insensitive — casemap it before comparison (e.g. convert to uppercase).

## Casemapping

Casemapping implementations differ greatly.

### Servers

- Does your server use `rfc1459` or `rfc1459-strict` casemapping? Can you use `ascii` instead to reduce ambiguity?
- Does your server store state using nicks/channel names as keys? Are keys casefolded automatically or before use?

### Clients

- Does your client store state using nicks/channel names as keys, and are those keys casefolded appropriately?
- Does your client discover the casemapping from the CASEMAPPING RPL_ISUPPORT parameter and use it appropriately?
