# Modes

Modes affect the behaviour and reflect details about targets — clients and channels. A mode marked as 'standard' is defined in the official IRC specification documents. Only widely-used modes with consistent meanings across server software are listed here; for more extensive lists see the irc-defs user and channel mode lists.

## User Modes

### Invisible User Mode

Standard mode, letter `"+i"`. When set, the user does not appear in WHO or NAMES unless they share a channel with the requesting user. Some servers also hide channels in WHOIS replies for invisible users who don't share a channel with the requester.

### Oper User Mode

Standard mode, letter `"+o"`. Indicates the user is a network operator.

### Local Oper User Mode

Standard mode, letter `"+O"`. Indicates the user is a server operator — they have operator privileges for their server only, not the rest of the network.

### Registered User Mode

Widely-used mode, typically letter `"+r"`. The character and existence of this mode may vary by server software and configuration. Indicates the user has logged into a user account.

- IRCv3 extensions such as `account-notify`, `account-tag`, and `extended-join` provide the account name of logged-in users and are more accurate than detecting this mode.

### WALLOPS User Mode

Standard mode, letter `"+w"`. Indicates the user will receive WALLOPS messages from the server.

## Channel Modes

### Ban Channel Mode

Standard mode, letter `"+b"`. Controls a list of client masks that are banned from joining or speaking in the channel. Each value is a client mask.

- When set, a client's nickmask (`nick!user@host`) is compared against each banned mask on JOIN. If it matches, the client receives `ERR_BANNEDFROMCHAN (474)` and the JOIN fails. See the ban exception mode for exemptions.

### Exception Channel Mode

Widely-used mode, standard letter `"+e"`, but SHOULD be defined in the `EXCEPTS` RPL_ISUPPORT parameter. Controls a list of client masks exempt from the ban mode.

- When set along with the ban mode, a client matching both a ban mask and an exception mask will not be blocked from joining.

### Client Limit Channel Mode

Standard mode, letter `"+l"`. Controls whether new users may join based on the current number of users. Its value is an integer defining the maximum number of clients that may be joined.

- When set and the user count matches or exceeds this limit, new clients receive `ERR_CHANNELISFULL (471)` and the JOIN fails.

### Invite-Only Channel Mode

Standard mode, letter `"+i"`. Controls whether users must be invited before joining.

- When set, a user must have received an INVITE for this channel. Otherwise, they receive `ERR_INVITEONLYCHAN (473)` and the JOIN fails.

### Invite-Exception Channel Mode

Widely-used mode, standard letter `"+I"`, but SHOULD be defined in the `INVEX` RPL_ISUPPORT parameter. Controls a list of client masks exempt from the invite-only mode.

- When set along with invite-only mode, a client matching an exception mask does not need an INVITE to join.

### Key Channel Mode

Standard mode, letter `"+k"`. Sets a key that must be supplied to join the channel. Its value is the required key.

- Servers may validate the key (e.g. to forbid spaces). If invalid, they SHOULD return `ERR_INVALIDMODEPARAM (696)`.
- Clients MUST handle any of: `ERR_INVALIDMODEPARAM (696)`, `ERR_INVALIDKEY (525)`, a `MODE` echoed with a different key (e.g. truncated), or the key change ignored with no `MODE` echo.
- When set, a client must supply the key on JOIN. Without it or with a wrong key, they receive `ERR_BADCHANNELKEY (475)` and the JOIN fails.

### Moderated Channel Mode

Standard mode, letter `"+m"`. Controls whether users may freely talk on the channel. Has no value.

- When set, only users with channel privileges may send messages. The voice prefix allows a user to talk in a moderated channel without other moderation abilities. Users with halfop or operator privileges may also speak.

### Secret Channel Mode

Standard mode, letter `"+s"`. Controls whether the channel is secret. Has no value.

- A secret channel does not appear in LIST or NAMES responses unless the requesting client is joined to it. It also does not appear in `RPL_WHOISCHANNELS (319)` unless the relevant user is joined to it.

### Protected Topic Mode

Standard mode, letter `"+t"`. Controls whether channel privileges are required to set the topic. Has no value.

- When enabled, users must have channel privileges (e.g. halfop or operator) to change the topic. Without this mode, anyone may set the topic.

### No External Messages Mode

Standard mode, letter `"+n"`. Controls whether users not joined to the channel can send messages to it. Has no value.

- When enabled, users MUST be joined to send PRIVMSG or NOTICE to the channel. Otherwise they receive `ERR_CANNOTSENDTOCHAN (404)`.

## Channel Membership Prefixes

Users may receive privileges or status in a channel based on modes given to them. These users are given prefixes before their nickname when associated with a channel (in NAMES, WHO, and WHOIS). Standard and common prefixes are listed here, and MUST be advertised by the server in the `PREFIX` RPL_ISUPPORT parameter.

### Founder Prefix

Widely-used, prefix `"~"`, mode letter `"+q"`. Shows the user is the 'founder' of the channel with full moderation control. Typically used only on networks with client accounts and channel ownership.

### Protected Prefix

Widely-used, prefix `"&"`, mode letter `"+a"`. Users with this mode cannot be kicked and cannot have this mode removed by other protected users. They may perform some operator actions at a higher privilege level. Typically used on networks with client accounts and channel ownership.

### Operator Prefix

Standard, prefix `"@"`, mode letter `"+o"`. Users with this mode may perform channel moderation tasks: kicking users, applying channel modes, and setting other users to operator or lower status.

### Halfop Prefix

Widely-used, prefix `"%"`, mode letter `"+h"`. Users with this mode may perform some channel moderation tasks at a lower privilege level than operators. Which tasks vary by server software and configuration.

### Voice Prefix

Standard, prefix `"+"`, mode letter `"+v"`. Users with this mode may send messages to a moderated channel.
