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
