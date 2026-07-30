# Connection Messages

Messages are client-to-server only unless otherwise specified. For server-to-client messages of this type, the message `<source>` usually indicates the client the message relates to.

- 'command' refers to the message's behaviour when sent from a client to the server. 'Command Examples' are client-to-server, 'Message Examples' are server-to-client.
- If a command is sent with fewer parameters than required, the server replies with ERR_NEEDMOREPARAMS (461) and the command fails.
- In the `"Parameters:"` section, optional parts are noted with square brackets: `"[<param>]"`. Curly braces indicate repeatable parts: `"<key>{,<key>}"` means at least one `<key>`, with additional keys separated by comma `(",", 0x2C)`.

### CAP message

```
Command: CAP
  Parameters: <subcommand> [:<capabilities>]
```

The `CAP` command is used for capability negotiation between a server and a client. The `CAP` message may be sent from the server to the client.

- For the exact semantics of the `CAP` command and subcommands, see the Capability Negotiation specification.

### AUTHENTICATE message

```
Command: AUTHENTICATE
```

The `AUTHENTICATE` command is used for SASL authentication between a server and a client. The client must support and successfully negotiate the `"sasl"` client capability before using this command. The `AUTHENTICATE` message may be sent from the server to the client.

- For the exact semantics of the `AUTHENTICATE` command and negotiating support for the `"sasl"` client capability, see the IRCv3.1 and IRCv3.2 SASL Authentication specifications.

### PASS message

```
Command: PASS
  Parameters: <password>
```

The `PASS` command sets a 'connection password', which must be sent before any attempt to register the connection (i.e., before `NICK` / `USER`).

- The password must match the one defined in the server configuration.
- Multiple `PASS` commands may be sent before registering, but only the last one is used for verification.
- The password may not be changed once the client has been registered.
- If the password does not match, the server SHOULD send ERR_PASSWDMISMATCH (464) and MAY close the connection with `ERROR`. Servers MUST send at least one of these two messages.
- Servers may also consider requiring SASL authentication as an alternative, when more information or an alternate form of identity verification is desired.

Numeric replies:

- ERR_NEEDMOREPARAMS (461)
- ERR_ALREADYREGISTERED (462)
- ERR_PASSWDMISMATCH (464)

Command Example:

```
PASS secretpasswordhere
```

### NICK message

```
Command: NICK
  Parameters: <nickname>
```

The `NICK` command gives the client a nickname or changes the previous one.

- If the desired nickname is already in use, the server issues ERR_NICKNAMEINUSE and ignores the command.
- If the new nickname is not valid (e.g., contains invalid characters), the server issues ERR_ERRONEUSNICKNAME and ignores the command.
- Servers MUST allow at least all alphanumerical characters, square and curly brackets (`[]{}`), backslashes (`\`), and pipe (`|`) characters in nicknames, and MAY disallow digits as the first character.
- Servers MAY allow extra characters, as long as they do not introduce ambiguity in other commands, including:
  - no leading `#` character or other character advertised in CHANTYPES
  - no leading colon (`:`)
  - no ASCII space
- If `<nickname>` is not provided, the server issues ERR_NONICKNAMEGIVEN and ignores the command.
- The `NICK` message may be sent from the server to clients to acknowledge a successful `NICK` command or to inform other clients about the change. In these cases, the `<source>` is the old `nickname [ [ "!" user ] "@" host ]` of the user changing their nickname.

Numeric Replies:

- ERR_NONICKNAMEGIVEN (431)
- ERR_ERRONEUSNICKNAME (432)
- ERR_NICKNAMEINUSE (433)
- ERR_NICKCOLLISION (436)

Command Example:

```
NICK Wiz                  ; Requesting the new nick "Wiz".
```

Message Examples:

```
:WiZ NICK Kilroy          ; WiZ changed his nickname to Kilroy.

:dan-!d@localhost NICK Mamoped
                          ; dan- changed his nickname to Mamoped.
```

### USER message

```
Command: USER
  Parameters: <username> 0 * <realname>
```

The `USER` command specifies the username and realname of a new user at the beginning of a connection.

- `<realname>` must be the last parameter because it may contain SPACE `(' ', 0x20)` characters, and should be prefixed with a colon (`:`) if required.
- Servers MAY use the Ident Protocol to look up the 'real username' of clients. If username lookups are enabled and a client does not have an Identity Server enabled, the username SHOULD be prefixed by a tilde `('~', 0x7E)` to show it is user-set.
- The maximum length of `<username>` may be specified by the USERLEN RPL_ISUPPORT parameter. If advertised, the username MUST be silently truncated to that length.
- The minimum length of `<username>` is 1 (MUST NOT be empty). If empty, the server SHOULD reject with ERR_NEEDMOREPARAMS (461) (even if an empty parameter is provided); otherwise it MUST use a default value.
- The second and third parameters SHOULD be sent as one zero `('0', 0x30)` and one asterisk `('*', 0x2A)`, as the meaning of these varies between IRC protocol versions.
- Clients SHOULD use the nickname as a fallback value for `<username>` and `<realname>` when they don't have a meaningful value.
- If a client sends `USER` after already completing registration, ERR_ALREADYREGISTERED is sent and the attempt fails.
- If the client sends `USER` after the server has received a username via Ident Protocol, the `<username>` parameter from this command should be ignored in favour of the identity server's value.

Numeric Replies:

- ERR_NEEDMOREPARAMS (461)
- ERR_ALREADYREGISTERED (462)

Command Examples:

```
USER guest 0 * :Ronnie Reagan
                              ; No ident server
                              ; User gets registered with username
                              "~guest" and real name "Ronnie Reagan"

USER guest 0 * :Ronnie Reagan
                              ; Ident server gets contacted and
                              returns the name "danp"
                              ; User gets registered with username
                              "danp" and real name "Ronnie Reagan"
```

### PING message

```
Command: PING
  Parameters: <token>
```

The `PING` command is sent by either clients or servers to check the other side is still connected and/or to check connection latency at the application layer.

- The `<token>` may be any non-empty string.
- When receiving a `PING`, clients or servers must reply with a `PONG` message with the same `<token>` value, allowing either to match `PONG` with the `PING` (e.g., to compute latency).
- Clients should not send `PING` during connection registration, though servers may accept it.
- Servers may send `PING` during connection registration and clients must reply to them.
- Older versions of the protocol gave specific semantics to the `<token>` and allowed an extra parameter; these features are not consistently implemented and should not be relied on. The `<token>` should be treated as an opaque value by the receiver.

Numeric Replies:

- ERR_NEEDMOREPARAMS (461)
- ERR_NOORIGIN (409)

Deprecated Numeric Reply:

- ERR_NOSUCHSERVER (402)

### PONG message

```
Command: PONG
  Parameters: [<server>] <token>
```

The `PONG` command is used as a reply to `PING` commands, by both clients and servers.

- The `<token>` should be the same as the one in the `PING` message that triggered this `PONG`.
- Servers MUST send a `<server>` parameter, and clients SHOULD ignore it. It exists for historical reasons and indicates the name of the server sending the PONG.
- Clients MUST NOT send a `<server>` parameter.

Numeric Replies:

- None

### OPER message

```
Command: OPER
  Parameters: <name> <password>
```

The `OPER` command is used by a normal user to obtain IRC operator privileges. Both parameters are required.

- If the password is incorrect for the given name, the server replies with ERR_PASSWDMISMATCH and the request fails.
- If the client is not connecting from a valid host for the given name, the server replies with ERR_NOOPERHOST and the request fails.
- If the name and password are both correct and the user is from a valid host, RPL_YOUREOPER is sent. The user will also receive a `MODE` message indicating their new user modes, and other messages may be sent.
- The `<name>` is separate from accounts specified by SASL authentication, and is generally stored in the IRCd configuration.

Numeric Replies:

- ERR_NEEDMOREPARAMS (461)
- ERR_PASSWDMISMATCH (464)
- ERR_NOOPERHOST (491)
- RPL_YOUREOPER (381)

Command Example:

```
OPER foo bar                ; Attempt to register as an operator
                              using a name of "foo" and the password "bar".
```

### QUIT message

```
Command: QUIT
 Parameters: [<reason>]
```

The `QUIT` command terminates a client's connection to the server. The server acknowledges this by replying with an `ERROR` message and closing the connection.

- This message may also be sent from the server to a client to show that a client has exited the network, typically only to clients sharing a channel with the exiting user. When sent this way, `<source>` represents the client that has exited.
- When a client-sent `QUIT` terminates the connection, servers SHOULD prepend `<reason>` with the ASCII string `"Quit: "` when sending `QUIT` to other clients. This applies even if `<reason>` is empty (the reason sent SHOULD be just `"Quit: "`). Clients SHOULD NOT change behaviour based on this prefix, as it is not required from servers.
- When a netsplit occurs, a `QUIT` message is generated for each exiting client. The `<reason>` SHOULD be composed of the names of the two servers involved, separated by SPACE `(' ', 0x20)` — the first name is the still-connected server, the second is the disconnected server. Servers MAY instead use the literal ASCII string `"*.net *.split"`. Software implementing the IRCv3 `batch` Extension should also look at the `netsplit` and `netjoin` batch types.
- If a client connection is closed without the client issuing a `QUIT`, the server MUST distribute a `QUIT` message to other clients with `<reason>` reflecting the nature of the event (e.g., `"Ping timeout: 120 seconds"`, `"Excess Flood"`, `"Too many connections from this IP"`).

Numeric Replies:

- None

Command Example:

```
QUIT :Gone to have lunch         ; Client exiting from the network
```

Message Example:

```
:dan-!d@localhost QUIT :Quit: Bye for now!
                                   ; dan- is exiting the network with
                                   the message: "Quit: Bye for now!"
```

### ERROR message

```
Command: ERROR
 Parameters: <reason>
```

This message is sent from a server to a client to report a fatal error, before terminating the connection.

- This MUST only be used to report fatal errors. Regular errors should use the appropriate numerics or the IRCv3 standard replies framework.

Numeric Replies:

- None

Command Example:

```
ERROR :Connection timeout        ; Server closing a client connection because it
                                   is unresponsive.
```
