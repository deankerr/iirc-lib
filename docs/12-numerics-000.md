### RPL_WELCOME (001)

```
"<client> :Welcome to the <networkname> Network, <nick>[!<user>@<host>]"
```

The first message sent after client registration, introducing the client to the network. The text used in the last param of this message varies wildly.

- Servers implementing spoofed hostmasks SHOULD NOT include the extended hostmask in the last parameter, because some clients try to extract and resolve the hostname to discover their local IP address.
- Clients MUST NOT try to extract and resolve the hostname from the final parameter. This WILL BREAK when the server returns a spoofed hostname.

### RPL_YOURHOST (002)

```
"<client> :Your host is <servername>, running version <version>"
```

Part of the post-registration greeting, returns the name and software/version of the server the client is connected to. The text used in the last param of this message varies wildly.

### RPL_CREATED (003)

```
"<client> :This server was created <datetime>"
```

Part of the post-registration greeting, returns a human-readable date/time the server was started or created. The text used in the last param of this message varies wildly.

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

See the Feature Advertisement section for more details. A list of parameters is available in the RPL_ISUPPORT Parameters section.

### RPL_BOUNCE (010)

```
"<client> <hostname> <port> :<info>"
```

Redirects the client to another server. The `<info>` text varies between server software and reasons for redirection.

- This numeric does not specify whether to enable SSL and is not interpreted correctly by all clients, so its use is not recommended.
- Also known as `RPL_REDIR` by some software.
