## ISUPPORT

IRC servers advertise features, limits, and protocol options to clients via the `RPL_ISUPPORT` (005) numeric, sent on connection registration. This lets clients adapt their behaviour based on what the server implements.

- After registration, the server MUST send at least one `RPL_ISUPPORT` numeric. Multiple `RPL_ISUPPORT` numerics SHOULD be sent adjacent to each other.
- Clients SHOULD NOT assume a feature is supported unless advertised. For parameters with a 'default' value, clients SHOULD assume the default until the server explicitly advertises the parameter.

# RPL_ISUPPORT Parameters

The RPL_ISUPPORT (005) numeric lists parameters that let the client know which features are active and their values. These are standardised and/or widely-advertised parameters; for a more extensive list see the irc-defs RPL_ISUPPORT list.

- Parameters noted `"Status: Proposed"` are not yet standardised or widely-advertised.
- If a 'default value' is listed, this is the assumed value until the server advertises the parameter. If an 'empty value' is listed, this is the value when the parameter is advertised without a value.

## Feature Advertisement

IRC servers advertise features, limits, and protocol options to clients via the `RPL_ISUPPORT` (005) numeric, sent on connection registration. This lets clients adapt their behaviour based on what the server implements.

- After registration, the server MUST send at least one `RPL_ISUPPORT` numeric. Multiple `RPL_ISUPPORT` numerics SHOULD be sent adjacent to each other.
- Clients SHOULD NOT assume a feature is supported unless advertised. For parameters with a 'default' value, clients SHOULD assume the default until the server explicitly advertises the parameter.

### AWAYLEN Parameter

```
Format: AWAYLEN=<number>
```

Indicates the maximum length for the `<reason>` of an AWAY command. Longer reasons may be silently truncated by the server.

- The value MUST be specified and MUST be a positive integer.

```
AWAYLEN=200
AWAYLEN=307
```

### CASEMAPPING Parameter

```
Format: CASEMAPPING=<casemap>
```

Indicates the method the server uses to compare case-insensitive strings (such as channel names and nicks). The value MUST be specified.

- **`ascii`**: `a`-`z` are the lower-case equivalents of `A`-`Z`.
- **`rfc1459`**: Same as `ascii`, plus `{`, `}`, `|`, `^` are the lower-case equivalents of `[`, `]`, `\`, `~`.
- **`rfc1459-strict`**: Same as `ascii`, plus `{`, `}`, `|` are lower-case equivalents of `[`, `]`, `\`. `^` and `~` are NOT casefolded.
- **`rfc7613`**: Proposed casemapping based on PRECIS, allowing additional Unicode characters.

Servers MAY advertise alternate casemappings. If not published, clients SHOULD assume `CASEMAPPING=rfc1459`. Servers SHOULD AVOID using `rfc1459` unless explicitly required for compatibility.

```
CASEMAPPING=ascii
CASEMAPPING=rfc1459
```

### CHANLIMIT Parameter

```
Format: CHANLIMIT=<prefixes>:[limit]{,<prefixes>:[limit]}
```

Indicates the number of channels a client may join. A list of `<prefixes>:<limit>` pairs delimited by comma `(',', 0x2C)`.

- `<prefixes>` is a list of channel prefix characters as defined in CHANTYPES.
- `<limit>` is OPTIONAL; if specified, it's a positive integer. If omitted, there is no limit.
- Clients should not assume other clients are limited to what is specified.

```
CHANLIMIT=#:25           ; 25 '#' channels
CHANLIMIT=#&:50          ; 50 '#' and 50 '&' channels
CHANLIMIT=#:70,&:        ; 70 '#' channels, unlimited '&' channels
```

### CHANMODES Parameter

```
Format: CHANMODES=A,B,C,D[,X,Y...]
```

Specifies the channel modes available and which types of arguments they take when used with the MODE command. The value lists Type A, B, C, and D mode letters respectively, delimited by comma `(',', 0x2C)`.

- Servers MAY send additional types (for future extensions), but SHOULD NOT extend this without good reason.
- Modes listed in PREFIX MUST NOT appear in CHANMODES, but PREFIX modes may be treated as type B modes.

```
CHANMODES=b,k,l,imnpst
CHANMODES=beI,k,l,BCMNORScimnpstz
CHANMODES=beI,kfL,lj,psmntirRcOAQKVCuzNSMTGZ
```

### CHANNELLEN Parameter

```
Format: CHANNELLEN=<string>
```

Specifies the maximum length of a channel name a client may join. A client elsewhere on the network MAY join a channel with a larger name, but networks should keep this value consistent.

- The value MUST be specified and MUST be a positive integer.

```
CHANNELLEN=32
CHANNELLEN=50
CHANNELLEN=64
```

### CHANTYPES Parameter

```
Format: CHANTYPES=[string]
   Default: CHANTYPES=#
```

Indicates the channel prefix characters available on the current server.

- The value is OPTIONAL; if not present, no channel types are supported.
- If the parameter is not published at all, clients SHOULD assume `CHANTYPES=#&`.

```
CHANTYPES=#
CHANTYPES=&#
CHANTYPES=#&
```

### ELIST Parameter

```
Format: ELIST=<string>
```

Indicates the server supports search extensions to the LIST command. The value is a non-delimited, case-insensitive list of letters.

- **C**: Search by channel creation time (`C<val` = less than val minutes ago, `C>val` = more than val minutes ago).
- **M**: Search by matching mask.
- **N**: Search by non-matching !mask (opposite of M).
- **T**: Search by topic set time (`T<val` / `T>val`).
- **U**: Search by user count (`<val` / `>val`).

A widespread bug swaps the semantics of `C<val`/`C>val` and/or `T<val`/`T>val` due to ambiguous legacy specifications.

```
ELIST=MNUCT
ELIST=MU
ELIST=CMNTU
```

### EXCEPTS Parameter

```
Format: EXCEPTS=[character]
   Empty: e
```

Indicates the server supports ban exceptions.

- The value is OPTIONAL; when not specified, `"e"` is used. If specified, the character indicates the letter for ban exceptions.

```
EXCEPTS
EXCEPTS=e
```

### EXTBAN Parameter

```
Format: EXTBAN=[<prefix>],<types>
```

Indicates the types of extended ban masks the server supports. `<prefix>` is the character that indicates an extban; `<types>` is a list of supported extban type characters. If `<prefix>` does not exist, extbans are sent without a prefix.

- Extbans may allow bans based on account name, SSL certificate fingerprints, and other attributes.
- Extban masks SHOULD also be supported for ban exception and invite exception modes.

```
EXTBAN=~,cqnr
EXTBAN=~,qjncrRa
EXTBAN=,ABCNOQRSTUcjmprsz
```

### HOSTLEN Parameter

```
Format: HOSTLEN=<number>
   Status: Proposed
```

Indicates the maximum length of a hostname on the server. Networks SHOULD keep this consistent across servers.

- If a looked-up domain name exceeds this length, the server SHOULD use the IP address instead.
- The value MUST be specified and MUST be a positive integer.

```
HOSTLEN=63
HOSTLEN=64
```

### INVEX Parameter

```
Format: INVEX=[character]
   Empty: I
```

Indicates the server supports invite exceptions.

- The value is OPTIONAL; when not specified, `"I"` is used. If specified, the character indicates the letter for invite exceptions.

```
INVEX
INVEX=I
```

### KICKLEN Parameter

```
Format: KICKLEN=<length>
```

Indicates the maximum length for the `<reason>` of a KICK command. Longer reasons may be silently truncated.

- The value MUST be specified and MUST be a positive integer.

```
KICKLEN=255
KICKLEN=307
```

### MAXLIST Parameter

```
Format: MAXLIST=<modes>:<limit>{,<modes>:<limit>}
```

Specifies how many type A mode entries a client may set on a channel. A list of `<modes>:<limit>` pairs delimited by comma `(',', 0x2C)`.

- `<modes>` is a list of type A modes from CHANMODES.
- `<limit>` is a positive integer specifying the combined maximum for all modes in `<modes>`.
- A client MUST NOT assume how many entries exist on any given channel; this only applies to setting new modes.

```
MAXLIST=beI:25           ; up to 25 combined b/e/I entries
MAXLIST=b:60,e:60,I:60  ; 60 each for b, e, I
MAXLIST=beI:100,q:50     ; up to 100 combined b/e/I, up to 50 q
```

### MAXTARGETS Parameter

```
Format: MAXTARGETS=[number]
```

Specifies the maximum number of targets a PRIVMSG or NOTICE command may have. TARGMAX SHOULD be advertised instead of or in addition to this parameter.

- The value is OPTIONAL; if specified, it's a positive integer. If omitted, there is no limit.

```
MAXTARGETS=4
MAXTARGETS=20
```

### MODES Parameter

```
Format: MODES=[number]
```

Specifies how many variable modes (types A, B, C and PREFIX modes) may be set by a single client MODE command. Servers MAY issue more variable modes in a single MODE message.

- The value is OPTIONAL; when not specified, there is no limit.
- If not published at all, clients SHOULD assume `MODES=3`.
- If specified, it MUST be a positive integer.

```
MODES=4
MODES=12
MODES=20
```

### NETWORK Parameter

```
Format: NETWORK=<string>
```

Indicates the name of the IRC network. This is for informational purposes only — clients SHOULD NOT use this value to make assumptions about supported features.

```
NETWORK=EFNet
NETWORK=Rizon
NETWORK=Example\x20Network
```

### NICKLEN Parameter

```
Format: NICKLEN=<number>
```

Indicates the maximum length of a nickname a client may set. Clients on the network MAY have longer nicks than this.

- The value MUST be specified and MUST be a positive integer.
- Typical values are `30` or `31`.

```
NICKLEN=9
NICKLEN=30
NICKLEN=31
```

### PREFIX Parameter

```
Format: PREFIX=[(modes)prefixes]
   Default: PREFIX=(ov)@+
```

Specifies channel membership prefixes and the mode characters they map to. There is a one-to-one mapping. Prefixes are in descending order (most privileges first).

- The value is OPTIONAL; when not specified, no prefixes are supported.
- If not published at all, clients SHOULD assume `PREFIX=(ov)@+`.

```
PREFIX=(ov)@+
PREFIX=(ohv)@%+
PREFIX=(qaohv)~&@%+
```

### SAFELIST Parameter

```
Format: SAFELIST
```

If advertised, the server ensures a client may perform the LIST command without being disconnected due to the volume of data.

- This parameter MUST NOT be specified with a value.

```
SAFELIST
```

### SILENCE Parameter

```
Format: SILENCE[=<limit>]
```

Indicates the maximum number of entries a client can have in their silence list.

- The value is OPTIONAL; if specified, it's a positive integer. If not specified, the server does not support the SILENCE command.

```
SILENCE
SILENCE=15
SILENCE=32
```

### STATUSMSG Parameter

```
Format: STATUSMSG=<string>
```

Indicates the server supports sending messages via PRIVMSG/NOTICE to channel members with specific membership prefixes.

- The value MUST be specified and MUST be a list of prefixes as in the PREFIX parameter.

```
STATUSMSG=@+
STATUSMSG=@%+
STATUSMSG=~&@%+
```

### TARGMAX Parameter

```
Format: TARGMAX=[<command>:[limit]{,<command>:[limit]}]
```

Defines the maximum number of targets allowed for commands that accept multiple targets (delimited by comma `(',', 0x2C)`).

- The value is OPTIONAL; a set of `<command>:<limit>` pairs delimited by comma `(',', 0x2C)`.
- `<limit>` is a positive integer, or omitted for no maximum.
- Clients MUST treat `<command>` as case-insensitive.
- If not advertised, clients SHOULD assume only JOIN and PART accept multiple targets.

```
TARGMAX=PRIVMSG:3,WHOIS:1,JOIN:
TARGMAX=NAMES:1,LIST:1,KICK:1,WHOIS:1,PRIVMSG:4,NOTICE:4,ACCEPT:,MONITOR:
TARGMAX=ACCEPT:,KICK:1,LIST:1,NAMES:1,NOTICE:4,PRIVMSG:4,WHOIS:1
```

### TOPICLEN Parameter

```
Format: TOPICLEN=<number>
```

Indicates the maximum length of a topic a client may set. Channels on the network MAY have topics longer than this.

- The value MUST be specified and MUST be a positive integer.
- Typical value is `307`.

```
TOPICLEN=307
TOPICLEN=390
```

### USERLEN Parameter

```
Format: USERLEN=<number>
   Status: Proposed
```

Indicates the maximum length of a username on the server. The tilde prefix (`"~"`), if present, counts toward this length.

- The value MUST be specified and MUST be a positive integer.

```
USERLEN=12
USERLEN=18
```
