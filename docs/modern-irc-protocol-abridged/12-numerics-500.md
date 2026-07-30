### ERR_UMODEUNKNOWNFLAG (501)

```
"<client> :Unknown MODE flag"
```

Indicates a MODE command affecting a user contained an unrecognized MODE letter. The text used in the last param of this message may vary.

### ERR_USERSDONTMATCH (502)

```
"<client> :Cant change mode for other users"
```

Indicates a MODE command affecting a user failed because they were trying to set or view modes for other users. The text used in the last param of this message varies (e.g. when viewing modes for another user, a server may send: `"Can't view modes for other users"`).

### ERR_HELPNOTFOUND (524)

```
"<client> <subject> :No help available on this topic"
```

Indicates a HELP command requested help on a subject the server does not know about.

- `<subject>` MUST be the one requested by the client, but may be casefolded; unless it would be an invalid parameter, in which case it MUST be `*`.

### ERR_INVALIDKEY (525)

```
"<client> <target chan> :Key is not well-formed"
```

Indicates the value of a key channel mode change (`+k`) was rejected.

- Not to be confused with ERR_BADCHANNELKEY (475), which is returned when someone tries to join a channel.
