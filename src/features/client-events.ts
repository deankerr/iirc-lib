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

export type ClientModeChange = {
  action: ClientModeChangeAction
  mode: string
  argument?: string
}

export type ClientJoinEvent = ClientEventBase & {
  command: 'JOIN'
}

export type ClientPartEvent = ClientEventBase & {
  command: 'PART'
  text?: string
}

export type ClientTopicEvent = ClientEventBase & {
  command: 'TOPIC'
  text: string
}

export type ClientModeEvent = ClientEventBase & {
  command: 'MODE'
  modes: string
  args: string[]
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
  symbol: string
  names: string[]
}

export type ClientRplEndOfNamesEvent = ClientEventBase & {
  command: 'RPL_ENDOFNAMES'
  text?: string
}

export type ClientUnhandledEvent = ClientEventBase & {
  command: 'UNHANDLED'
}

export type ClientEvent =
  | ClientJoinEvent
  | ClientPartEvent
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
    args,
    changes: parseModeChanges(runtime, target, modes, args),
    command: 'MODE',
    modes,
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
  const actionText = parseActionText(text)

  return {
    ...baseEvent({ message, runtime, target }),
    command: actionText === undefined ? 'PRIVMSG' : 'ACTION',
    text: actionText ?? text,
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
  const [, symbol = '', channel = '', namesText = ''] = message.params

  return {
    ...baseEvent({ message, runtime, target: channel }),
    command: 'RPL_NAMREPLY',
    names: namesText.split(' ').filter((name) => name.length > 0),
    symbol,
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

function parseActionText(text: string): string | undefined {
  if (!text.startsWith('\u0001ACTION ') || !text.endsWith('\u0001')) {
    return undefined
  }

  return text.slice('\u0001ACTION '.length, -1)
}

const DEFAULT_CHANNEL_TYPES = '#&'
const DEFAULT_CHANMODES = ['b', 'k', 'l', 'imnpst'] as const
const DEFAULT_PREFIX = '(ov)@+'

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

    if (modeNeedsArgument(runtime, target, action, mode)) {
      changes.push({ action, argument: args[argIndex] ?? '', mode })
      argIndex += 1
      continue
    }

    changes.push({ action, mode })
  }

  return changes
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
  return channelTypes(runtime).includes(target[0] ?? '')
}

function channelTypes(runtime: Runtime): string {
  const value = runtime.isupport.get('CHANTYPES')
  if (typeof value === 'string') {
    return value
  }

  return DEFAULT_CHANNEL_TYPES
}

function chanModeGroups(runtime: Runtime): string[] {
  const value = runtime.isupport.get('CHANMODES')
  if (typeof value === 'string') {
    return value.split(',')
  }

  return [...DEFAULT_CHANMODES]
}

function prefixModes(runtime: Runtime): string {
  const value = runtime.isupport.get('PREFIX')
  const prefix = typeof value === 'string' ? value : DEFAULT_PREFIX
  return /^\(([^)]*)\)/.exec(prefix)?.[1] ?? ''
}
