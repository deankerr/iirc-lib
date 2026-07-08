export interface ParsedCtcp {
  command: string
  arguments: string
}

// CTCP (Client-To-Client Protocol) messages are carried inside PRIVMSG and
// NOTICE, delimited by ASCII 0x01. If the text is a valid CTCP message,
// this returns the parsed command and arguments. Otherwise returns undefined.
//
// The command case is preserved as sent; CTCP commands are conventionally
// uppercase (ACTION, VERSION), so compare case-insensitively if in doubt.
export function parseCtcp(text: string): ParsedCtcp | undefined {
  // A CTCP message must open with the delimiter. The closing delimiter is
  // optional per the CTCP spec — clients must accept messages without it.
  if (!text.startsWith('\u0001')) {
    return undefined
  }

  const end = text.endsWith('\u0001') ? -1 : text.length
  const content = text.slice(1, end)
  const spaceIndex = content.indexOf(' ')

  if (spaceIndex === -1) {
    return { arguments: '', command: content }
  }

  return {
    arguments: content.slice(spaceIndex + 1),
    command: content.slice(0, spaceIndex),
  }
}
