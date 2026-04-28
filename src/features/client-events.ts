import { parseCtcp } from '../ctcp'
import type { IsupportMap, ModeChangeAction, ModeChangeAppliesTo } from '../features/isupport'
import { Numeric } from '../numerics'
import type { ParsedSource, Runtime } from '../runtime'
import type { IrcMessage } from '../transport'

export type ClientModeChangeAction = ModeChangeAction
export type ClientModeChangeAppliesTo = ModeChangeAppliesTo

export type ClientModeChange = {
  action: ClientModeChangeAction
  appliesTo: ClientModeChangeAppliesTo
  mode: string
  argument?: string
}

export type ClientName = {
  modes: string[]
  nick: string
}

// Universal base shape computed for every message before enrichment.
type ClientEventBase = {
  raw: IrcMessage
  from: ParsedSource
  target: string
  command: string
}

type EnricherInput = {
  base: ClientEventBase
  message: IrcMessage
  runtime: Runtime
}

// Map the numeric commands we enrich to their canonical names.
const numericCommandNames: Record<string, string> = {
  [Numeric.RPL_CHANNELMODEIS]: 'RPL_CHANNELMODEIS',
  [Numeric.RPL_CREATIONTIME]: 'RPL_CREATIONTIME',
  [Numeric.RPL_TOPIC]: 'RPL_TOPIC',
  [Numeric.RPL_TOPICWHOTIME]: 'RPL_TOPICWHOTIME',
  [Numeric.RPL_NAMREPLY]: 'RPL_NAMREPLY',
  [Numeric.RPL_ENDOFNAMES]: 'RPL_ENDOFNAMES',
  [Numeric.RPL_BANLIST]: 'RPL_BANLIST',
  [Numeric.RPL_ENDOFBANLIST]: 'RPL_ENDOFBANLIST',
  [Numeric.RPL_EXCEPTLIST]: 'RPL_EXCEPTLIST',
  [Numeric.RPL_ENDOFEXCEPTLIST]: 'RPL_ENDOFEXCEPTLIST',
  [Numeric.RPL_INVEXLIST]: 'RPL_INVEXLIST',
  [Numeric.RPL_ENDOFINVEXLIST]: 'RPL_ENDOFINVEXLIST',
  [Numeric.RPL_NOTOPIC]: 'RPL_NOTOPIC',
}

// Pre-processing: translate numeric commands to their canonical names,
// detect CTCP ACTION inside PRIVMSG, pass everything else through unchanged.
function resolveCommand(message: IrcMessage): string {
  const numericName = numericCommandNames[message.command]
  if (numericName !== undefined) {
    return numericName
  }

  if (message.command === 'PRIVMSG') {
    const [, text = ''] = message.params
    if (parseCtcp(text)?.command === 'ACTION') {
      return 'ACTION'
    }
  }

  return message.command
}

function createBaseEvent(runtime: Runtime, message: IrcMessage, command: string): ClientEventBase {
  return {
    command,
    from: runtime.parseSource(message.source),
    raw: message,
    target: '',
  }
}

// Each enricher takes a single input object. Return type is derived —
// no manual type definitions needed.
const enrichers = {
  JOIN({ base, message }: EnricherInput) {
    const [target = ''] = message.params
    return { ...base, command: 'JOIN' as const, target }
  },

  PART({ base, message }: EnricherInput) {
    const [target = '', text] = message.params
    return { ...base, command: 'PART' as const, target, text }
  },

  NICK({ base, message }: EnricherInput) {
    const [nick = ''] = message.params
    return { ...base, command: 'NICK' as const, nick, target: nick }
  },

  TOPIC({ base, message }: EnricherInput) {
    const [target = '', text = ''] = message.params
    return { ...base, command: 'TOPIC' as const, target, text }
  },

  MODE({ base, message, runtime }: EnricherInput) {
    const [target = '', modes = '', ...args] = message.params
    return {
      ...base,
      changes: parseModeChanges(runtime.isupport, target, modes, args),
      command: 'MODE' as const,
      target,
    }
  },

  INVITE({ base, message }: EnricherInput) {
    const [invitedNick = '', target = ''] = message.params
    return { ...base, command: 'INVITE' as const, invitedNick, target }
  },

  KICK({ base, message }: EnricherInput) {
    const [target = '', kickedNick = '', text] = message.params
    return { ...base, command: 'KICK' as const, kickedNick, target, text }
  },

  PRIVMSG({ base, message }: EnricherInput) {
    const [target = '', text = ''] = message.params
    return { ...base, command: 'PRIVMSG' as const, target, text }
  },

  // ACTION is a synthetic command for CTCP ACTION inside PRIVMSG, detected
  // by resolveCommand during pre-processing.
  ACTION({ base, message }: EnricherInput) {
    const [target = '', text = ''] = message.params
    const ctcp = parseCtcp(text)
    return { ...base, command: 'ACTION' as const, target, text: ctcp?.arguments ?? '' }
  },

  NOTICE({ base, message }: EnricherInput) {
    const [target = '', text = ''] = message.params
    return { ...base, command: 'NOTICE' as const, target, text }
  },

  AWAY({ base, message }: EnricherInput) {
    const [text] = message.params
    return { ...base, command: 'AWAY' as const, text }
  },

  QUIT({ base, message }: EnricherInput) {
    const [text] = message.params
    return { ...base, command: 'QUIT' as const, text }
  },

  RPL_TOPIC({ base, message }: EnricherInput) {
    const [, target = '', text = ''] = message.params
    return { ...base, command: 'RPL_TOPIC' as const, target, text }
  },

  RPL_TOPICWHOTIME({ base, message }: EnricherInput) {
    const [, target = '', nick = '', setAt = ''] = message.params
    return { ...base, command: 'RPL_TOPICWHOTIME' as const, nick, setAt, target }
  },

  RPL_NAMREPLY({ base, message, runtime }: EnricherInput) {
    const target = message.params[2] ?? ''
    const rawNames = message.params[3] ?? ''
    return {
      ...base,
      command: 'RPL_NAMREPLY' as const,
      members: rawNames
        .split(' ')
        .filter((name) => name.length > 0)
        .map((name) => parseName(runtime.isupport, name)),
      target,
    }
  },

  RPL_ENDOFNAMES({ base, message }: EnricherInput) {
    const [, target = '', text] = message.params
    return { ...base, command: 'RPL_ENDOFNAMES' as const, target, text }
  },

  RPL_NOTOPIC({ base, message }: EnricherInput) {
    const [, target = ''] = message.params
    return { ...base, command: 'RPL_NOTOPIC' as const, target }
  },

  // RPL_CHANNELMODEIS (324): "<client> <channel> <modestring> [mode arguments]"
  // Carries the full current mode state of a channel.
  RPL_CHANNELMODEIS({ base, message, runtime }: EnricherInput) {
    const [, target = '', modestring = '', ...modeArgs] = message.params
    return {
      ...base,
      changes: parseModeChanges(runtime.isupport, target, modestring, modeArgs),
      command: 'RPL_CHANNELMODEIS' as const,
      target,
    }
  },

  // RPL_CREATIONTIME (329): "<client> <channel> <creationtime>"
  RPL_CREATIONTIME({ base, message }: EnricherInput) {
    const [, target = '', setAt = ''] = message.params
    return { ...base, command: 'RPL_CREATIONTIME' as const, setAt, target }
  },

  // List-entry numerics for ban, exception, and invite-exception lists.
  // Each carries a mask and optional setter/timestamp, and is terminated by
  // its corresponding end-of-list numeric. The accumulation pattern mirrors
  // RPL_NAMREPLY / RPL_ENDOFNAMES.

  // RPL_BANLIST (367): "<client> <channel> <mask> [<who> <set-ts>]"
  RPL_BANLIST({ base, message }: EnricherInput) {
    const [, target = '', mask = '', setBy, setAt] = message.params
    return { ...base, command: 'RPL_BANLIST' as const, mask, setAt, setBy, target }
  },

  RPL_ENDOFBANLIST({ base, message }: EnricherInput) {
    const [, target = '', text] = message.params
    return { ...base, command: 'RPL_ENDOFBANLIST' as const, target, text }
  },

  // RPL_EXCEPTLIST (348): "<client> <channel> <mask>"
  RPL_EXCEPTLIST({ base, message }: EnricherInput) {
    const [, target = '', mask = '', setBy, setAt] = message.params
    return { ...base, command: 'RPL_EXCEPTLIST' as const, mask, setAt, setBy, target }
  },

  RPL_ENDOFEXCEPTLIST({ base, message }: EnricherInput) {
    const [, target = '', text] = message.params
    return { ...base, command: 'RPL_ENDOFEXCEPTLIST' as const, target, text }
  },

  // RPL_INVEXLIST (346): "<client> <channel> <mask>"
  RPL_INVEXLIST({ base, message }: EnricherInput) {
    const [, target = '', mask = '', setBy, setAt] = message.params
    return { ...base, command: 'RPL_INVEXLIST' as const, mask, setAt, setBy, target }
  },

  RPL_ENDOFINVEXLIST({ base, message }: EnricherInput) {
    const [, target = '', text] = message.params
    return { ...base, command: 'RPL_ENDOFINVEXLIST' as const, target, text }
  },

  // UNHANDLED is a synthetic command for messages that have no dedicated enricher.
  // This is a development and debugging device, not for production logic.
  UNHANDLED({ base }: EnricherInput) {
    return { ...base, command: 'UNHANDLED' as const }
  },
}

export type ClientEvent = ReturnType<(typeof enrichers)[keyof typeof enrichers]>

function isEnricherKey(command: string): command is keyof typeof enrichers {
  return Object.hasOwn(enrichers, command)
}

export function clientEvents(runtime: Runtime): void {
  runtime.on('message', (message) => {
    const command = resolveCommand(message)
    const base = createBaseEvent(runtime, message, command)
    const key = isEnricherKey(command) ? command : 'UNHANDLED'
    const event = enrichers[key]({ base, message, runtime })
    runtime.emit('clientEvent', event)
  })
}

// --- Mode parsing ---

// IRC MODE strings combine a direction (+/-) with one or more mode letters,
// drawing arguments from a trailing list. This function walks the mode string
// character by character, tracking the current direction, classifying each
// mode via ISUPPORT, and consuming arguments where required.
function parseModeChanges(
  isupport: IsupportMap,
  target: string,
  modes: string,
  args: string[],
): ClientModeChange[] {
  const changes: ClientModeChange[] = []
  let action: ModeChangeAction = 'add'
  let argIndex = 0

  for (const mode of modes) {
    if (mode === '+') {
      action = 'add'
      continue
    }

    if (mode === '-') {
      action = 'remove'
      continue
    }

    const appliesTo = isupport.modeAppliesTo(target, mode)

    if (isupport.modeNeedsArgument(mode, action)) {
      changes.push({ action, appliesTo, argument: args[argIndex] ?? '', mode })
      argIndex += 1
      continue
    }

    changes.push({ action, appliesTo, mode })
  }

  return changes
}

// NAMES replies carry prefix characters (@, +, etc.) ahead of each nick.
// Strip them by looking up each leading character in the ISUPPORT prefix map
// and collecting the corresponding mode letters until a non-prefix character
// is found.
function parseName(isupport: IsupportMap, name: string): ClientName {
  const modes: string[] = []
  let nickStart = 0

  while (nickStart < name.length) {
    const mode = isupport.prefixToMode.get(name[nickStart] ?? '')
    if (mode === undefined) {
      break
    }

    modes.push(mode)
    nickStart += 1
  }

  return { modes, nick: name.slice(nickStart) }
}
