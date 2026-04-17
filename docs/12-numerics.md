# Numerics

The first parameter of most numerics is the target nickname of the client receiving it. Parameters are listed underneath each numeric's name and code.

- Clients MUST NOT fail because a numeric has more parameters than listed here. Servers often extend numerics with their own additions.
- Optional parameters are surrounded with `([<optional>])` — clients MUST NOT assume they will always be received, and servers SHOULD send them unless otherwise specified.
- Repeating parameters are surrounded with `({ <repeating>})` and may repeat zero or more times.
- Server authors extending a numeric SHOULD make their extension into a client capability. Consider submitting useful extensions to the IRCv3 Working Group for standardisation.
- Some numerics have "human-readable" informational strings as the last parameter. These are not designed to be parsed and servers commonly change them. Clients SHOULD NOT rely on these strings matching the format described here. Numerics where this applies are noted with: _"The text used in the last param of this message varies wildly"_.

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

### RPL_STATSCOMMANDS (212)

```
"<client> <command> <count> [<byte count> <remote count>]"
```

Reply to the STATS command when requesting statistics on command usage.

- `<byte count>` and `<remote count>` are optional and MAY be included.

### RPL_ENDOFSTATS (219)

```
"<client> <stats letter> :End of /STATS report"
```

Indicates the end of a STATS response.

### RPL_UMODEIS (221)

```
"<client> <user modes>"
```

Informs the client of their currently-set user modes.

### RPL_STATSUPTIME (242)

```
"<client> :Server Up <days> days <hours>:<minutes>:<seconds>"
```

Reply to the STATS command when requesting server uptime. The text used in the last param of this message may vary.

### RPL_LUSERCLIENT (251)

```
"<client> :There are <u> users and <i> invisible on <s> servers"
```

Reply to the LUSERS command. `<u>`, `<i>`, and `<s>` are non-negative integers representing total users, invisible users, and other servers connected to this server.

### RPL_LUSEROP (252)

```
"<client> <ops> :operator(s) online"
```

Reply to the LUSERS command. `<ops>` is a positive integer representing the number of IRC operators connected. The text used in the last param of this message may vary.

### RPL_LUSERUNKNOWN (253)

```
"<client> <connections> :unknown connection(s)"
```

Reply to the LUSERS command. `<connections>` is a positive integer representing the number of connections in an unknown state. The text used in the last param of this message may vary.

### RPL_LUSERCHANNELS (254)

```
"<client> <channels> :channels formed"
```

Reply to the LUSERS command. `<channels>` is a positive integer representing the number of existing channels. The text used in the last param of this message may vary.

### RPL_LUSERME (255)

```
"<client> :I have <c> clients and <s> servers"
```

Reply to the LUSERS command. `<c>` and `<s>` are non-negative integers representing clients and other servers connected to this server.

### RPL_ADMINME (256)

```
"<client> [<server>] :Administrative info"
```

Reply to the ADMIN command, establishes the name of the server whose administrative info is being provided. The text used in the last param of this message may vary.

- `<server>` is optional and MAY be included; the server can also be gained from the `<source>` of this message.

### RPL_ADMINLOC1 (257)

```
"<client> :<info>"
```

Reply to the ADMIN command, `<info>` provides location information about the server (city, state, country). The text used in the last param of this message varies wildly.

### RPL_ADMINLOC2 (258)

```
"<client> :<info>"
```

Reply to the ADMIN command, `<info>` provides information about whoever runs the server (institution hosting it). The text used in the last param of this message varies wildly.

### RPL_ADMINEMAIL (259)

```
"<client> :<info>"
```

Reply to the ADMIN command, `<info>` MUST contain the email address to contact the server administrator(s). The text used in the last param of this message varies wildly.

### RPL_TRYAGAIN (263)

```
"<client> <command> :Please wait a while and try again."
```

Sent when a server drops a command without processing it. The text used in the last param of this message varies wildly, and commonly provides more information about why the command could not be processed (e.g. rate-limiting).

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

### RPL_WHOISCERTFP (276)

```
"<client> <nick> :has client certificate fingerprint <fingerprint>"
```

Reply to the WHOIS command, shows the SSL/TLS certificate fingerprint used by `<nick>`.

- Clients MUST only be sent this numeric if they are using WHOIS on themselves or they are an operator.

### RPL_NONE (300)

```
Undefined format
```

RPL_NONE is a dummy numeric with no defined use or format.

### RPL_AWAY (301)

```
"<client> <nick> :<message>"
```

Indicates that `<nick>` is currently away and sends their away message.

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

### RPL_UNAWAY (305)

```
"<client> :You are no longer marked as being away"
```

Reply to the AWAY command, indicates the client is no longer set as away. The text used in the last param of this message may vary.

### RPL_NOWAWAY (306)

```
"<client> :You have been marked as being away"
```

Reply to the AWAY command, indicates the client is now set as away. The text used in the last param of this message may vary.

### RPL_WHOISREGNICK (307)

```
"<client> <nick> :has identified for this nick"
```

Reply to the WHOIS command, indicates `<nick>` was authenticated as the owner of that nick on the network.

- See also RPL_WHOISACCOUNT (330) for information on the account name of the user.

### RPL_WHOISUSER (311)

```
"<client> <nick> <username> <host> * :<realname>"
```

Reply to the WHOIS command, shows details about `<nick>`.

- `<username>` and `<realname>` are set by the USER command (though `<username>` may be set by the server in other ways).
- `<host>` is the host used in nickmasks (may or may not be a real hostname or IP address).
- `<host>` CANNOT start with a colon `(':', 0x3A)` as this would be parsed as a trailing parameter — IPv6 addresses like `"::1"` are prefixed with a zero `('0', 0x30)` to ensure this.
- The second-last parameter is a literal asterisk `('*', 0x2A)` and does not mean anything.

### RPL_WHOISSERVER (312)

```
"<client> <nick> <server> :<server info>"
```

Reply to the WHOIS or WHOWAS command, shows which server `<nick>` is (or was) connected to.

- `<server>` is the server name as used in message prefixes.
- `<server info>` is a description of that server.

### RPL_WHOISOPERATOR (313)

```
"<client> <nick> :is an IRC operator"
```

Reply to the WHOIS command, indicates `<nick>` is an operator. The text used in the last param of this message varies wildly, and SHOULD be displayed as-is.

- MAY also indicate what type or level of operator the client is by changing the last parameter text.

### RPL_WHOWASUSER (314)

```
"<client> <nick> <username> <host> * :<realname>"
```

Reply to the WHOWAS command, shows details about one of the last clients that used `<nick>`. The purpose of each argument is the same as RPL_WHOISUSER (311).

### RPL_ENDOFWHO (315)

```
"<client> <mask> :End of WHO list"
```

Reply to the WHO command, indicates the end of a WHO response for `<mask>`.

- `<mask>` MUST be the same `<mask>` parameter sent by the client, but MAY be casefolded.
- Sent after all other WHO response numerics.

### RPL_WHOISIDLE (317)

```
"<client> <nick> <secs> <signon> :seconds idle, signon time"
```

Reply to the WHOIS command, indicates how long `<nick>` has been idle. The text used in the last param of this message may vary.

- `<secs>` is the number of seconds since the client was active. Servers generally denote specific commands (e.g. JOIN, PRIVMSG, NOTICE) as updating idle time.
- `<signon>` is a unix timestamp representing when the user joined the network.

### RPL_ENDOFWHOIS (318)

```
"<client> <nick> :End of /WHOIS list"
```

Reply to the WHOIS command, indicates the end of a WHOIS response for `<nick>`.

- `<nick>` MUST be exactly the `<nick>` parameter sent by the client — case MUST be preserved.
- If the client sent multiple nicks, this MUST be the comma-separated list of nicks, even if some were dropped.
- Sent after all other WHOIS response numerics.

### RPL_WHOISCHANNELS (319)

```
"<client> <nick> :[prefix]<channel>{ [prefix]<channel>}
```

Reply to the WHOIS command, lists the channels `<nick>` is joined to and their status. The last parameter is a list of `[prefix]<channel>` pairs delimited by SPACE `(' ', 0x20)`.

- `<prefix>` is the highest channel membership prefix the client has in that channel, if any.
- Clients MUST ignore the trailing SPACE character, if any.
- RPL_WHOISCHANNELS can be sent multiple times in the same whois reply if the target is on too many channels to fit in a single message.
- The channels in this response are affected by the secret channel mode and the invisible user mode, and may be affected by other modes depending on server software and configuration.

### RPL_WHOISSPECIAL (320)

```
"<client> <nick> :blah blah blah"
```

Reply to the WHOIS command, used for extra human-readable information about `<nick>`. Should only be used for non-essential information that does not need to be machine-readable.

### RPL_LISTSTART (321)

```
"<client> Channel :Users  Name"
```

Reply to the LIST command, marks the start of a channel list. This numeric MAY be skipped by the server so clients MUST NOT depend on receiving it.

### RPL_LIST (322)

```
"<client> <channel> <client count> :<topic>"
```

Reply to the LIST command, sends information about a channel.

- `<channel>` is the channel name.
- `<client count>` is an integer indicating how many clients are joined.
- `<topic>` is the channel's topic as set by the TOPIC command.

### RPL_LISTEND (323)

```
"<client> :End of /LIST"
```

Reply to the LIST command, indicates the end of a LIST response.

### RPL_CHANNELMODEIS (324)

```
"<client> <channel> <modestring> <mode arguments>..."
```

Informs the client of the currently-set modes of a channel.

- `<channel>` is the channel name.
- `<modestring>` and `<mode arguments>` are a mode string and mode arguments (delimited as separate parameters) as defined in the MODE message description.

### RPL_CREATIONTIME (329)

```
"<client> <channel> <creationtime>"
```

Informs the client of the creation time of a channel.

- `<channel>` is the channel name.
- `<creationtime>` is a unix timestamp representing when the channel was created on the network.

### RPL_WHOISACCOUNT (330)

```
"<client> <nick> <account> :is logged in as"
```

Reply to the WHOIS command, indicates `<nick>` was authenticated as the owner of `<account>`.

- This does not necessarily mean the user owns their current nickname, which is covered by RPL_WHOISREGNICK (307).

### RPL_NOTOPIC (331)

```
"<client> <channel> :No topic is set"
```

Reply to the TOPIC command, indicates `<channel>` does not have any topic set.

### RPL_TOPIC (332)

```
"<client> <channel> :<topic>"
```

Sent to a client when joining `<channel>` to inform them of the current topic.

### RPL_TOPICWHOTIME (333)

```
"<client> <channel> <nick> <setat>"
```

Informs the client who set the topic (`<nick>`) and when (`<setat>` is a unix timestamp). Sent after RPL_TOPIC (332).

### RPL_INVITELIST (336)

```
"<client> <channel>"
```

Reply to the INVITE command when used with no parameter, indicates a channel the client was invited to.

- Should not be confused with RPL_INVEXLIST (346), which is used as a reply to MODE.
- Some rare implementations use 346 instead of 336 for this reply.

### RPL_ENDOFINVITELIST (337)

```
"<client> :End of /INVITE list"
```

Reply to the INVITE command when used with no parameter, indicates the end of invitations a client received.

- Should not be confused with RPL_ENDOFINVEXLIST (347), which is used as a reply to MODE.
- Some rare implementations use 347 instead of 337 for this reply.

### RPL_WHOISACTUALLY (338)

```
"<client> <nick> :is actually ..."
  "<client> <nick> <host|ip> :Is actually using host"
  "<client> <nick> <username>@<hostname> <ip> :Is actually using host"
```

Reply to the WHOIS and WHOWAS commands, shows details about the real origin of `<nick>`.

- `<username>` is set by the USER command (though may be set by the server in other ways).
- `<host>` and `<ip>` represent the real host and IP address the client is connecting from.
- `<host>` CANNOT start with a colon `(':', 0x3A)` as this would be parsed as a trailing parameter — IPv6 addresses like `"::1"` are prefixed with a zero `('0', 0x30)` to ensure this. The resulting IPv6 is equivalent, as this is a partial expansion of the `::` shorthand.

See also: RPL_WHOISHOST (378), for similar semantics on other servers.

### RPL_INVITING (341)

```
"<client> <nick> <channel>"
```

Reply to the INVITE command, indicates the attempt was successful and `<nick>` has been invited to `<channel>`.

### RPL_INVEXLIST (346)

```
"<client> <channel> <mask>"
```

Reply to the MODE command when viewing the current entries on a channel's invite-exception list. `<mask>` is the given mask on the invite-exception list.

- Should not be confused with RPL_INVITELIST (336), which is used as a reply to INVITE.
- Sometimes erroneously called `RPL_INVITELIST`, as this was the name used in RFC2812.

### RPL_ENDOFINVEXLIST (347)

```
"<client> <channel> :End of Channel Invite Exception List"
```

Reply to the MODE command, indicates the end of a channel's invite-exception list.

- Should not be confused with RPL_ENDOFINVITELIST (337), which is used as a reply to INVITE.
- Sometimes erroneously called `RPL_ENDOFINVITELIST`, as this was the name used in RFC2812.

### RPL_EXCEPTLIST (348)

```
"<client> <channel> <mask>"
```

Reply to the MODE command when viewing the current entries on a channel's exception list. `<mask>` is the given mask on the exception list.

### RPL_ENDOFEXCEPTLIST (349)

```
"<client> <channel> :End of channel exception list"
```

Reply to the MODE command, indicates the end of a channel's exception list.

### RPL_VERSION (351)

```
"<client> <version> <server> :<comments>"
```

Reply to the VERSION command, indicates information about the desired server.

- `<version>` is the name and version of the software (including revision information).
- `<server>` is the name of the server.
- `<comments>` may contain further comments or details about the specific version.

### RPL_WHOREPLY (352)

```
"<client> <channel> <username> <host> <server> <nick> <flags> :<hopcount> <realname>"
```

Reply to the WHO command, gives information about `<nick>`. See RPL_WHOISUSER (311) for the meaning of `<username>`, `<host>`, and `<realname>`.

- `<server>` is the name of the server the client is connected to.
- If WHO was given a channel as the `<mask>` parameter, the same channel MUST be returned in `<channel>`. Otherwise `<channel>` is an arbitrary channel the client is joined to or a literal asterisk `('*', 0x2A)` if no channel is returned.
- `<hopcount>` is the number of intermediate servers between the client and `<nick>`, but may be unreliable so clients SHOULD ignore it.

`<flags>` contains the following characters, in this order:

- Away status: `H` `('H', 0x48)` for here, or `G` `('G', 0x47)` for gone.
- Optionally, a literal asterisk `('*', 0x2A)` to indicate the user is a server operator.
- Optionally, the highest channel membership prefix the client has in `<channel>`, if any.
- Optionally, one or more user mode characters and other arbitrary server-specific flags.

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

### RPL_LINKS (364)

```
"<client> <server1> <server2> :<hopcount> <server info>"
```

Reply to the LINKS command, specifies that `<server1>` and `<server2>` are linked together.

- For spanning tree topologies, `<server2>` is the closest to the client.
- `<server info>` is a string containing a description of that server.

### RPL_ENDOFLINKS (365)

```
"<client> * :End of /LINKS list"
```

Reply to the LINKS command, indicates the end of the list of linked servers.

### RPL_ENDOFNAMES (366)

```
"<client> <channel> :End of /NAMES list"
```

Reply to the NAMES command, indicates the end of a list of channel member names.

### RPL_BANLIST (367)

```
"<client> <channel> <mask> [<who> <set-ts>]"
```

Reply to the MODE command when viewing the current entries on a channel's ban list. `<mask>` is the given mask on the ban list.

- `<who>` and `<set-ts>` are optional and MAY be included. `<who>` is either the nickname or nickmask of the client that set the ban, or a server name. `<set-ts>` is the UNIX timestamp of when the ban was set.

### RPL_ENDOFBANLIST (368)

```
"<client> <channel> :End of channel ban list"
```

Reply to the MODE command, indicates the end of a channel's ban list.

### RPL_ENDOFWHOWAS (369)

```
"<client> <nick> :End of WHOWAS"
```

Reply to the WHOWAS command, indicates the end of a WHOWAS response for `<nick>`. Sent after all other WHOWAS response numerics.

### RPL_INFO (371)

```
"<client> :<string>"
```

Reply to the INFO command, returns human-readable information describing the server (version, authors, contributors, miscellaneous relevant information).

### RPL_MOTD (372)

```
"<client> :<line of the motd>"
```

Each line of the Message of the Day is sent as this numeric. MOTD lines MAY be wrapped to 80 characters by the server.

### RPL_ENDOFINFO (374)

```
"<client> :End of INFO list"
```

Indicates the end of an INFO response.

### RPL_MOTDSTART (375)

```
"<client> :- <server> Message of the day - "
```

Indicates the start of the Message of the Day. The text used in the last param of this message may vary, and SHOULD be displayed as-is.

### RPL_ENDOFMOTD (376)

```
"<client> :End of /MOTD command."
```

Indicates the end of the Message of the Day. The text used in the last param of this message may vary.

### RPL_WHOISHOST (378)

```
"<client> <nick> :is connecting from *@localhost 127.0.0.1"
```

Reply to the WHOIS command, shows details about where `<nick>` is connecting from.

See also: RPL_WHOISACTUALLY (338), for similar semantics on other servers.

### RPL_WHOISMODES (379)

```
"<client> <nick> :is using modes +ailosw"
```

Reply to the WHOIS command, shows the user modes the target user has.

### RPL_YOUREOPER (381)

```
"<client> :You are now an IRC operator"
```

Sent to a client which has successfully issued an OPER command and gained operator status. The text used in the last param of this message varies wildly.

### RPL_REHASHING (382)

```
"<client> <config file> :Rehashing"
```

Sent to an operator which has successfully issued a REHASH command. The text used in the last param of this message may vary.

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

### ERR_NOSUCHNICK (401)

```
"<client> <nickname> :No such nick/channel"
```

Indicates that no client can be found for the supplied nickname. The text used in the last param of this message may vary.

### ERR_NOSUCHSERVER (402)

```
"<client> <server name> :No such server"
```

Indicates that the given server name does not exist. The text used in the last param of this message may vary.

### ERR_NOSUCHCHANNEL (403)

```
"<client> <channel> :No such channel"
```

Indicates that no channel can be found for the supplied channel name. The text used in the last param of this message may vary.

### ERR_CANNOTSENDTOCHAN (404)

```
"<client> <channel> :Cannot send to channel"
```

Indicates that PRIVMSG/NOTICE could not be delivered to `<channel>`. The text used in the last param of this message may vary.

- Generally sent in response to channel modes, such as a moderated channel where the client lacks permission to speak, or not being joined to a channel with the no external messages mode set.

### ERR_TOOMANYCHANNELS (405)

```
"<client> <channel> :You have joined too many channels"
```

Indicates that the JOIN command failed because the client has joined their maximum number of channels. The text used in the last param of this message may vary.

### ERR_WASNOSUCHNICK (406)

```
"<client> <nickname> :There was no such nickname"
```

Reply to WHOWAS to indicate there is no history information for that nickname.

### ERR_NOORIGIN (409)

```
"<client> :No origin specified"
```

Indicates a PING or PONG message missing the originator parameter required by old IRC servers.

- Nowadays, may be used by some servers when the PING `<token>` is empty.

### ERR_NORECIPIENT (411)

```
"<client> :No recipient given (<command>)"
```

Returned by PRIVMSG to indicate the message wasn't delivered because there was no recipient given.

### ERR_NOTEXTTOSEND (412)

```
"<client> :No text to send"
```

Returned by PRIVMSG to indicate the message wasn't delivered because there was no text to send.

### ERR_INPUTTOOLONG (417)

```
"<client> :Input line was too long"
```

Indicates a given line does not follow the specified size limits (512 bytes for the main section, 4094 or 8191 bytes for the tag section).

### ERR_UNKNOWNCOMMAND (421)

```
"<client> <command> :Unknown command"
```

Sent to a registered client to indicate the command they sent isn't known by the server. The text used in the last param of this message may vary.

### ERR_NOMOTD (422)

```
"<client> :MOTD File is missing"
```

Indicates that the Message of the Day file does not exist or could not be found. The text used in the last param of this message may vary.

### ERR_NONICKNAMEGIVEN (431)

```
"<client> :No nickname given"
```

Returned when a nickname parameter is expected for a command but isn't given.

### ERR_ERRONEUSNICKNAME (432)

```
"<client> <nick> :Erroneus nickname"
```

Returned when a NICK command cannot be completed because the desired nickname contains disallowed characters. See the NICK command for more information on allowed characters. The text used in the last param of this message may vary.

### ERR_NICKNAMEINUSE (433)

```
"<client> <nick> :Nickname is already in use"
```

Returned when a NICK command cannot be completed because the desired nickname is already in use. The text used in the last param of this message may vary.

### ERR_NICKCOLLISION (436)

```
"<client> <nick> :Nickname collision KILL from <user>@<host>"
```

Returned by a server to a client when it detects a nickname collision (registration of a NICK that already exists by another server). The text used in the last param of this message may vary.

### ERR_USERNOTINCHANNEL (441)

```
"<client> <nick> <channel> :They aren't on that channel"
```

Returned when a client tries to perform a channel+nick affecting command, when the nick isn't joined to the channel (e.g. `MODE #channel +o nick`).

### ERR_NOTONCHANNEL (442)

```
"<client> <channel> :You're not on that channel"
```

Returned when a client tries to perform a channel-affecting command on a channel they're not a part of.

### ERR_USERONCHANNEL (443)

```
"<client> <nick> <channel> :is already on channel"
```

Returned when a client tries to invite `<nick>` to a channel they're already joined to.

### ERR_NOTREGISTERED (451)

```
"<client> :You have not registered"
```

Returned when a client command cannot be parsed because they are not yet registered. Servers offer only a limited subset of commands until clients are properly registered. The text used in the last param of this message may vary.

### ERR_NEEDMOREPARAMS (461)

```
"<client> <command> :Not enough parameters"
```

Returned when a client command cannot be parsed because not enough parameters were supplied. The text used in the last param of this message may vary.

### ERR_ALREADYREGISTERED (462)

```
"<client> :You may not reregister"
```

Returned when a client tries to change a detail that can only be set during registration (such as resending PASS or USER after registration). The text used in the last param of this message varies.

### ERR_PASSWDMISMATCH (464)

```
"<client> :Password incorrect"
```

Returned to indicate the connection could not be registered as the password was either incorrect or not supplied. The text used in the last param of this message may vary.

### ERR_YOUREBANNEDCREEP (465)

```
"<client> :You are banned from this server."
```

Returned to indicate the server has been configured to explicitly deny connections from this client. The text used in the last param of this message varies wildly and typically contains the reason for the ban and/or ban details, and SHOULD be displayed as-is.

### ERR_CHANNELISFULL (471)

```
"<client> <channel> :Cannot join channel (+l)"
```

Returned to indicate a JOIN command failed because the client limit mode has been set and the maximum number of users are already joined. The text used in the last param of this message may vary.

### ERR_UNKNOWNMODE (472)

```
"<client> <modechar> :is unknown mode char to me"
```

Indicates that a mode character is not recognized by the server. The text used in the last param of this message may vary.

### ERR_INVITEONLYCHAN (473)

```
"<client> <channel> :Cannot join channel (+i)"
```

Returned to indicate a JOIN command failed because the channel is invite-only and the client has not been invited or had an invite exception set. The text used in the last param of this message may vary.

### ERR_BANNEDFROMCHAN (474)

```
"<client> <channel> :Cannot join channel (+b)"
```

Returned to indicate a JOIN command failed because the client has been banned from the channel and has not had a ban exception set. The text used in the last param of this message may vary.

### ERR_BADCHANNELKEY (475)

```
"<client> <channel> :Cannot join channel (+k)"
```

Returned to indicate a JOIN command failed because the channel requires a key and the key was either incorrect or not supplied. The text used in the last param of this message may vary.

- Not to be confused with ERR_INVALIDKEY (525), which may be returned when setting a key.

### ERR_BADCHANMASK (476)

```
"<client> <channel> :Bad Channel Mask"
```

Indicates the supplied channel name is not valid. The text used in the last param of this message may vary.

- This is similar to, but stronger than, ERR_NOSUCHCHANNEL (403), which indicates the channel does not exist but may be a valid name.

### ERR_NOPRIVILEGES (481)

```
"<client> :Permission Denied- You're not an IRC operator"
```

Indicates the command failed because the user is not an IRC operator. The text used in the last param of this message may vary.

### ERR_CHANOPRIVSNEEDED (482)

```
"<client> <channel> :You're not channel operator"
```

Indicates a command failed because the client does not have the appropriate channel privileges. The text used in the last param of this message may vary.

- This numeric can apply for different prefixes such as halfop, operator, etc.

### ERR_CANTKILLSERVER (483)

```
"<client> :You cant kill a server!"
```

Indicates a KILL command failed because the user tried to kill a server. The text used in the last param of this message may vary.

### ERR_NOOPERHOST (491)

```
"<client> :No O-lines for your host"
```

Indicates an OPER command failed because the server has not been configured to allow connections from this client's host to become an operator. The text used in the last param of this message may vary.

### ERR_UMODEUNKNOWNFLAG (501)

```
"<client> :Unknown MODE flag"
```

Indicates a MODE command affecting a user contained an unrecognized MODE letter. The text used in the last param of this message may vary.

### ERR_USERSDONTMATCH (502)

```
"<client> :Cant change mode for other users"
```

Indicates a MODE command affecting a user failed because they were trying to set or view modes for other users. The text used in the last param of this message varies (e.g. when viewing modes for another user, a server may send: `"Can't view modes for other users"`).

### ERR_HELPNOTFOUND (524)

```
"<client> <subject> :No help available on this topic"
```

Indicates a HELP command requested help on a subject the server does not know about.

- `<subject>` MUST be the one requested by the client, but may be casefolded; unless it would be an invalid parameter, in which case it MUST be `*`.

### ERR_INVALIDKEY (525)

```
"<client> <target chan> :Key is not well-formed"
```

Indicates the value of a key channel mode change (`+k`) was rejected.

- Not to be confused with ERR_BADCHANNELKEY (475), which is returned when someone tries to join a channel.

### RPL_STARTTLS (670)

```
"<client> :STARTTLS successful, proceed with TLS handshake"
```

Used by the IRCv3 tls extension, indicates the client may begin a TLS handshake. The text used in the last param of this message varies wildly. For more information, see the IRCv3 tls specification.

### RPL_WHOISSECURE (671)

```
"<client> <nick> :is using a secure connection"
```

Reply to the WHOIS command, indicates `<nick>` is connecting in a way the server considers reasonably safe from eavesdropping (e.g. localhost, TLS, Tor).

### ERR_STARTTLS (691)

```
"<client> :STARTTLS failed (Wrong moon phase)"
```

Used by the IRCv3 tls extension, indicates a server-side error occurred and the STARTTLS command failed. The text used in the last param of this message varies wildly. For more information, see the IRCv3 tls specification.

### ERR_INVALIDMODEPARAM (696)

```
"<client> <target chan/user> <mode char> <parameter> :<description>"
```

Indicates there was a problem with a mode parameter. Replaces various implementation-specific mode-specific numerics.

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

### RPL_LOGGEDIN (900)

```
"<client> <nick>!<user>@<host> <account> :You are now logged in as <username>"
```

Indicates the client was logged into the specified account (whether by SASL authentication or otherwise). The text used in the last param of this message varies wildly. For more information, see the IRCv3 sasl-3.1 extension.

### RPL_LOGGEDOUT (901)

```
"<client> <nick>!<user>@<host> :You are now logged out"
```

Indicates the client was logged out of their account. The text used in the last param of this message varies wildly. For more information, see the IRCv3 sasl-3.1 extension.

### ERR_NICKLOCKED (902)

```
"<client> :You must use a nick assigned to you"
```

Indicates SASL authentication failed because the account is currently locked out, held, or otherwise administratively made unavailable. The text used in the last param of this message varies wildly. For more information, see the IRCv3 sasl-3.1 extension.

### RPL_SASLSUCCESS (903)

```
"<client> :SASL authentication successful"
```

Indicates SASL authentication was completed successfully, normally sent along with RPL_LOGGEDIN (900). The text used in the last param of this message varies wildly. For more information, see the IRCv3 sasl-3.1 extension.

### ERR_SASLFAIL (904)

```
"<client> :SASL authentication failed"
```

Indicates SASL authentication failed because of invalid credentials or other errors not explicitly mentioned by other numerics. The text used in the last param of this message varies wildly. For more information, see the IRCv3 sasl-3.1 extension.

### ERR_SASLTOOLONG (905)

```
"<client> :SASL message too long"
```

Indicates SASL authentication failed because the AUTHENTICATE command sent by the client was too long (parameter longer than 400 bytes). The text used in the last param of this message varies wildly. For more information, see the IRCv3 sasl-3.1 extension.

### ERR_SASLABORTED (906)

```
"<client> :SASL authentication aborted"
```

Indicates SASL authentication failed because the client sent an AUTHENTICATE command with the parameter `('*', 0x2A)`. The text used in the last param of this message varies wildly. For more information, see the IRCv3 sasl-3.1 extension.

### ERR_SASLALREADY (907)

```
"<client> :You have already authenticated using SASL"
```

Indicates SASL authentication failed because the client has already authenticated and reauthentication is not available or has been administratively disabled. The text used in the last param of this message varies wildly. For more information, see the IRCv3 sasl-3.1 and sasl-3.2 extensions.

### RPL_SASLMECHS (908)

```
"<client> <mechanisms> :are available SASL mechanisms"
```

Specifies the mechanisms supported for SASL authentication. `<mechanisms>` is a list of SASL mechanisms delimited by a comma `(',', 0x2C)`. For more information, see the IRCv3 sasl-3.1 extension.

- IRCv3.2 also specifies this information in the `sasl` client capability value. For more information, see the IRCv3 sasl-3.2 extension.

The text used in the last param of this message varies wildly.
