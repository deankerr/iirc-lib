const LINE_ENDING_REGEX = /\r?\n$/

export type IrcMessage = {
  tags?: Record<string, string>
  source?: string
  command: string
  params: string[]
}

export function parseMessage(raw: string): IrcMessage {
  // * Strip line endings
  const line = raw.replace(LINE_ENDING_REGEX, '')

  if (line.length === 0 || line.trim().length === 0) {
    throw new Error('Empty message')
  }

  let pos = 0
  let tags: Record<string, string> | undefined
  let source: string | undefined

  // * Parse tags (optional, starts with @)
  if (line[pos] === '@') {
    const spaceIdx = line.indexOf(' ', pos)
    if (spaceIdx === -1) {
      throw new Error('Malformed message: tags without command')
    }
    const tagString = line.slice(1, spaceIdx)
    tags = parseTags(tagString)
    pos = spaceIdx + 1
    while (line[pos] === ' ') pos++
  }

  // * Parse source/prefix (optional, starts with :)
  if (line[pos] === ':') {
    const spaceIdx = line.indexOf(' ', pos)
    if (spaceIdx === -1) {
      throw new Error('Malformed message: source without command')
    }
    source = line.slice(pos + 1, spaceIdx)
    pos = spaceIdx + 1
    while (line[pos] === ' ') pos++
  }

  // * Parse command (required)
  const rest = line.slice(pos)
  const spaceIdx = rest.indexOf(' ')

  let command: string
  let paramsString: string

  if (spaceIdx === -1) {
    command = rest
    paramsString = ''
  } else {
    command = rest.slice(0, spaceIdx)
    paramsString = rest.slice(spaceIdx + 1)
  }

  if (command.length === 0) {
    throw new Error('Malformed message: no command')
  }

  command = command.toUpperCase()

  // * Parse parameters
  const params = parseParams(paramsString)

  const msg: IrcMessage = { command, params }
  if (tags) msg.tags = tags
  if (source) msg.source = source

  return msg
}

function parseTags(tagString: string): Record<string, string> {
  const tags: Record<string, string> = {}

  for (const part of tagString.split(';')) {
    if (part.length === 0) continue

    const eqIdx = part.indexOf('=')
    if (eqIdx === -1) {
      tags[part] = ''
    } else {
      const key = part.slice(0, eqIdx)
      const rawValue = part.slice(eqIdx + 1)
      tags[key] = unescapeTagValue(rawValue)
    }
  }

  return tags
}

// IRCv3 tag escape sequences: \: → ; | \s → space | \\ → \ | \r → CR | \n → LF
function unescapeTagValue(value: string): string {
  let result = ''
  let i = 0

  while (i < value.length) {
    if (value[i] === '\\') {
      if (i + 1 >= value.length) {
        break
      }
      const next = value[i + 1]
      switch (next) {
        case ':':
          result += ';'
          break
        case 's':
          result += ' '
          break
        case '\\':
          result += '\\'
          break
        case 'r':
          result += '\r'
          break
        case 'n':
          result += '\n'
          break
        default:
          result += next
      }
      i += 2
    } else {
      result += value[i]
      i++
    }
  }

  return result
}

function parseParams(paramsString: string): string[] {
  if (paramsString.length === 0) {
    return []
  }

  const params: string[] = []
  let pos = 0

  while (pos < paramsString.length) {
    while (paramsString[pos] === ' ') pos++
    if (pos >= paramsString.length) break

    if (paramsString[pos] === ':') {
      params.push(paramsString.slice(pos + 1))
      break
    }

    const spaceIdx = paramsString.indexOf(' ', pos)
    if (spaceIdx === -1) {
      params.push(paramsString.slice(pos))
      break
    }
    params.push(paramsString.slice(pos, spaceIdx))
    pos = spaceIdx + 1
  }

  return params
}

export function buildLine(command: string, params: (string | undefined)[]): string {
  let line = command
  let lastIdx = -1

  for (const [i, p] of params.entries()) {
    if (p !== undefined) lastIdx = i
  }

  for (const [i, param] of params.entries()) {
    if (param === undefined) continue
    const needsTrailing =
      i === lastIdx && (param.includes(' ') || param.length === 0 || param[0] === ':')

    line += needsTrailing ? ` :${param}` : ` ${param}`
  }

  return line
}

export type Userhost = {
  nick: string
  user?: string
  host?: string
}

export function parseUserhost(source: string): Userhost {
  const bangIdx = source.indexOf('!')
  const atIdx = source.indexOf('@')

  // nick!user@host
  if (bangIdx !== -1 && atIdx !== -1 && bangIdx < atIdx) {
    return {
      nick: source.slice(0, bangIdx),
      user: source.slice(bangIdx + 1, atIdx),
      host: source.slice(atIdx + 1),
    }
  }

  // nick!user (no host)
  if (bangIdx !== -1 && atIdx === -1) {
    return {
      nick: source.slice(0, bangIdx),
      user: source.slice(bangIdx + 1),
    }
  }

  // nick@host (no user)
  if (atIdx !== -1 && bangIdx === -1) {
    return {
      nick: source.slice(0, atIdx),
      host: source.slice(atIdx + 1),
    }
  }

  // nick only
  return { nick: source }
}
