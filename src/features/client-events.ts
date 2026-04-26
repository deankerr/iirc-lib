import { parseCtcp } from '../ctcp'
import type { Runtime } from '../runtime'
import type { IrcMessage } from '../transport'

type ClientEventBase = {
  raw: IrcMessage
  source: string
  isFromSelf: boolean
  target: string
}

type ClientEventArgs = {
  runtime: Runtime
  message: IrcMessage
  target?: string
}

export type ClientModeChangeAction = 'add' | 'remove'
export type ClientModeChangeAppliesTo = 'channel' | 'member' | 'user'

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

export type ClientJoinEvent = ClientEventBase & {
  command: 'JOIN'
}

export type ClientPartEvent = ClientEventBase & {
  command: 'PART'
  text?: string
}

export type ClientNickEvent = ClientEventBase & {
  command: 'NICK'
  nick: string
}

export type ClientTopicEvent = ClientEventBase & {
  command: 'TOPIC'
  text: string
}

export type ClientModeEvent = ClientEventBase & {
  command: 'MODE'
  changes: ClientModeChange[]
}

export type ClientInviteEvent = ClientEventBase & {
  command: 'INVITE'
  invitedNick: string
  channel: string
}

export type ClientKickEvent = ClientEventBase & {
  command: 'KICK'
  kickedNick: string
  text?: string
}

export type ClientPrivmsgEvent = ClientEventBase & {
  command: 'PRIVMSG'
  text: string
}

export type ClientActionEvent = ClientEventBase & {
  command: 'ACTION'
  text: string
}

export type ClientNoticeEvent = ClientEventBase & {
  command: 'NOTICE'
  text: string
}

export type ClientAwayEvent = ClientEventBase & {
  command: 'AWAY'
  text?: string
}

export type ClientQuitEvent = ClientEventBase & {
  command: 'QUIT'
  text?: string
}

export type ClientRplTopicEvent = ClientEventBase & {
  command: 'RPL_TOPIC'
  text: string
}

export type ClientRplTopicWhoTimeEvent = ClientEventBase & {
  command: 'RPL_TOPICWHOTIME'
  nick: string
  setAt: string
}

export type ClientRplNamReplyEvent = ClientEventBase & {
  command: 'RPL_NAMREPLY'
  members: ClientName[]
}

export type ClientRplEndOfNamesEvent = ClientEventBase & {
  command: 'RPL_ENDOFNAMES'
  text?: string
}

export type ClientRplNoTopicEvent = ClientEventBase & {
  command: 'RPL_NOTOPIC'
}

export type ClientUnhandledEvent = ClientEventBase & {
  command: 'UNHANDLED'
}

export type ClientEvent =
  | ClientJoinEvent
  | ClientPartEvent
  | ClientNickEvent
  | ClientTopicEvent
  | ClientModeEvent
  | ClientInviteEvent
  | ClientKickEvent
  | ClientPrivmsgEvent
  | ClientActionEvent
  | ClientNoticeEvent
  | ClientAwayEvent
  | ClientQuitEvent
  | ClientRplTopicEvent
  | ClientRplTopicWhoTimeEvent
  | ClientRplNamReplyEvent
  | ClientRplEndOfNamesEvent
  | ClientRplNoTopicEvent
  | ClientUnhandledEvent

export function clientEvents(runtime: Runtime): void {
  runtime.on('message', (message) => {
    const event = createClientEvent(runtime, message)
    runtime.emit('clientEvent', event)
  })
}

function createClientEvent(runtime: Runtime, message: IrcMessage): ClientEvent {
  switch (message.command) {
    case 'JOIN': {
      return createJoinEvent(runtime, message)
    }

    case 'PART': {
      return createPartEvent(runtime, message)
    }

    case 'NICK': {
      return createNickEvent(runtime, message)
    }

    case 'TOPIC': {
      return createTopicEvent(runtime, message)
    }

    case 'MODE': {
      return createModeEvent(runtime, message)
    }

    case 'INVITE': {
      return createInviteEvent(runtime, message)
    }

    case 'KICK': {
      return createKickEvent(runtime, message)
    }

    case 'PRIVMSG': {
      return createPrivmsgEvent(runtime, message)
    }

    case 'NOTICE': {
      return createNoticeEvent(runtime, message)
    }

    case 'AWAY': {
      return createAwayEvent(runtime, message)
    }

    case 'QUIT': {
      return createQuitEvent(runtime, message)
    }

    case runtime.numerics.RPL_TOPIC: {
      return createRplTopicEvent(runtime, message)
    }

    case runtime.numerics.RPL_TOPICWHOTIME: {
      return createRplTopicWhoTimeEvent(runtime, message)
    }

    case runtime.numerics.RPL_NAMREPLY: {
      return createRplNamReplyEvent(runtime, message)
    }

    case runtime.numerics.RPL_ENDOFNAMES: {
      return createRplEndOfNamesEvent(runtime, message)
    }

    case runtime.numerics.RPL_NOTOPIC: {
      return createRplNoTopicEvent(runtime, message)
    }

    default: {
      return createUnhandledEvent(runtime, message)
    }
  }
}

function createJoinEvent(runtime: Runtime, message: IrcMessage): ClientJoinEvent {
  const [channel = ''] = message.params

  return {
    ...baseEvent({ message, runtime, target: channel }),
    command: 'JOIN',
  }
}

function createPartEvent(runtime: Runtime, message: IrcMessage): ClientPartEvent {
  const [channel = '', text] = message.params

  return {
    ...baseEvent({ message, runtime, target: channel }),
    command: 'PART',
    text,
  }
}

function createNickEvent(runtime: Runtime, message: IrcMessage): ClientNickEvent {
  const [nick = ''] = message.params

  return {
    ...baseEvent({ message, runtime, target: nick }),
    command: 'NICK',
    nick,
  }
}

function createTopicEvent(runtime: Runtime, message: IrcMessage): ClientTopicEvent {
  const [channel = '', text = ''] = message.params

  return {
    ...baseEvent({ message, runtime, target: channel }),
    command: 'TOPIC',
    text,
  }
}

function createModeEvent(runtime: Runtime, message: IrcMessage): ClientModeEvent {
  const [target = '', modes = '', ...args] = message.params

  return {
    ...baseEvent({ message, runtime, target }),
    changes: parseModeChanges(runtime, target, modes, args),
    command: 'MODE',
  }
}

function createInviteEvent(runtime: Runtime, message: IrcMessage): ClientInviteEvent {
  const [invitedNick = '', channel = ''] = message.params

  return {
    ...baseEvent({ message, runtime, target: channel }),
    channel,
    command: 'INVITE',
    invitedNick,
  }
}

function createKickEvent(runtime: Runtime, message: IrcMessage): ClientKickEvent {
  const [channel = '', kickedNick = '', text] = message.params

  return {
    ...baseEvent({ message, runtime, target: channel }),
    command: 'KICK',
    kickedNick,
    text,
  }
}

function createPrivmsgEvent(
  runtime: Runtime,
  message: IrcMessage,
): ClientPrivmsgEvent | ClientActionEvent {
  const [target = '', text = ''] = message.params
  const ctcp = parseCtcp(text)

  // ACTION is the only CTCP command promoted to its own event type.
  // All other CTCP commands arrive as ordinary PRIVMSG.
  if (ctcp?.command === 'ACTION') {
    return {
      ...baseEvent({ message, runtime, target }),
      command: 'ACTION',
      text: ctcp.arguments,
    }
  }

  return {
    ...baseEvent({ message, runtime, target }),
    command: 'PRIVMSG',
    text,
  }
}

function createNoticeEvent(runtime: Runtime, message: IrcMessage): ClientNoticeEvent {
  const [target = '', text = ''] = message.params

  return {
    ...baseEvent({ message, runtime, target }),
    command: 'NOTICE',
    text,
  }
}

function createAwayEvent(runtime: Runtime, message: IrcMessage): ClientAwayEvent {
  const [text] = message.params

  return {
    ...baseEvent({ message, runtime }),
    command: 'AWAY',
    text,
  }
}

function createQuitEvent(runtime: Runtime, message: IrcMessage): ClientQuitEvent {
  const [text] = message.params

  return {
    ...baseEvent({ message, runtime }),
    command: 'QUIT',
    text,
  }
}

function createRplTopicEvent(runtime: Runtime, message: IrcMessage): ClientRplTopicEvent {
  const [, channel = '', text = ''] = message.params

  return {
    ...baseEvent({ message, runtime, target: channel }),
    command: 'RPL_TOPIC',
    text,
  }
}

function createRplTopicWhoTimeEvent(
  runtime: Runtime,
  message: IrcMessage,
): ClientRplTopicWhoTimeEvent {
  const [, channel = '', nick = '', setAt = ''] = message.params

  return {
    ...baseEvent({ message, runtime, target: channel }),
    command: 'RPL_TOPICWHOTIME',
    nick,
    setAt,
  }
}

function createRplNamReplyEvent(runtime: Runtime, message: IrcMessage): ClientRplNamReplyEvent {
  const channel = message.params[2] ?? ''
  const rawNames = message.params[3] ?? ''

  return {
    ...baseEvent({ message, runtime, target: channel }),
    command: 'RPL_NAMREPLY',
    members: rawNames
      .split(' ')
      .filter((name) => name.length > 0)
      .map((name) => parseName(runtime, name)),
  }
}

function createRplEndOfNamesEvent(runtime: Runtime, message: IrcMessage): ClientRplEndOfNamesEvent {
  const [, channel = '', text] = message.params

  return {
    ...baseEvent({ message, runtime, target: channel }),
    command: 'RPL_ENDOFNAMES',
    text,
  }
}

function createRplNoTopicEvent(runtime: Runtime, message: IrcMessage): ClientRplNoTopicEvent {
  const [, channel = ''] = message.params

  return {
    ...baseEvent({ message, runtime, target: channel }),
    command: 'RPL_NOTOPIC',
  }
}

function createUnhandledEvent(runtime: Runtime, message: IrcMessage): ClientUnhandledEvent {
  return {
    ...baseEvent({ message, runtime }),
    command: 'UNHANDLED',
  }
}

function baseEvent({ message, runtime, target = '' }: ClientEventArgs): ClientEventBase {
  return {
    isFromSelf: isFromSelf(runtime, message),
    raw: message,
    source: message.source ?? '',
    target,
  }
}

function isFromSelf(runtime: Runtime, message: IrcMessage): boolean {
  return runtime.parseSource(message.source)?.isSelf ?? false
}

function parseModeChanges(
  runtime: Runtime,
  target: string,
  modes: string,
  args: string[],
): ClientModeChange[] {
  const changes: ClientModeChange[] = []
  let action: ClientModeChangeAction = 'add'
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

    const appliesTo = modeAppliesTo(runtime, target, mode)

    if (modeNeedsArgument(runtime, target, action, mode)) {
      changes.push({ action, appliesTo, argument: args[argIndex] ?? '', mode })
      argIndex += 1
      continue
    }

    changes.push({ action, appliesTo, mode })
  }

  return changes
}

function modeAppliesTo(runtime: Runtime, target: string, mode: string): ClientModeChangeAppliesTo {
  if (!isChannelTarget(runtime, target)) {
    return 'user'
  }

  if (prefixModes(runtime).includes(mode)) {
    return 'member'
  }

  return 'channel'
}

function modeNeedsArgument(
  runtime: Runtime,
  target: string,
  action: ClientModeChangeAction,
  mode: string,
): boolean {
  if (!isChannelTarget(runtime, target)) {
    return false
  }

  if (prefixModes(runtime).includes(mode)) {
    return true
  }

  const [typeA = '', typeB = '', typeC = ''] = chanModeGroups(runtime)
  if (typeA.includes(mode) || typeB.includes(mode)) {
    return true
  }

  return action === 'add' && typeC.includes(mode)
}

function isChannelTarget(runtime: Runtime, target: string): boolean {
  return runtime.isupport.CHANTYPES.includes(target[0] ?? '')
}

function chanModeGroups(runtime: Runtime): string[] {
  return runtime.isupport.CHANMODES.split(',')
}

function prefixModes(runtime: Runtime): string {
  return /^\(([^)]*)\)/.exec(runtime.isupport.PREFIX)?.[1] ?? ''
}

function parseName(runtime: Runtime, name: string): ClientName {
  const prefixToMode = prefixModeMap(runtime)
  const modes: string[] = []
  let nickStart = 0

  while (nickStart < name.length) {
    const mode = prefixToMode.get(name[nickStart] ?? '')
    if (mode === undefined) {
      break
    }

    modes.push(mode)
    nickStart += 1
  }

  return { modes, nick: name.slice(nickStart) }
}

function prefixModeMap(runtime: Runtime): Map<string, string> {
  const prefix = runtime.isupport.PREFIX
  const match = /^\(([^)]*)\)(.*)$/.exec(prefix)
  const modes = match?.[1] ?? ''
  const prefixes = match?.[2] ?? ''
  const prefixToMode = new Map<string, string>()

  for (let index = 0; index < prefixes.length; index += 1) {
    prefixToMode.set(prefixes[index] ?? '', modes[index] ?? '')
  }

  return prefixToMode
}
