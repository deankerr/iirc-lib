export interface ParsedCtcp {
  command: string
  arguments: string
}

// CTCP (Client-To-Client Protocol) messages are carried inside PRIVMSG and
// NOTICE, delimited by ASCII 0x01. If the text is a valid CTCP message,
// this returns the parsed command and arguments. Otherwise returns undefined.
export function parseCtcp(text: string): ParsedCtcp | undefined {
  if (!text.startsWith('\u0001') || !text.endsWith('\u0001')) {
    return undefined
  }

  const content = text.slice(1, -1)
  const spaceIndex = content.indexOf(' ')

  if (spaceIndex === -1) {
    return { arguments: '', command: content }
  }

  return {
    arguments: content.slice(spaceIndex + 1),
    command: content.slice(0, spaceIndex),
  }
}
