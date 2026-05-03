### RPL_STATSCOMMANDS (212)

```
"<client> <command> <count> [<byte count> <remote count>]"
```

Reply to the STATS command when requesting statistics on command usage.

- `<byte count>` and `<remote count>` are optional and MAY be included.

### RPL_ENDOFSTATS (219)

```
"<client> <stats letter> :End of /STATS report"
```

Indicates the end of a STATS response.

### RPL_UMODEIS (221)

```
"<client> <user modes>"
```

Informs the client of their currently-set user modes.

### RPL_STATSUPTIME (242)

```
"<client> :Server Up <days> days <hours>:<minutes>:<seconds>"
```

Reply to the STATS command when requesting server uptime. The text used in the last param of this message may vary.

### RPL_LUSERCLIENT (251)

```
"<client> :There are <u> users and <i> invisible on <s> servers"
```

Reply to the LUSERS command. `<u>`, `<i>`, and `<s>` are non-negative integers representing total users, invisible users, and other servers connected to this server.

### RPL_LUSEROP (252)

```
"<client> <ops> :operator(s) online"
```

Reply to the LUSERS command. `<ops>` is a positive integer representing the number of IRC operators connected. The text used in the last param of this message may vary.

### RPL_LUSERUNKNOWN (253)

```
"<client> <connections> :unknown connection(s)"
```

Reply to the LUSERS command. `<connections>` is a positive integer representing the number of connections in an unknown state. The text used in the last param of this message may vary.

### RPL_LUSERCHANNELS (254)

```
"<client> <channels> :channels formed"
```

Reply to the LUSERS command. `<channels>` is a positive integer representing the number of existing channels. The text used in the last param of this message may vary.

### RPL_LUSERME (255)

```
"<client> :I have <c> clients and <s> servers"
```

Reply to the LUSERS command. `<c>` and `<s>` are non-negative integers representing clients and other servers connected to this server.

### RPL_ADMINME (256)

```
"<client> [<server>] :Administrative info"
```

Reply to the ADMIN command, establishes the name of the server whose administrative info is being provided. The text used in the last param of this message may vary.

- `<server>` is optional and MAY be included; the server can also be gained from the `<source>` of this message.

### RPL_ADMINLOC1 (257)

```
"<client> :<info>"
```

Reply to the ADMIN command, `<info>` provides location information about the server (city, state, country). The text used in the last param of this message varies wildly.

### RPL_ADMINLOC2 (258)

```
"<client> :<info>"
```

Reply to the ADMIN command, `<info>` provides information about whoever runs the server (institution hosting it). The text used in the last param of this message varies wildly.

### RPL_ADMINEMAIL (259)

```
"<client> :<info>"
```

Reply to the ADMIN command, `<info>` MUST contain the email address to contact the server administrator(s). The text used in the last param of this message varies wildly.

### RPL_TRYAGAIN (263)

```
"<client> <command> :Please wait a while and try again."
```

Sent when a server drops a command without processing it. The text used in the last param of this message varies wildly, and commonly provides more information about why the command could not be processed (e.g. rate-limiting).

### RPL_LOCALUSERS (265)

```
"<client> [<u> <m>] :Current local users <u>, max <m>"
```

Reply to the LUSERS command. `<u>` and `<m>` are non-negative integers representing current clients and maximum clients connected directly to this server at one time.

- The two optional parameters SHOULD be supplied to allow clients to better extract these numbers.

### RPL_GLOBALUSERS (266)

```
"<client> [<u> <m>] :Current global users <u>, max <m>"
```

Reply to the LUSERS command. `<u>` and `<m>` are non-negative integers. `<u>` is the number of clients currently connected globally (directly and through other server links). `<m>` is the maximum number of clients connected at one time globally.

- The two optional parameters SHOULD be supplied to allow clients to better extract these numbers.

### RPL_WHOISCERTFP (276)

```
"<client> <nick> :has client certificate fingerprint <fingerprint>"
```

Reply to the WHOIS command, shows the SSL/TLS certificate fingerprint used by `<nick>`.

- Clients MUST only be sent this numeric if they are using WHOIS on themselves or they are an operator.
