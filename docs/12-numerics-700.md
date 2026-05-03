### RPL_HELPSTART (704)

```
"<client> <subject> :<first line of help section>"
```

Indicates the start of a reply to a HELP command. The text used in the last param may vary, and SHOULD be displayed as-is (possibly emphasized as the title of the help section).

- `<subject>` MUST be the one requested by the client, but may be casefolded; unless it would be an invalid parameter, in which case it MUST be `*`.

### RPL_HELPTXT (705)

```
"<client> <subject> :<line of help text>"
```

Returns a line of HELP text. Lines MAY be wrapped to a certain line length by the server. The final line MUST be a RPL_ENDOFHELP (706) numeric.

- `<subject>` MUST be the one requested by the client, but may be casefolded; unless it would be an invalid parameter, in which case it MUST be `*`.

### RPL_ENDOFHELP (706)

```
"<client> <subject> :<last line of help text>"
```

Returns the final HELP line to the client.

- `<subject>` MUST be the one requested by the client, but may be casefolded; unless it would be an invalid parameter, in which case it MUST be `*`.

### ERR_NOPRIVS (723)

```
"<client> <priv> :Insufficient oper privileges."
```

Alerts an IRC operator that they do not have the specific operator privilege required to perform the requested command or action. The text used in the last param of this message may vary.

- `<priv>` is a server-defined string representing one or multiple commands or actions that may be performed by IRC operators.
- Examples: `kline`, `dline`, `unkline`, `kill`, `kill:remote`, `die`, `remoteban`, `connect`, `connect:remote`, `rehash`.
