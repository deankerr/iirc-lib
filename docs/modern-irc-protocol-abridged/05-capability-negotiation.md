# Capability Negotiation

Capability negotiation is a mechanism for negotiating protocol extensions (called **client capabilities**) that ensures servers with backwards-incompatible extensions interoperate with existing clients, and vice versa. Clients and servers that don't implement capability negotiation still interoperate with those that do.

IRC is asynchronous with no guaranteed connection banner, and some servers don't complain about unknown commands during registration, so passive discovery is unreliable. Capability negotiation solves this by allowing active negotiation and extending the registration process.

- If the server supports capability negotiation, registration is suspended until negotiation completes. If not, registration completes immediately and no capabilities are used.
- Negotiation is started with `CAP LS 302` (indicating IRCv3.2 support), performed with `CAP REQ`, `CAP ACK`, and `CAP NAK` commands, and ended with `CAP END`.
- Implementation should follow the IRCv3 Capability Negotiation specification.
