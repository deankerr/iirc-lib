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
