# Numerics

The first parameter of most numerics is the target nickname of the client receiving it. Parameters are listed underneath each numeric's name and code.

- Clients MUST NOT fail because a numeric has more parameters than listed here. Servers often extend numerics with their own additions.
- Optional parameters are surrounded with `([<optional>])` — clients MUST NOT assume they will always be received, and servers SHOULD send them unless otherwise specified.
- Repeating parameters are surrounded with `({ <repeating>})` and may repeat zero or more times.
- Server authors extending a numeric SHOULD make their extension into a client capability. Consider submitting useful extensions to the IRCv3 Working Group for standardisation.
- Some numerics have "human-readable" informational strings as the last parameter. These are not designed to be parsed and servers commonly change them. Clients SHOULD NOT rely on these strings matching the format described here. Numerics where this applies are noted with: _"The text used in the last param of this message varies wildly"_.
