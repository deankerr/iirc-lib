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
