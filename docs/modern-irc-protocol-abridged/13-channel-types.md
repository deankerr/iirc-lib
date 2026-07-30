# Channel Types

IRC has various channel types, differentiated by the character the channel name starts with. Upon joining, clients are shown which types the server supports via the `CHANTYPES` parameter.

### Regular Channels ( # )

Regular channels use the prefix character `('#', 0x23)`. Clients can join these channels, and the first client to join is made a channel operator.

- On most servers, newly-created channels have `+t` (protected topic) and `+n` (no external messages) modes enabled, but this is server-dependent.
- Regular channels are persisted across the network — clients on different servers joining the same channel can see each other and each other's messages.
- On servers supporting channel ownership, clients may not receive channel operator privileges on joining an otherwise empty channel.

### Local Channels ( & )

Local channels use the prefix character `('&', 0x26)`. The first client to join is made a channel operator, but the channel is not persisted across the network — each server has its own independent set of local channels.

- A client on server A and a client on server B joining `&info` will not see each other. Two clients on the same server joining `&info` will.
- Channel ownership is generally not supported for local channels.
- Local channels are less widely available; some networks disable them because operators across the network cannot see or administrate them.
