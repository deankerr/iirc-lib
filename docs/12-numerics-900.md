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
