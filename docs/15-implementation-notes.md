# Implementation Notes

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
