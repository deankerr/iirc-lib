# Operator Messages

Messages are client-to-server only unless otherwise specified. For server-to-client messages of this type, the message `<source>` usually indicates the client the message relates to.

- 'command' refers to the message's behaviour when sent from a client to the server. 'Command Examples' are client-to-server, 'Message Examples' are server-to-client.
- If a command is sent with fewer parameters than required, the server replies with ERR_NEEDMOREPARAMS (461) and the command fails.
- In the `"Parameters:"` section, optional parts are noted with square brackets: `"[<param>]"`. Curly braces indicate repeatable parts: `"<key>{,<key>}"` means at least one `<key>`, with additional keys separated by comma `(",", 0x2C)`.

The following messages are typically reserved to server operators.

### CONNECT message

```
Command: CONNECT
  Parameters: <target server> [<port> [<remote server>]]
```

The `CONNECT` command forces a server to try to establish a new connection to another server. It is a privileged command available only to IRC Operators.

- If a remote server is given, the connection is attempted by that remote server to `<target server>` using `<port>`.

Numeric Replies:

- ERR_NOSUCHSERVER (402)
- ERR_NEEDMOREPARAMS (461)
- ERR_NOPRIVILEGES (481)
- ERR_NOPRIVS (723)

Command Examples:

```
CONNECT tolsun.oulu.fi
  ; Attempt to connect the current server to tololsun.oulu.fi

CONNECT eff.org 12765 csd.bu.edu
  ; Attempt to connect csu.bu.edu to eff.org on port 12765
```

### KILL message

```
Command: KILL
  Parameters: <nickname> <comment>
```

The `KILL` command closes the connection between a given client and the server they are connected to. It is a privileged command available only to IRC Operators. `<nickname>` is the user to be 'killed', and `<comment>` is shown to all users and to the user themselves.

- When `KILL` is used, the killed client receives the `KILL` message with `<source>` being the operator who performed the command. The user being killed and every user sharing a channel with them receives a `QUIT` message. The `<reason>` typically has the form: `"Killed (<killer> (<reason>))"` where `<killer>` is the nickname of the user who performed the `KILL`. The user being killed then receives the `ERROR` message, typically containing a `<reason>` of `"Closing Link: <servername> (Killed (<killer> (<reason>)))"`. After this, their connection is closed.
- If a `KILL` message is received by a client, it means the user specified by `<nickname>` is being killed. With certain servers, users may elect to receive `KILL` messages for other users to monitor the network. This may be restricted to operators.
- Clients can rejoin instantly after being killed, but it can serve as a warning. It can also stop large amounts of flooding. Abusive users may promptly reconnect; operators may use the `KLINE` command to keep them from rejoining.
- As nicknames across an IRC network MUST be unique, if duplicates are found when servers join, one or both clients MAY be KILLed. Servers may also handle this in alternate ways.
- Servers MAY restrict whether specific operators can remove remote users. If an operator tries to remove a remote user but lacks privilege, they should receive ERR_NOPRIVS (723).
- `<comment>` SHOULD reflect why the `KILL` was performed.

Numeric Replies:

- ERR_NOSUCHSERVER (402)
- ERR_NEEDMOREPARAMS (461)
- ERR_NOPRIVILEGES (481)
- ERR_NOPRIVS (723)

### REHASH message

```
Command: REHASH
  Parameters: None
```

The `REHASH` command is an administrative command used by an operator to force the local server to re-read and process its configuration file.

- This may include other data, such as modules or TLS certificates.
- Servers MAY accept, as an optional argument, the name of a remote server that should be rehashed instead of the current one.

Numeric replies:

- RPL_REHASHING (382)
- ERR_NOPRIVILEGES (481)

Example:

```
REHASH                          ; message from user with operator
                                 status to server asking it to reread
                                 its configuration file.
```

### RESTART message

```
Command: RESTART
  Parameters: None
```

An operator can use the restart command to force the server to restart itself.

- This message is optional since it may be viewed as a risk to allow arbitrary people to connect as an operator and execute this command, causing at least a disruption to service.

Numeric replies:

- ERR_NOPRIVILEGES (481)

Example:

```
RESTART                         ; no parameters required.
```

### SQUIT message

```
Command: SQUIT
  Parameters: <server> <comment>
```

The `SQUIT` command disconnects a server from the network. It is a privileged command available only to IRC Operators. `<comment>` is the reason why the server link is being disconnected.

- In a traditional spanning-tree topology, the command gets forwarded to the specified server, and the link between the specified server and the last server to propagate the command gets broken.

Numeric replies:

- ERR_NOSUCHSERVER (402)
- ERR_NEEDMOREPARAMS (461)
- ERR_NOPRIVILEGES (481)
- ERR_NOPRIVS (723)

Examples:

```
SQUIT tolsun.oulu.fi :Bad Link ?  ; Command to uplink of the server
                                 tolson.oulu.fi to terminate its
                                 connection with comment "Bad Link".
```

## Optional Messages

These messages are not required for a server implementation to work, but SHOULD be implemented. If a command is not implemented, it MUST return ERR_UNKNOWNCOMMAND (421).

### LINKS message

```
Command: LINKS
  Parameters: None
```

With LINKS, a user can list all servers which are known by the server answering the query, usually including the server itself.

- In reply, a server MUST send zero or more RPL_LINKS (364) messages and mark the end using RPL_ENDOFLINKS (365).
- Servers MAY omit some or all servers on the network, including itself.

Numeric Replies:

- RPL_LINKS (364)
- RPL_ENDOFLINKS (365)

Reply Example:

```
:My.Little.Server 364 nick services.example.org My.Little.Server :1 Anope IRC Services
 :My.Little.Server 364 nick My.Little.Server My.Little.Server :0 test server
 :My.Little.Server 365 nick * :End of /LINKS list.
```

### USERHOST message

```
Command: USERHOST
  Parameters: <nickname>{ <nickname>}
```

The `USERHOST` command returns information about users with the given nicknames. It takes up to five nicknames, each as a separate parameter. Results are returned in RPL_USERHOST (302) numerics.

Numeric Replies:

- ERR_NEEDMOREPARAMS (461)
- RPL_USERHOST (302)

Command Examples:

```
USERHOST Wiz Michael Marty p    ;USERHOST request for information on
                                  nicks "Wiz", "Michael", "Marty" and "p"
```

Reply Examples:

```
:ircd.stealth.net 302 yournick :syrk=+syrk@millennium.stealth.net
                                  ; Reply for user syrk
```

### WALLOPS message

```
Command: WALLOPS
  Parameters: <text>
```

The WALLOPS command sends a message to all currently connected users who have set the 'w' user mode.

- `<text>` SHOULD be non-empty.
- Servers MAY echo WALLOPS messages to their sender even if they don't have the 'w' user mode.
- Servers MAY send WALLOPS only to operators.
- Servers may generate WALLOPS themselves, and MAY allow operators to send them.

Numeric replies:

- ERR_NEEDMOREPARAMS (461)
- ERR_NOPRIVILEGES (481)
- ERR_NOPRIVS (723)

Examples:

```
:csd.bu.edu WALLOPS :Connect '*.uiuc.edu 6667' from Joshua
                                 ;WALLOPS message from csd.bu.edu announcing
                                 a CONNECT message it received and acted
                                 upon from Joshua.
```
