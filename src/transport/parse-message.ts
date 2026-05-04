import type { IrcMessage } from './types'

// Pure inbound processor: clean IRC line -> canonical IrcMessage.
// Caller guarantees the line has no \r\n and is non-empty.
export function parseMessage(line: string): IrcMessage {
  let pos = 0
  let tags: Record<string, string> = {}
  let source: string | undefined

  if (line[pos] === '@') {
    const spaceIndex = line.indexOf(' ', pos)
    if (spaceIndex === -1) {
      throw new Error('Malformed IRC message: tags without command')
    }
    tags = parseTags(line.slice(1, spaceIndex))
    pos = spaceIndex + 1
    while (line[pos] === ' ') {
      pos += 1
    }
  }

  if (line[pos] === ':') {
    const spaceIndex = line.indexOf(' ', pos)
    if (spaceIndex === -1) {
      throw new Error('Malformed IRC message: source without command')
    }
    source = line.slice(pos + 1, spaceIndex)
    pos = spaceIndex + 1
    while (line[pos] === ' ') {
      pos += 1
    }
  }

  const remainder = line.slice(pos)
  const spaceIndex = remainder.indexOf(' ')

  const command = (spaceIndex === -1 ? remainder : remainder.slice(0, spaceIndex)).toUpperCase()
  const paramsSource = spaceIndex === -1 ? '' : remainder.slice(spaceIndex + 1)

  if (command.length === 0) {
    throw new Error('Malformed IRC message: missing command')
  }

  const message: IrcMessage = {
    command,
    params: parseParams(paramsSource),
    tags,
  }

  if (source !== undefined) {
    message.source = source
  }

  return message
}

function parseParams(serialized: string): string[] {
  if (serialized.length === 0) {
    return []
  }

  const params: string[] = []
  let pos = 0

  while (pos < serialized.length) {
    while (serialized[pos] === ' ') {
      pos += 1
    }
    if (pos >= serialized.length) {
      break
    }

    if (serialized[pos] === ':') {
      params.push(serialized.slice(pos + 1))
      break
    }

    const nextSpace = serialized.indexOf(' ', pos)
    if (nextSpace === -1) {
      params.push(serialized.slice(pos))
      break
    }

    params.push(serialized.slice(pos, nextSpace))
    pos = nextSpace + 1
  }

  return params
}

function parseTags(serialized: string): Record<string, string> {
  const tags: Record<string, string> = {}

  for (const part of serialized.split(';')) {
    if (part.length === 0) {
      continue
    }

    const equalsIndex = part.indexOf('=')
    if (equalsIndex === -1) {
      tags[part] = ''
      continue
    }

    const key = part.slice(0, equalsIndex)
    const value = part.slice(equalsIndex + 1)
    tags[key] = unescapeTagValue(value)
  }

  return tags
}

function unescapeTagValue(value: string): string {
  let result = ''
  let index = 0

  while (index < value.length) {
    const char = value[index]

    if (char !== '\\') {
      result += char
      index += 1
      continue
    }

    const next = value[index + 1]
    if (next === undefined) {
      break
    }

    switch (next) {
      case ':': {
        result += ';'
        break
      }
      case 's': {
        result += ' '
        break
      }
      case '\\': {
        result += '\\'
        break
      }
      case 'r': {
        result += '\r'
        break
      }
      case 'n': {
        result += '\n'
        break
      }
      default: {
        result += next
        break
      }
    }

    index += 2
  }

  return result
}
