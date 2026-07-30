# IRC Networks

This section describes concepts behind the implementation and organisation of the IRC protocol.

## Architectural

An IRC network consists of servers linked together, with clients connected to those servers, along with IRC operators and channels.

### Servers

Servers form the backbone of IRC, providing connection points for clients and linking to other servers to form an IRC network.

- Servers SHOULD pick a name containing a dot character `(".", 0x2E)` to help clients disambiguate between server names and nicknames in a message source.

### Clients

A client is anything connecting to a server that is not another server. Each client is distinguished by a unique nickname. Servers must also know the real host address, username, and the server the client is connected to.

Nickname restrictions:

- MUST NOT contain: space `(' ', 0x20)`, comma `(',', 0x2C)`, asterisk `('*', 0x2A)`, question mark `('?', 0x3F)`, exclamation mark `('!', 0x21)`, at sign `('@', 0x40)`.
- MUST NOT start with: dollar `('$', 0x24)`, colon `(':', 0x3A)`.
- MUST NOT start with a channel type prefix, channel membership prefix, or IRCv3 `multi-prefix` prefix.
- SHOULD NOT contain a dot `('.', 0x2E)`.

Servers MAY have additional nickname restrictions and SHOULD avoid nicknames ambiguous with commands or parameters.

#### Operators

Operators are a special class of clients allowed to perform general maintenance on the network, such as disconnecting and reconnecting servers, or removing users from the network. Specific powers vary by server software and operator privileges.

### Channels

A channel is a named group of one or more clients who all receive messages addressed to that channel. A channel is created when the first client joins and ceases to exist when the last client leaves. Networks supporting channel ownership may persist channels while empty.

Channel name restrictions:

- Must begin with a valid channel type prefix character.
- MUST NOT contain: space `(' ', 0x20)`, control G / BELL `('^G', 0x07)`, comma `(',', 0x2C)`.

Channel types:

- **Regular channels** (prefix `'#', 0x23`): known to all servers on the network.
- **Local channels** (prefix `'&', 0x26`): only visible to clients on the same server.
- Other types are described in the Channel Types section.

Channels have modes that alter their characteristics and behaviour (see Channel Modes section). To create or join a channel, use the `JOIN` command. If the channel doesn't exist, it is created and the joining user becomes a channel operator. If it exists, joining depends on the channel's current modes (e.g. `+i` for invite-only).

Channels have a topic — a line shown to users on join and when changed. A user may join multiple channels, limited by the `CHANLIMIT` RPL_ISUPPORT parameter.

If the network splits, channels on each side contain only clients connected to servers on that side. When the split heals, servers reconcile state.

#### Channel Operators

Channel operators ("chanops") run and moderate their channel. Most IRC operators do not intervene in channel management.

Servers may define additional moderation levels:

- **Halfop** (prefix `'%'`)
- **Protected user**
- **Founder**

Channel moderator commands:

- `KICK`: Eject a client from the channel
- `MODE`: Change the channel's modes
- `INVITE`: Invite a client to an invite-only channel (`+i`)
- `TOPIC`: Change the channel topic in a `+t` channel

Moderators are identified by a prefix next to their nickname (e.g. `'@'` for chanops, `'%'` for halfops) in replies to `NAMES`, `WHO`, and `WHOIS`. Specific prefixes are covered in the Channel Membership Prefixes section.
