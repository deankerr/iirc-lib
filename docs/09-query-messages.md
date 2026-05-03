# Query Messages

Messages are client-to-server only unless otherwise specified. For server-to-client messages of this type, the message `<source>` usually indicates the client the message relates to.

- 'command' refers to the message's behaviour when sent from a client to the server. 'Command Examples' are client-to-server, 'Message Examples' are server-to-client.
- If a command is sent with fewer parameters than required, the server replies with ERR_NEEDMOREPARAMS (461) and the command fails.
- In the `"Parameters:"` section, optional parts are noted with square brackets: `"[<param>]"`. Curly braces indicate repeatable parts: `"<key>{,<key>}"` means at least one `<key>`, with additional keys separated by comma `(",", 0x2C)`.

## Server Queries and Commands

### MOTD message

```
Command: MOTD
  Parameters: [<target>]
```

The `MOTD` command gets the "Message of the Day" of the given server. If `<target>` is not given, the MOTD of the server the client is connected to should be returned.

- If `<target>` is a server, the MOTD for that server is requested. If `<target>` is given and a matching server cannot be found, ERR_NOSUCHSERVER is returned and the command fails.
- If the MOTD can be found: one RPL_MOTDSTART (375), one or more RPL_MOTD (372), then one RPL_ENDOFMOTD (376).
- If the MOTD does not exist or could not be found, ERR_NOMOTD (422) is returned.

Numeric Replies:

- ERR_NOSUCHSERVER (402)
- ERR_NOMOTD (422)
- RPL_MOTDSTART (375)
- RPL_MOTD (372)
- RPL_ENDOFMOTD (376)

### VERSION Message

```
Command: VERSION
  Parameters: [<target>]
```

The `VERSION` command queries the version of the software and the RPL_ISUPPORT parameters of the given server. If `<target>` is not given, the info for the server the client is connected to should be returned.

- If `<target>` is a server, info for that server is requested. If `<target>` is a client, info for the server that client is connected to is requested. If a matching server cannot be found, ERR_NOSUCHSERVER is returned and the command fails.
- Wildcards are allowed in the `<target>` parameter.
- Upon receiving `VERSION`, the given server SHOULD respond with one RPL_VERSION (351) reply and one or more RPL_ISUPPORT (005) replies.

Numeric Replies:

- ERR_NOSUCHSERVER (402)
- RPL_ISUPPORT (005)
- RPL_VERSION (351)

Command Examples:

```
:Wiz VERSION *.se               ; message from Wiz to check the
                                  version of a server matching "*.se"

VERSION tolsun.oulu.fi          ; check the version of server
                                  "tolsun.oulu.fi".
```

### ADMIN message

```
Command: ADMIN
  Parameters: [<target>]
```

The `ADMIN` command finds the name of the administrator of the given server. If `<target>` is not given, the info for the server the client is connected to should be returned.

- If `<target>` is a server, info for that server is requested. If `<target>` is a client, info for the server that client is connected to is requested. If a matching server cannot be found, ERR_NOSUCHSERVER is returned and the command fails.
- Wildcards are allowed in the `<target>` parameter.
- Upon receiving `ADMIN`, the given server SHOULD respond with RPL_ADMINME (256), RPL_ADMINLOC1 (257), RPL_ADMINLOC2 (258), and RPL_ADMINEMAIL (259).

Numeric Replies:

- ERR_NOSUCHSERVER (402)
- RPL_ADMINME (256)
- RPL_ADMINLOC1 (257)
- RPL_ADMINLOC2 (258)
- RPL_ADMINEMAIL (259)

Command Examples:

```
ADMIN tolsun.oulu.fi            ; request an ADMIN reply from
                                  tolsun.oulu.fi

ADMIN syrk                      ; ADMIN request for the server to
                                  which the user syrk is connected
```

### LUSERS message

```
Command: LUSERS
  Parameters: None
```

Returns statistics about local and global users, as numeric replies.

- Servers MUST reply with RPL_LUSERCLIENT (251) and RPL_LUSERME (255), and SHOULD also include all those defined below.
- Clients SHOULD NOT try to parse the free-form text in the trailing parameter, and rely on specific parameters instead.

- RPL_LUSERCLIENT (251)
- RPL_LUSEROP (252)
- RPL_LUSERUNKNOWN (253)
- RPL_LUSERCHANNELS (254)
- RPL_LUSERME (255)
- RPL_LOCALUSERS (265)
- RPL_GLOBALUSERS (266)

### TIME message

```
Command: TIME
  Parameters: [<server>]
```

The `TIME` command queries local time from the specified server. If the server parameter is not given, the server handling the command must reply.

Numeric Replies:

- ERR_NOSUCHSERVER (402)
- RPL_TIME (391)

Command Examples:

```
TIME tolsun.oulu.fi             ; check the time on the server
                                  "tolson.oulu.fi"

:Angel TIME *.au                ; user angel checking the time on a
                                  server matching "*.au"
```

See also:

- IRCv3 server-time Extension

### STATS message

```
Command: STATS
  Parameters: <query> [<server>]
```

The `STATS` command queries statistics of a certain server. The specific queries supported depend on the server.

- A query may be given by any single letter, which is only checked by the destination server and is otherwise passed on by intermediate servers, ignored and unaltered.
- The currently supported queries are:
  - `c` - returns a list of servers which the server may connect to or allow connections from
  - `h` - returns a list of servers which are either forced to be treated as leaves or allowed to act as hubs
  - `i` - returns a list of hosts which the server allows a client to connect from
  - `k` - returns a list of banned username/hostname combinations for that server
  - `l` - returns a list of the server's connections, showing how long each connection has been established and the traffic over that connection in bytes and messages for each direction
  - `m` - returns a list of commands supported by the server and the usage count for each if the usage count is non zero
  - `o` - returns a list of hosts from which normal clients may become operators
  - `u` - returns a string showing how long the server has been up
  - `y` - show Y (Class) lines from server's configuration file

Numeric Replies:

- ERR_NOSUCHSERVER (402)
- ERR_NEEDMOREPARAMS (461)
- ERR_NOPRIVILEGES (481)
- ERR_NOPRIVS (723)
- RPL_STATSCLINE (213)
- RPL_STATSHLINE (244)
- RPL_STATSILINE (215)
- RPL_STATSKLINE (216)
- RPL_STATSLLINE (241)
- RPL_STATSOLINE (243)
- RPL_STATSLINKINFO (211)
- RPL_STATSUPTIME (242)
- RPL_STATSCOMMANDS (212)
- RPL_ENDOFSTATS (219)

Command Examples:

```
STATS m                         ; check the command usage for the
                                  server you are connected to

:Wiz STATS c eff.org            ; request by WiZ for C/N line
                                  information from server eff.org
```

### HELP message

```
Command: HELP
  Parameters: [<subject>]
```

The `HELP` command returns documentation about the IRC server and the IRC commands it implements.

- When receiving `HELP`, servers MUST either: reply with a single ERR_HELPNOTFOUND (524); or reply with a single RPL_HELPSTART (704), then arbitrarily many RPL_HELPTXT (705) messages, then a single RPL_ENDOFHELP (706). Servers MAY return the RPL_HELPTXT (705) form for unknown subjects, especially if their reply would not fit in a single line.
- RPL_HELPSTART (704) SHOULD be some sort of title, and the first RPL_HELPTXT (705) SHOULD be empty. This is what most servers do today.
- Servers MAY define any `<subject>` they want. Servers typically have documentation for most IRC commands they support.
- Clients SHOULD gracefully handle older servers that reply to `HELP` with a set of `NOTICE` messages. On these servers, the client may try sending the `HELPOP` command (with the same syntax), which may return the numeric-based reply.
- Clients SHOULD also gracefully handle servers that reply to `HELP` with a set of `290` / `291` / `292` / `293` / `294` / `295` numerics.

Numerics:

- ERR_HELPNOTFOUND (524)
- RPL_HELPSTART (704)
- RPL_HELPTXT (705)
- RPL_ENDOFHELP (706)

Command Examples:

```
HELP                                                     ; request generic help
  :server 704 val * :** Help System **                     ; first line
  :server 705 val * :
  :server 705 val * :Try /HELP <command> for specific help,
  :server 705 val * :/HELP USERCMDS to list available
  :server 706 val * :commands, or join the #help channel   ; last line

  HELP PRIVMSG                                             ; request help on PRIVMSG
  :server 704 val PRIVMSG :** The PRIVMSG command **
  :server 705 val PRIVMSG :
  :server 705 val PRIVMSG :The /PRIVMSG command is the main way
  :server 706 val PRIVMSG :to send messages to other users.

  HELP :unknown subject                                    ; request help on "unknown subject"
  :server 524 val * :I do not know anything about this

  HELP :unknown subject
  :server 704 val * :** Help System **
  :server 705 val * :
  :server 705 val * :I do not know anything about this.
  :server 705 val * :
  :server 705 val * :Try /HELP USERCMDS to list available
  :server 706 val * :commands, or join the #help channel
```

### INFO message

```
Command: INFO
  Parameters: None
```

The `INFO` command returns information which describes the server, usually including the software name/version and its authors, and possibly patch level, compile date, copyright, and other relevant info.

- Upon receiving `INFO`, the server responds with zero or more RPL_INFO (371) replies, followed by one RPL_ENDOFINFO (374) numeric.

Numeric Replies:

- RPL_INFO (371)
- RPL_ENDOFINFO (374)

Command Examples:

```
INFO                            ; request info from the server
```

### LIST message

```
Command: LIST
  Parameters: [<channel>{,<channel>}] [<elistcond>{,<elistcond>}]
```

The `LIST` command gets a list of channels along with information about each. Both parameters are optional with different syntaxes.

- The first parameter is a list of channel names delimited by comma `(",", 0x2C)`. If given, only those channels' info is returned. If not given, info about all visible channels (those not hidden by the secret channel mode rules) is returned.
- The second parameter is a list of ELIST conditions delimited by comma `(",", 0x2C)`. Clients MUST NOT submit an ELIST condition unless the server has explicitly defined support via the ELIST token. If supplied, the server filters the returned list with the given conditions as specified in the ELIST documentation.
- In response, the server MAY send one RPL_LISTSTART (321) numeric, MUST send zero or more RPL_LIST (322) numerics, and MUST send one RPL_LISTEND (323) numeric.

Numeric Replies:

- RPL_LISTSTART (321)
- RPL_LIST (322)
- RPL_LISTEND (323)

Command Examples:

```
LIST                            ; Command to list all channels

LIST #twilight_zone,#42         ; Command to list the channels
                                "#twilight_zone" and "#42".

LIST >3                         ; Command to list all channels with
                                more than three users.

LIST C>60                       ; Command to list all channels with
                                created at least 60 minutes ago

LIST T<60                       ; Command to list all channels with
                                a topic changed within the last 60 minutes
```

## User-Based Queries

### WHO message

```
Command: WHO
  Parameters: <mask>
```

This command queries a list of users who match the provided mask. The server answers with zero, one or more RPL_WHOREPLY (352), and ends the list with RPL_ENDOFWHO (315).

- The mask can be one of the following:
  - A channel name, in which case the channel members are listed.
  - An exact nickname, in which case a single user is returned.
  - A mask pattern, in which case all visible users whose nickname matches are listed. Servers MAY match other user-specific values (hostname, server, real name, username). Servers MAY not support mask patterns and return an empty list.
- Visible users are users who either aren't invisible (user mode `+i`) or have a common channel with the requesting client.
- Servers MAY filter or limit visible user replies arbitrarily.

Numeric Replies:

- RPL_WHOREPLY (352)
- RPL_ENDOFWHO (315)

See also:

- IRCv3 multi-prefix Extension
- WHOX

#### Examples

Command Examples:

```
WHO emersion        ; request information on user "emersion"
WHO #ircv3          ; list users in the "#ircv3" channel
```

Reply Examples:

```
:calcium.libera.chat 352 dan #ircv3 ~emersion sourcehut/staff/emersion calcium.libera.chat emersion H :1 Simon Ser
  :calcium.libera.chat 315 dan emersion :End of WHO list
                                  ; Reply to WHO emersion

  :calcium.libera.chat 352 dan #ircv3 ~emersion sourcehut/staff/emersion calcium.libera.chat emersion H :1 Simon Ser
  :calcium.libera.chat 352 dan #ircv3 ~val limnoria/val calcium.libera.chat val H :1 Val
  :calcium.libera.chat 315 dan #ircv3 :End of WHO list
                                  ; Reply to WHO #ircv3
```

### WHOIS message

```
Command: WHOIS
  Parameters: [<target>] <nick>
```

This command queries information about a particular user. The server SHOULD answer with numeric messages with information about the nick.

- The server SHOULD end its response (to a syntactically well-formed client message) with RPL_ENDOFWHOIS (318), even if it did not send any other numeric. This allows clients to stop waiting for new numerics. In exceptional error conditions, servers MAY not reply. Clients SHOULD implement a hard timeout.
- Clients MUST NOT assume all numeric messages are sent at once, as the server can interleave other messages before the end of the WHOIS response.
- If `<target>` is specified, it SHOULD be a server name or the nick of a user. Servers SHOULD send the query to a specific server with that name, or to the server `<target>` is connected to, respectively.
- Typically, clients use this to find how long a user has been idle (only the server the user is directly connected to knows that, while other info is globally known).

The following numerics MAY be returned as part of the whois reply:

- ERR_NOSUCHNICK (401)
- ERR_NOSUCHSERVER (402)
- ERR_NONICKNAMEGIVEN (431)
- RPL_WHOISCERTFP (276)
- RPL_WHOISREGNICK (307)
- RPL_WHOISUSER (311)
- RPL_WHOISSERVER (312)
- RPL_WHOISOPERATOR (313)
- RPL_WHOISIDLE (317)
- RPL_WHOISCHANNELS (319)
- RPL_WHOISSPECIAL (320)
- RPL_WHOISACCOUNT (330)
- RPL_WHOISACTUALLY (338)
- RPL_WHOISHOST (378)
- RPL_WHOISMODES (379)
- RPL_WHOISSECURE (671)
- RPL_AWAY (301)

- Servers typically send some of these numerics only to the client itself and to server operators, as they contain privacy-sensitive information.
- Server implementers wishing to send information not covered by these numerics may send other vendor-specific numerics, such that:
  - the first and second parameters MUST be the client's nick, and the target nick
  - the last parameter SHOULD be designed to be human-readable, so user interfaces can display unknown numerics
- Server implementers should consider submitting these to IRCv3 for standardization, if relevant.

### WHOWAS message

```
Command: WHOWAS
  Parameters: <nick> [<count>]
```

WHOWAS queries information about a nickname which no longer exists, due to a nickname change or the user leaving IRC.

- The server searches through its nickname history for nicks which are lexically the same (no wildcard matching). The history is searched backward, returning the most recent entry first.
- If there are multiple entries, up to `<count>` replies will be returned (or all if no `<count>` is given). If given, `<count>` SHOULD be a positive number; otherwise, a full search is done.
- Servers MUST reply with either ERR_WASNOSUCHNICK (406) or a non-empty list of WHOWAS entries, both followed with RPL_ENDOFWHOWAS (369).
- A WHOWAS entry is a series of numeric messages starting with RPL_WHOWASUSER (314), optionally followed by other numerics relevant to that user, such as RPL_WHOISACTUALLY (338) and RPL_WHOISSERVER (312).
- Clients MUST NOT assume any particular numeric other than RPL_WHOWASUSER (314) is present in a WHOWAS entry.
- If `<nick>` is missing, the server SHOULD send a single reply using either ERR_NONICKNAMEGIVEN (431) or ERR_NEEDMOREPARAMS (461).

#### Examples

Command Examples:

```
WHOWAS someone
WHOWAS someone 2
```

Reply Examples:

```
:inspircd.server.example 314 val someone ident3 127.0.0.1 * :Realname
  :inspircd.server.example 312 val someone My.Little.Server :Sun Mar 20 2022 10:59:26
  :inspircd.server.example 314 val someone ident2 127.0.0.1 * :Realname
  :inspircd.server.example 312 val someone My.Little.Server :Sun Mar 20 2022 10:59:16
  :inspircd.server.example 369 val someone :End of WHOWAS

  :ergo.server.example 314 val someone ~ident3 127.0.0.1 * Realname
  :ergo.server.example 314 val someone ~ident2 127.0.0.1 * Realname
  :ergo.server.example 369 val someone :End of WHOWAS

  :solanum.server.example 314 val someone ~ident3 localhost * :Realname
  :solanum.server.example 338 val someone 127.0.0.1 :actually using host
  :solanum.server.example 312 val someone solanum.server.example :Sun Mar 20 10:07:44 2022
  :solanum.server.example 314 val someone ~ident2 localhost * :Realname
  :solanum.server.example 338 val someone 127.0.0.1 :actually using host
  :solanum.server.example 312 val someone solanum.server.example :Sun Mar 20 10:07:34 2022
  :solanum.server.example 369 val someone :End of WHOWAS

  :server.example 406 val someone :There was no such nickname
  :server.example 369 val someone :End of WHOWAS
```

### NAMES message

```
Command: NAMES
  Parameters: <channel>{,<channel>}
```

The `NAMES` command views the nicknames joined to a channel and their channel membership prefixes. The parameter is a list of channel names delimited by comma `(",", 0x2C)`.

- Channels are evaluated one-by-one. For each channel that exists and the client can see users in, the server returns one or more RPL_NAMREPLY (353) numerics and a single RPL_ENDOFNAMES (366) numeric.
- If the channel name is invalid or does not exist, one RPL_ENDOFNAMES numeric containing the given channel name is returned.
- If the channel has the secret channel mode set and the user is not joined, one RPL_ENDOFNAMES numeric is returned.
- Users with the invisible user mode set are not shown unless the requesting client is also joined to that channel.
- Servers MAY allow more than one target channel. They can advertise the maximum via the TARGMAX RPL_ISUPPORT parameter.

Numeric Replies:

- RPL_NAMREPLY (353)
- RPL_ENDOFNAMES (366)

Command Examples:

```
NAMES #twilight_zone,#42        ; List all visible users on
                                "#twilight_zone" and "#42".

NAMES                           ; Attempt to list all visible users on
                                the network, which SHOULD be responded to
                                as specified above.
```

See also:

- IRCv3 multi-prefix Extension
- IRCv3 userhost-in-names Extension
