# Connection Setup

IRC client-server connections work over TCP/IP. The standard ports for client-server connections are TCP/6667 for plaintext, and TCP/6697 for TLS connections.

# Connection Registration

Upon establishing a connection, the client must immediately attempt registration without waiting for any banner message from the server. Until registration is complete, only a limited subset of commands SHOULD be accepted.

Recommended registration order:

1. `CAP LS 302`
2. `PASS`
3. `NICK` and `USER`
4. Capability negotiation
5. `SASL` (if negotiated)
6. `CAP END`

Steps 1-3 should be sent on connection. If the server supports capability negotiation, registration suspends after `CAP LS` and the client negotiates capabilities (steps 4-6), then resumes with `CAP END`. If the server does not support capability negotiation, registration continues immediately.

Detail on each step:

1. `CAP LS 302` suspends registration and starts capability negotiation. `302` indicates the client supports version 302 of client capability negotiation. Registration resumes when the client sends `CAP END`.
2. `PASS` is not required, but if included it MUST precede the latter of `NICK` and `USER`.
3. `NICK` and `USER` set the user's nickname, username, and "real name". Unless registration is suspended by `CAP` negotiation, these commands end registration.
4. The client should request advertised capabilities it wishes to enable.
5. If using SASL authentication, attempt it after a successful `CAP ACK` of the `sasl` capability, while registration is suspended.
6. `CAP END` ends the negotiation period and resumes registration.

Other registration details:

- There may be an arbitrary wait during registration while the server completes lookups (hostname, ident). Servers SHOULD set reasonable timeouts for these.
- Some servers send a `PING` and require a matching `PONG` before continuing. This may happen immediately or at any time during registration, so clients MUST respond to it.

Upon successful registration, the server MUST send the following in order:

1. `RPL_WELCOME` (001)
2. `RPL_YOURHOST` (002)
3. `RPL_CREATED` (003)
4. `RPL_MYINFO` (004)
5. At least one `RPL_ISUPPORT` (005) numeric.
6. The server MAY then send other numerics and messages.
7. The server SHOULD respond as though the client sent `LUSERS` and return the appropriate numerics.
8. The server MUST respond as though the client sent `MOTD` — either the successful MOTD numerics or `ERR_NOMOTD` (422).
9. If the user has client modes set automatically, the server SHOULD send `RPL_UMODEIS` (221) or a `MODE` message with the client as target, preferably the former.

The first parameter of `RPL_WELCOME` (001) is the nickname assigned by the network — it may differ from what the client requested (due to length limits or policy restrictions). The client SHOULD use this to determine its actual nickname. Subsequent nickname changes are communicated by the server sending a `NICK` message.
