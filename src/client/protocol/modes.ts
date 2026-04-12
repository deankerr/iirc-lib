// Channel mode category classification from ISUPPORT CHANMODES
export type ChanModes = {
  list: string[] // modes that take a param to add/remove (e.g. ban list)
  param: string[] // modes that always take a param
  paramSet: string[] // modes that take a param only when setting
  noParam: string[] // modes that never take a param
}

export function parseChanModes(chanmodes: string | undefined): ChanModes {
  const result: ChanModes = { list: [], param: [], paramSet: [], noParam: [] }
  if (!chanmodes) return result

  const parts = chanmodes.split(',')
  if (parts[0]) result.list = parts[0].split('')
  if (parts[1]) result.param = parts[1].split('')
  if (parts[2]) result.paramSet = parts[2].split('')
  if (parts[3]) result.noParam = parts[3].split('')
  return result
}

// A single parsed mode change from a MODE command
export type ModeChange = {
  adding: boolean
  mode: string
  param?: string
}

export function parseModeChanges(args: {
  modeString: string
  params: string[]
  chanModes: ChanModes
  prefixModes: Set<string>
}): ModeChange[] {
  const { modeString, params, chanModes, prefixModes } = args
  const changes: ModeChange[] = []
  let adding = true
  let paramIdx = 0

  for (const char of modeString) {
    if (char === '+') {
      adding = true
      continue
    }
    if (char === '-') {
      adding = false
      continue
    }

    // Determine if this mode takes a parameter
    let takesParam = false
    if (prefixModes.has(char)) {
      takesParam = true
    } else if (chanModes.list.includes(char)) {
      takesParam = true
    } else if (chanModes.param.includes(char)) {
      takesParam = true
    } else if (chanModes.paramSet.includes(char) && adding) {
      takesParam = true
    }

    const change: ModeChange = { adding, mode: char }
    if (takesParam && paramIdx < params.length) {
      change.param = params[paramIdx]
      paramIdx++
    }
    changes.push(change)
  }

  return changes
}

// Parse a NAMES reply (353) to extract nicks with their prefix modes
// prefixMap maps prefix chars to mode chars (e.g. '@' -> 'o', '+' -> 'v')
export function parseNamesReply(args: {
  namesStr: string
  prefixMap: Map<string, string>
}): Array<{ nick: string; modes: string[] }> {
  const { namesStr, prefixMap } = args
  const users: Array<{ nick: string; modes: string[] }> = []

  for (const entry of namesStr.split(' ')) {
    if (!entry) continue

    const modes: string[] = []
    let nick = entry

    // Strip prefix chars and collect corresponding modes
    while (nick.length > 0) {
      const first = nick[0]
      if (!(first && prefixMap.has(first))) break
      const mode = prefixMap.get(first)
      if (mode) modes.push(mode)
      nick = nick.slice(1)
    }

    if (nick) {
      users.push({ nick, modes })
    }
  }

  return users
}
