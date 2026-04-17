# User Messages

Messages are client-to-server only unless otherwise specified. For server-to-client messages of this type, the message `<source>` usually indicates the client the message relates to.

- 'command' refers to the message's behaviour when sent from a client to the server. 'Command Examples' are client-to-server, 'Message Examples' are server-to-client.
- If a command is sent with fewer parameters than required, the server replies with ERR_NEEDMOREPARAMS (461) and the command fails.
- In the `"Parameters:"` section, optional parts are noted with square brackets: `"[<param>]"`. Curly braces indicate repeatable parts: `"<key>{,<key>}"` means at least one `<key>`, with additional keys separated by comma `(",", 0x2C)`.

## Channel Operations

This group of messages is concerned with manipulating channels, their properties (channel modes), and their contents (typically clients).

- These commands may be requests to the server. If a request is granted, the server acknowledges it by sending a message containing the same information back to the client.
- Race conditions are inevitable when clients at opposing ends of a network send commands that ultimately clash. Server-to-server protocols should ensure consistent state across the entire network.

### JOIN message

```
Command: JOIN
  Parameters: <channel>{,<channel>} [<key>{,<key>}]
  Alt Params: 0
```

The `JOIN` command indicates that the client wants to join the given channel(s), each channel using the given key for it. Servers MUST process the parameters as lists, with the first `<key>` used for the first `<channel>`, the second `<key>` for the second `<channel>`, etc.

- While joined to a channel, clients receive all relevant information including `JOIN`, `PART`, `KICK`, and `MODE` messages affecting the channel, all `PRIVMSG` and `NOTICE` messages sent to the channel, and `QUIT` messages from other clients joined to the same channel.
- If a client's `JOIN` is successful, the server MUST send, in this order:
  1. A `JOIN` message with the client as `<source>` and the channel as the first parameter.
  2. The channel's topic (with RPL_TOPIC (332) and optionally RPL_TOPICWHOTIME (333)), or no message if the channel has no topic.
  3. A list of users currently joined (with one or more RPL_NAMREPLY (353) numerics followed by a single RPL_ENDOFNAMES (366) numeric). These RPL_NAMREPLY messages MUST include the requesting client that has just joined.
- The key, client limit, ban, ban-exception, invite-only, invite-exception, and other channel modes affect whether a given client may join a channel.
- Servers MAY restrict the number of channels a client may be joined to at one time. This limit SHOULD be defined in the CHANLIMIT RPL_ISUPPORT parameter. If over the limit, the client receives ERR_TOOMANYCHANNELS (405) and the command fails.
- The special argument `("0", 0x30)` instead of usual parameters requests that the client leave all channels. The server processes this as though the client sent a `PART` for each channel they are a member of.
- This message may be sent from a server to a client to notify that someone has joined a channel. In this case, `<source>` is the joining client and `<channel>` is the channel. Servers SHOULD NOT send multiple channels in this message to clients; they SHOULD distribute multi-channel `JOIN` messages as a series of single-channel messages.

Numeric Replies:

- ERR_NEEDMOREPARAMS (461)
- ERR_NOSUCHCHANNEL (403)
- ERR_TOOMANYCHANNELS (405)
- ERR_BADCHANNELKEY (475)
- ERR_BANNEDFROMCHAN (474)
- ERR_CHANNELISFULL (471)
- ERR_INVITEONLYCHAN (473)
- ERR_BADCHANMASK (476)
- RPL_TOPIC (332)
- RPL_TOPICWHOTIME (333)
- RPL_NAMREPLY (353)
- RPL_ENDOFNAMES (366)

Command Examples:

```
JOIN #foobar                    ; join channel #foobar.

JOIN &foo fubar                 ; join channel &foo using key "fubar".

JOIN #foo,&bar fubar            ; join channel #foo using key "fubar"
                                and &bar using no key.

JOIN #foo,#bar fubar,foobar     ; join channel #foo using key "fubar".
                                and channel #bar using key "foobar".

JOIN #foo,#bar                  ; join channels #foo and #bar.
```

Message Examples:

```
:WiZ JOIN #Twilight_zone        ; WiZ is joining the channel
                                #Twilight_zone

:dan-!d@localhost JOIN #test    ; dan- is joining the channel #test
```

See also:

- IRCv3 extended-join Extension

### PART message

```
Command: PART
  Parameters: <channel>{,<channel>} [<reason>]
```

The `PART` command removes the client from the given channel(s). On success, the user receives a `PART` message from the server for each channel removed from. `<reason>` is the reason the client left.

- For each channel: if the channel exists and the client is not joined to it, ERR_NOTONCHANNEL (442) is returned and that channel is ignored. If the channel does not exist, ERR_NOSUCHCHANNEL (403) is returned and that channel is ignored.
- This message may be sent from server to client to notify that someone has been removed from a channel. `<source>` is the removed client, `<channel>` is the channel. Servers SHOULD NOT send multiple channels in this message to clients; they SHOULD distribute multi-channel `PART` messages as a series of single-channel messages. If distributed this way, `<reason>` (if it exists) should be on each message.

Numeric Replies:

- ERR_NEEDMOREPARAMS (461)
- ERR_NOSUCHCHANNEL (403)
- ERR_NOTONCHANNEL (442)

Command Examples:

```
PART #twilight_zone             ; leave channel "#twilight_zone"

PART #oz-ops,&group5            ; leave both channels "&group5" and
                                "#oz-ops".
```

Message Examples:

```
:dan-!d@localhost PART #test    ; dan- is leaving the channel #test
```

### TOPIC message

```
Command: TOPIC
  Parameters: <channel> [<topic>]
```

The `TOPIC` command changes or views the topic of the given channel. If `<topic>` is not given, either `RPL_TOPIC` or `RPL_NOTOPIC` is returned. If `<topic>` is an empty string, the topic is cleared.

- If the client is not joined to the channel and tries to view its topic, the server MAY return ERR_NOTONCHANNEL (442) and the command fails.
- If RPL_TOPIC is returned, RPL_TOPICWHOTIME SHOULD also be sent.
- If the protected topic mode is set, clients MUST have appropriate channel permissions to modify the topic. Without permissions, ERR_CHANOPRIVSNEEDED (482) is returned and the command fails.
- If the topic is changed or cleared, every client in the channel (including the author) receives a `TOPIC` command with the new topic (or empty argument if cleared). If `<topic>` is provided but unchanged, servers MAY notify anyway.
- Clients joining in the future will receive RPL_TOPIC (or lack thereof) accordingly.

Numeric Replies:

- ERR_NEEDMOREPARAMS (461)
- ERR_NOSUCHCHANNEL (403)
- ERR_NOTONCHANNEL (442)
- ERR_CHANOPRIVSNEEDED (482)
- RPL_NOTOPIC (331)
- RPL_TOPIC (332)
- RPL_TOPICWHOTIME (333)

Command Examples:

```
TOPIC #test :New topic          ; Setting the topic on "#test" to
                                "New topic".

TOPIC #test :                   ; Clearing the topic on "#test"

TOPIC #test                     ; Checking the topic for "#test"
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

### INVITE message

```
Command: INVITE
  Parameters: <nickname> <channel>
```

The `INVITE` command invites a user to a channel. `<nickname>` is the person to be invited to `<channel>`.

- The target channel SHOULD exist (at least one user is on it). Otherwise, the server SHOULD reject with ERR_NOSUCHCHANNEL.
- Only members of the channel may invite other users. Otherwise, the server MUST reject with ERR_NOTONCHANNEL.
- Servers MAY reject with ERR_CHANOPRIVSNEEDED. In particular, they SHOULD reject when the channel has invite-only mode set and the user is not a channel operator.
- If the user is already on the target channel, the server MUST reject with ERR_USERONCHANNEL.
- On success, the server MUST send RPL_INVITING (341) to the command issuer, and an `INVITE` message (with the issuer as `<source>`) to the target user. Other channel members SHOULD NOT be notified.

Numeric Replies:

- RPL_INVITING (341)
- ERR_NEEDMOREPARAMS (461)
- ERR_NOSUCHCHANNEL (403)
- ERR_NOTONCHANNEL (442)
- ERR_CHANOPRIVSNEEDED (482)
- ERR_USERONCHANNEL (443)

Command Examples:

```
INVITE Wiz #foo_bar    ; Invite Wiz to #foo_bar
```

Message Examples:

```
:dan-!d@localhost INVITE Wiz #test    ; dan- has invited Wiz
                                        to the channel #test
```

See also:

- IRCv3 invite-notify Extension

#### Invite list

Servers MAY allow `INVITE` with no parameter, and reply with a list of channels the sender is invited to as RPL_INVITELIST (336) numerics, ending with RPL_ENDOFINVITELIST (337).

- Some rare implementations use numerics 346/347 instead of 336/337 as RPL_INVITELIST/RPL_ENDOFINVITELIST. You should check the server you are using implements them as expected.
- 346/347 now generally stands for RPL_INVEXLIST/RPL_ENDOFINVEXLIST, used for invite-exception list.

### KICK message

```
Command: KICK
   Parameters: <channel> <user> *( "," <user> ) [<comment>]
```

The `KICK` command requests the forced removal of a user from a channel, causing `<user>` to be removed from `<channel>` by force.

- This message may be sent from server to client to notify that someone has been removed. `<source>` is the client who sent the kick, `<channel>` is the channel the target was removed from.
- If no comment is given, the server SHOULD use a default message.
- Servers MUST NOT send multiple users in this message to clients; they MUST distribute multi-user `KICK` messages as a series of single-user messages for backward compatibility.
- If a `KICK` is distributed this way, `<comment>` (if it exists) should be on each message.
- Servers MAY limit the number of target users per `KICK` command via the TARGMAX RPL_ISUPPORT parameter, and silently drop targets if the number exceeds the limit.

Numeric Replies:

- ERR_NEEDMOREPARAMS (461)
- ERR_NOSUCHCHANNEL (403)
- ERR_CHANOPRIVSNEEDED (482)
- ERR_USERNOTINCHANNEL (441)
- ERR_NOTONCHANNEL (442)

Deprecated Numeric Reply:

- ERR_BADCHANMASK (476)

Examples:

```
KICK #Finnish Matthew           ; Command to kick Matthew from
                                   #Finnish

   KICK &Melbourne Matthew         ; Command to kick Matthew from
                                   &Melbourne

   KICK #Finnish John :Speaking English
                                   ; Command to kick John from #Finnish
                                   using "Speaking English" as the
                                   reason (comment).

   :WiZ!jto@tolsun.oulu.fi KICK #Finnish John
                                   ; KICK message on channel #Finnish
                                   from WiZ to remove John from channel
```

### MODE message

```
Command: MODE
  Parameters: <target> [<modestring> [<mode arguments>...]]
```

The `MODE` command sets or removes options (or _modes_) from a given target.

#### User mode

If `<target>` is a nickname that does not exist on the network, ERR_NOSUCHNICK (401) is returned. If `<target>` is a different nick than the user who sent the command, ERR_USERSDONTMATCH (502) is returned.

- If `<modestring>` is not given, RPL_UMODEIS (221) is sent back containing the current modes of the target user.
- If `<modestring>` is given, the supplied modes are applied, and a `MODE` message is sent to the user containing the changed modes. If one or more modes are not implemented, the server MUST apply the modes that are implemented, and then send ERR_UMODEUNKNOWNFLAG (501) along with the `MODE` message.

#### Channel mode

If `<target>` is a channel that does not exist on the network, ERR_NOSUCHCHANNEL (403) is returned.

- If `<modestring>` is not given, RPL_CHANNELMODEIS (324) is returned. Servers MAY hide sensitive information such as channel keys. Servers SHOULD also return RPL_CREATIONTIME (329) following RPL_CHANNELMODEIS.
- If `<modestring>` is given, the user MUST have appropriate channel privileges to change the modes. Without privileges, the server MUST NOT process the message, and ERR_CHANOPRIVSNEEDED (482) is returned.
- If the user has permission, the supplied modes are applied based on the type of the mode.
- For type A, B, and C modes, arguments are sequentially obtained from `<mode arguments>`. If a type B or C mode does not have a parameter when being set, the server MUST ignore that mode.
- If a type A mode has been sent without an argument, the contents of the list MUST be sent to the user, unless it contains sensitive information the user is not allowed to access.
- When done processing, a `MODE` command is sent to all members of the channel containing the mode changes. Servers MAY hide sensitive information.

`<modestring>` starts with a plus `('+', 0x2B)` or minus `('-', 0x2D)` character, and is made up of the following characters:

- **`'+'`**: Adds the following mode(s).
- **`'-'`**: Removes the following mode(s).
- **`'a-zA-Z'`**: Mode letters, indicating which modes are to be added/removed.

The ABNF representation for `<modestring>` is:

```
modestring  =  1*( modeset )
  modeset     =  plusminus *( modechar )
  plusminus   =  %x2B / %x2D
                   ; + or -
  modechar    =  ALPHA
```

There are four categories of channel modes:

- **Type A**: Modes that add or remove an address to or from a list. MUST always have a parameter when sent from server to client. A client MAY issue this type without an argument to obtain the current contents of the list. The numerics used depend on the specific mode. Also see the EXTBAN parameter.
- **Type B**: Modes that change a setting on a channel. MUST always have a parameter.
- **Type C**: Modes that change a setting on a channel. MUST have a parameter when being set, and MUST NOT have a parameter when being unset.
- **Type D**: Modes that change a setting on a channel. MUST NOT have a parameter.

Channel mode letters, along with their types, are defined in the CHANMODES parameter. User mode letters are always **Type D** modes.

The meaning of standard channel and user mode letters can be found in the Channel Modes and User Modes sections. The meaning of any mode letters not in this list are defined by the server software and configuration.

Type A modes are lists that can be viewed. The method of viewing these lists is not standardised across modes and different numerics are used for each:

- **Ban List** **`"+b"`**: Ban lists are returned with zero or more RPL_BANLIST (367) numerics, followed by one RPL_ENDOFBANLIST (368) numeric.
- **Exception List** **`"+e"`**: Exception lists are returned with zero or more RPL_EXCEPTLIST (348) numerics, followed by one RPL_ENDOFEXCEPTLIST (349) numeric.
- **Invite-Exception List** **`"+I"`**: Invite-exception lists are returned with zero or more RPL_INVITELIST (336) numerics, followed by one RPL_ENDOFINVITELIST (337) numeric.

After the initial `MODE` command is sent to the server, the client receives the above numerics detailing the entries on the given list. Servers MAY restrict this information to channel operators, or to clients who have permissions to change the given list.

Command Examples:

```
MODE dan +i                     ; Setting the "invisible" user mode on dan.

MODE #foobar +mb *@127.0.0.1    ; Setting the "moderated" channel mode and
                                adding the "*@127.0.0.1" mask to the ban
                                list of the #foobar channel.
```

Message Examples:

```
:dan!~h@localhost MODE #foobar -bl+i *@192.168.0.1
                                ; dan unbanned the "*@192.168.0.1" mask,
                                removed the client limit from, and set the
                                #foobar channel to invite-only.

:irc.example.com MODE #foobar +o bunny
                                ; The irc.example.com server gave channel
                                operator privileges to bunny on #foobar.
```

Requesting modes for a channel:

```
MODE #foobar
```

Getting modes for a channel (and channel creation time):

```
:irc.example.com 324 dan #foobar +nrt
  :irc.example.com 329 dan #foobar 1620807422
```

## Sending Messages

### PRIVMSG message

```
Command: PRIVMSG
  Parameters: <target>{,<target>} <text to be sent>
```

The `PRIVMSG` command sends private messages between users, as well as to channels. `<target>` is the nickname of a client or the name of a channel.

- If `<target>` is a channel name and the client is banned and not covered by a ban exception, the message will not be delivered and the command silently fails. Channels with the moderated mode active may block messages from certain users. Other channel modes may affect delivery or cause modification before delivery.
- If a message cannot be delivered to a channel, the server SHOULD respond with ERR_CANNOTSENDTOCHAN (404).
- If `<target>` is a channel name, it may be prefixed with one or more channel membership prefix characters (`@`, `+`, etc.) and the message will be delivered only to members with the given or higher status. Servers that support this will list the supported prefixes in the STATUSMSG RPL_ISUPPORT parameter. Clients SHOULD NOT attempt this unless the prefix has been advertised.
- If `<target>` is a user and that user is set as away, the server may reply with RPL_AWAY (301) and the command continues.
- The `PRIVMSG` message is sent from server to client to deliver a message. `<source>` is the user or server that sent the message, `<target>` is the target of that `PRIVMSG`.
- When `PRIVMSG` is sent from server to client and `<target>` starts with a dollar character `('$', 0x24)`, the message is a broadcast sent to all clients on one or multiple servers.

Numeric Replies:

- ERR_NOSUCHNICK (401)
- ERR_NOSUCHSERVER (402)
- ERR_CANNOTSENDTOCHAN (404)
- ERR_TOOMANYTARGETS (407)
- ERR_NORECIPIENT (411)
- ERR_NOTEXTTOSEND (412)
- ERR_NOTOPLEVEL (413)
- ERR_WILDTOPLEVEL (414)
- RPL_AWAY (301)

Command Examples:

```
PRIVMSG Angel :yes I'm receiving it !
                                  ; Command to send a message to Angel.

PRIVMSG %#bunny :Hi! I have a problem!
                                  ; Command to send a message to halfops
                                  and chanops on #bunny.

PRIVMSG @%#bunny :Hi! I have a problem!
                                  ; Command to send a message to halfops
                                  and chanops on #bunny. This command is
                                  functionally identical to the above
                                  command.
```

Message Examples:

```
:Angel PRIVMSG Wiz :Hello are you receiving this message ?
                                  ; Message from Angel to Wiz.

:dan!~h@localhost PRIVMSG #coolpeople :Hi everyone!
                                  ; Message from dan to the channel
                                  #coolpeople
```

### NOTICE message

```
Command: NOTICE
  Parameters: <target>{,<target>} <text to be sent>
```

The `NOTICE` command sends notices between users and to channels. `<target>` is interpreted the same way as for the `PRIVMSG` command.

- `NOTICE` is used similarly to `PRIVMSG`, but automatic replies must never be sent in response to a `NOTICE` message. This rule also applies to servers — they must not send any error back to the client on receipt of a `NOTICE`. The intention is to avoid loops between a client automatically sending something in response to something it received.
- The `NOTICE` message may be interpreted differently by various clients. Some clients highlight or interpret any `NOTICE` sent to a channel the same way a `PRIVMSG` with their nickname gets interpreted. Users may be irritated by `NOTICE` rather than `PRIVMSG`, and they are not commonly used by client bots for this reason.

### AWAY message

```
Command: AWAY
  Parameters: [<text>]
```

The `AWAY` command lets clients indicate that their user is away.

- If sent with a nonempty parameter (the 'away message'), the user is set to be away. If sent with no parameters or the empty string, the user is no longer away.
- The server acknowledges the change by returning RPL_NOWAWAY (306) and RPL_UNAWAY (305) numerics.
- If the IRCv3 away-notify capability has been requested by a client, the server MAY also send that client `AWAY` messages to tell them how the away status of other users has changed.
- Servers SHOULD notify clients when a user they're interacting with is away when relevant, including sending these numerics:
  1. RPL_AWAY (301), with the away message, when a `PRIVMSG` command is directed at the away user (not to a channel they are on).
  2. RPL_AWAY (301), with the away message, in replies to `WHOIS` messages.
  3. In RPL_USERHOST (302), as the `+` or `-` character.
  4. In RPL_WHOREPLY (352), as the `H` or `G` character.

Numeric Replies:

- RPL_UNAWAY (305)
- RPL_NOWAWAY (306)
