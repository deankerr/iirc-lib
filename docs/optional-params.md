### MODE message

```
Command: MODE
  Parameters: <target> [<modestring> [<mode arguments>...]]
```

### RPL_WELCOME (001)

```
"<client> :Welcome to the <networkname> Network, <nick>[!<user>@<host>]"
```

The first message sent after client registration, introducing the client to the network. The text used in the last param of this message varies wildly.

- Servers implementing spoofed hostmasks SHOULD NOT include the extended hostmask in the last parameter, because some clients try to extract and resolve the hostname to discover their local IP address.
- Clients MUST NOT try to extract and resolve the hostname from the final parameter. This WILL BREAK when the server returns a spoofed hostname.

### RPL_MYINFO (004)

```
"<client> <servername> <version> <available user modes>
  <available channel modes> [<channel modes with a parameter>]"
```

Part of the post-registration greeting. Clients SHOULD discover available features using RPL_ISUPPORT tokens rather than the mode letters listed here.

### RPL_ISUPPORT (005)

```
"<client> <1-13 tokens> :are supported by this server"
```

Advertises server features and information via tokens. A server MUST issue at least one RPL_ISUPPORT numeric after registration, before processing further commands.

The ABNF representation for an RPL_ISUPPORT token is:

```
token      =  *1"-" parameter / parameter *1( "=" value )
  parameter  =  1*20 (letter / "." / "/")
  value      =  * letpun
  letter     =  ALPHA / DIGIT
  punct      =  %d33-47 / %d58-64 / %d91-96 / %d123-126
  letpun     =  letter / punct
```

- Maximum 15 message parameters per reply, so maximum 13 RPL_ISUPPORT tokens per numeric. Servers MAY issue multiple RPL_ISUPPORT numerics.
- A token is of the form `PARAMETER`, `PARAMETER=VALUE`, or `-PARAMETER`. Servers MUST send the parameter as upper-case text.
- `PARAMETER` or `PARAMETER=VALUE` advertise features or information. A parameter MAY have a default value and value MAY be empty. Unless otherwise stated, values are case sensitive.
- Multi-field values SHOULD be delimited with a comma `(",", 0x2C)`.
- Values MAY contain escape sequences: `\x20` for space `(" ", 0x20)`, `\x5C` for backslash `("\", 0x5C)`, `\x3D` for equal `("=", 0x3D)`.
- If a parameter value changes, the server SHOULD re-advertise it (e.g. a client becoming an IRC operator and their CHANLIMIT changing).
- `-PARAMETER` negates a previously specified parameter. The client MUST consider that parameter removed and revert to default behaviour. These tokens MUST NOT contain a value field.
- The server MAY negate parameters not previously advertised; the client MUST ignore such tokens.
- A single RPL_ISUPPORT reply MUST NOT contain the same parameter multiple times, nor advertise and negate the same parameter. The server may advertise or negate the same parameter in separate replies.
- When a VERSION command is sent to an external server, that server's ISUPPORT tokens are sent using the `105` (RPL_REMOTEISUPPORT) numeric instead of 005, so clients don't process external tokens. The format is identical except for the numeric.

### RPL_STATSCOMMANDS (212)

```
"<client> <command> <count> [<byte count> <remote count>]"
```

Reply to the STATS command when requesting statistics on command usage.

- `<byte count>` and `<remote count>` are optional and MAY be included.

### RPL_ADMINME (256)

```
"<client> [<server>] :Administrative info"
```

Reply to the ADMIN command, establishes the name of the server whose administrative info is being provided. The text used in the last param of this message may vary.

- `<server>` is optional and MAY be included; the server can also be gained from the `<source>` of this message.

### RPL_LOCALUSERS (265)

```
"<client> [<u> <m>] :Current local users <u>, max <m>"
```

Reply to the LUSERS command. `<u>` and `<m>` are non-negative integers representing current clients and maximum clients connected directly to this server at one time.

- The two optional parameters SHOULD be supplied to allow clients to better extract these numbers.

### RPL_GLOBALUSERS (266)

```
"<client> [<u> <m>] :Current global users <u>, max <m>"
```

Reply to the LUSERS command. `<u>` and `<m>` are non-negative integers. `<u>` is the number of clients currently connected globally (directly and through other server links). `<m>` is the maximum number of clients connected at one time globally.

- The two optional parameters SHOULD be supplied to allow clients to better extract these numbers.

### RPL_USERHOST (302)

```
"<client> :[<reply>{ <reply>}]"
```

Reply to the USERHOST command, lists nicknames and associated information. The last parameter (if there are results) is a list of `<reply>` values delimited by SPACE `(' ', 0x20)`.

The ABNF representation for `<reply>` is:

```
reply   =  nickname [ isop ] "=" isaway hostname
  isop    =  "*"
  isaway  =  ( "+" / "-" )
```

- `<isop>` is included if the user is an operator.
- `<isaway>`: `"+"` means not away, `"-"` means away.

### RPL_WHOISCHANNELS (319)

```
"<client> <nick> :[prefix]<channel>{ [prefix]<channel>}
```

Reply to the WHOIS command, lists the channels `<nick>` is joined to and their status. The last parameter is a list of `[prefix]<channel>` pairs delimited by SPACE `(' ', 0x20)`.

- `<prefix>` is the highest channel membership prefix the client has in that channel, if any.
- Clients MUST ignore the trailing SPACE character, if any.
- RPL_WHOISCHANNELS can be sent multiple times in the same whois reply if the target is on too many channels to fit in a single message.
- The channels in this response are affected by the secret channel mode and the invisible user mode, and may be affected by other modes depending on server software and configuration.

### RPL_CHANNELMODEIS (324)

```
"<client> <channel> <modestring> <mode arguments>..."
```

Informs the client of the currently-set modes of a channel.

- `<channel>` is the channel name.
- `<modestring>` and `<mode arguments>` are a mode string and mode arguments (delimited as separate parameters) as defined in the MODE message description.

### RPL_NAMREPLY (353)

```
"<client> <symbol> <channel> :[prefix]<nick>{ [prefix]<nick>}
```

Reply to the NAMES command, lists the clients joined to `<channel>` and their status.

`<symbol>` notes the status of the channel:

- `("=", 0x3D)` — Public channel.
- `("@", 0x40)` — Secret channel (secret channel mode `"+s"`).
- `("*", 0x2A)` — Private channel (was `"+p"`, no longer widely used today).

- `<nick>` is the nickname of a client joined to the channel.
- `<prefix>` is the highest channel membership prefix that client has in the channel, if any.
- The last parameter is a list of `[prefix]<nick>` pairs delimited by SPACE `(' ', 0x20)`.

### RPL_BANLIST (367)

```
"<client> <channel> <mask> [<who> <set-ts>]"
```

Reply to the MODE command when viewing the current entries on a channel's ban list. `<mask>` is the given mask on the ban list.

- `<who>` and `<set-ts>` are optional and MAY be included. `<who>` is either the nickname or nickmask of the client that set the ban, or a server name. `<set-ts>` is the UNIX timestamp of when the ban was set.

### RPL_TIME (391)

```
"<client> <server> [<timestamp> [<TS offset>]] :<human-readable time>"
```

Reply to the TIME command. Typically only contains the human-readable time, but may include a UNIX timestamp.

- Clients SHOULD NOT parse the human-readable time.
- `<TS offset>` is used by some TS-based server-to-server protocols (e.g. TS6), representing the offset between the server's system time and the network TS. A positive value means the server is lagging behind.
- Clients SHOULD ignore the TS offset value.

### ERR_UNKNOWNERROR (400)

```
"<client> <command>{ <subcommand>} :<info>"
```

Indicates that the given command/subcommand could not be processed. `<subcommand>` may repeat for more specific subcommands.

For example, for an issue with a hypothetical command `PACK`:

```
:example.com 400 dan!~d@n PACK :Could not process multiple invalid parameters
```

For an issue with a hypothetical command `PACK` with subcommand `BOX`:

```
:example.com 400 dan!~d@n PACK BOX :Could not find box to pack
```

- This numeric indicates a very generalised error (which `<info>` should further explain). If there is a more specific numeric for the error, that should be used instead.
