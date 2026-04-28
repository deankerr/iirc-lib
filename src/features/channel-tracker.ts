import { CaseFoldMap } from '../case-fold-map'
import type { Runtime } from '../runtime'
import type { ClientEvent, ClientModeChange, ClientName } from './client-events'

export type ChannelTopic = {
  text: string
  setAt?: string
  setBy?: string
}

export type ChannelMember = {
  modes: Set<string>
  nick: string
}

export type ChannelModeValue = string | true

export type ChannelSource = {
  name: string
  user?: string
  host?: string
  isSelf: boolean
}

export type ChannelContext = {
  currentNick: string
  sameIdentifier: (left: string, right: string) => boolean
}

type ChannelSourceEvent = Extract<ClientEvent, { command: 'JOIN' | 'PART' | 'NICK' | 'QUIT' }>
type ChannelEventWithoutSource = Extract<
  ClientEvent,
  {
    command:
      | 'KICK'
      | 'TOPIC'
      | 'MODE'
      | 'RPL_TOPIC'
      | 'RPL_TOPICWHOTIME'
      | 'RPL_NOTOPIC'
      | 'RPL_CHANNELMODEIS'
      | 'RPL_CREATIONTIME'
  }
>
export type ChannelState = Channel

export class Channel {
  readonly members: CaseFoldMap<ChannelMember>
  readonly modes = new Map<string, ChannelModeValue>()
  readonly name: string

  joined = false
  topic?: ChannelTopic
  createdAt?: string

  constructor(name: string, caseFold: (key: string) => string) {
    this.members = new CaseFoldMap(caseFold)
    this.name = name
  }

  // A channel is a small state machine over the client events that can affect
  // the state a user expects to see for that channel.
  applySource(event: ChannelSourceEvent, source: ChannelSource): void {
    switch (event.command) {
      case 'JOIN': {
        if (source.isSelf) {
          this.joined = true
        }

        this.addMember(source.name)
        break
      }

      case 'PART': {
        if (source.isSelf) {
          this.joined = false
        }

        this.removeMember(source.name)
        break
      }

      case 'QUIT': {
        if (source.isSelf) {
          this.joined = false
        }

        this.removeMember(source.name)
        break
      }

      case 'NICK': {
        this.renameMember(source.name, event.nick)
        break
      }

      default: {
        break
      }
    }
  }

  // Apply a mode change list to this channel, ignoring user-mode changes.
  applyChanges(changes: ClientModeChange[]): void {
    for (const change of changes) {
      if (change.appliesTo === 'user') {
        continue
      }

      if (change.appliesTo === 'channel') {
        if (change.action === 'add') {
          this.modes.set(change.mode, change.argument ?? true)
          continue
        }

        this.modes.delete(change.mode)
        continue
      }

      if (change.argument === undefined) {
        continue
      }

      const member = this.addMember(change.argument)
      if (change.action === 'add') {
        member.modes.add(change.mode)
        continue
      }

      member.modes.delete(change.mode)
    }
  }

  apply(event: ChannelEventWithoutSource, context: ChannelContext): void {
    switch (event.command) {
      case 'KICK': {
        if (context.sameIdentifier(event.kickedNick, context.currentNick)) {
          this.joined = false
        }

        this.removeMember(event.kickedNick)
        break
      }

      case 'TOPIC':
      case 'RPL_TOPIC': {
        this.topic = {
          ...this.topic,
          text: event.text,
        }
        break
      }

      case 'RPL_TOPICWHOTIME': {
        this.topic = {
          setAt: event.setAt,
          setBy: event.nick,
          text: this.topic?.text ?? '',
        }
        break
      }

      case 'RPL_NOTOPIC': {
        this.topic = undefined
        break
      }

      case 'RPL_CHANNELMODEIS': {
        this.applyChanges(event.changes)
        break
      }

      case 'RPL_CREATIONTIME': {
        this.createdAt = event.setAt
        break
      }

      case 'MODE': {
        this.applyChanges(event.changes)
        break
      }

      default: {
        break
      }
    }
  }

  // Server query results are allowed to replace member state when the feature
  // layer has assembled a complete logical names response.
  setMembers(members: ClientName[]): void {
    this.members.clear()

    for (const namedMember of members) {
      const member = this.members.ensure(namedMember.nick, () => ({
        modes: new Set<string>(),
        nick: namedMember.nick,
      }))
      for (const mode of namedMember.modes) {
        member.modes.add(mode)
      }
    }
  }

  private addMember(nick: string): ChannelMember {
    return this.members.ensure(nick, () => ({ modes: new Set<string>(), nick }))
  }

  private removeMember(nick: string): void {
    this.members.delete(nick)
  }

  private renameMember(previousNick: string, nick: string): void {
    const member = this.members.get(previousNick)
    if (member === undefined) {
      return
    }

    this.members.delete(previousNick)
    member.nick = nick
    this.members.set(nick, member)
  }
}

function handleTargetedEvent(
  event: ClientEvent,
  context: ChannelContext,
  ensureChannel: (name: string) => Channel,
  pendingNames: CaseFoldMap<ClientName[]>,
): void {
  // oxlint-disable-next-line typescript-eslint/switch-exhaustiveness-check
  switch (event.command) {
    case 'JOIN':
    case 'PART': {
      const source: ChannelSource = { ...event.from }
      const channel = ensureChannel(event.target)
      channel.applySource(event, source)
      return
    }

    case 'KICK':
    case 'TOPIC':
    case 'RPL_TOPIC':
    case 'RPL_TOPICWHOTIME':
    case 'RPL_NOTOPIC':
    case 'RPL_CHANNELMODEIS':
    case 'RPL_CREATIONTIME': {
      const channel = ensureChannel(event.target)
      channel.apply(event, context)
      return
    }

    case 'MODE': {
      if (event.changes.every((change) => change.appliesTo === 'user')) {
        return
      }

      const channel = ensureChannel(event.target)
      channel.apply(event, context)
      return
    }

    case 'RPL_NAMREPLY': {
      ensureChannel(event.target)
      pendingNames.ensure(event.target, () => []).push(...event.members)
      return
    }

    case 'RPL_ENDOFNAMES': {
      const channel = ensureChannel(event.target)
      channel.setMembers(pendingNames.get(event.target) ?? [])
      pendingNames.delete(event.target)
      return
    }

    default: {
      break
    }
  }
}

export function channelTracker(runtime: Runtime): void {
  const pendingNames = new CaseFoldMap<ClientName[]>((name) => runtime.caseFold(name))
  const ensureChannel = (name: string) =>
    runtime.channels.ensure(name, () => new Channel(name, (key) => runtime.caseFold(key)))

  runtime.on('clientEvent', (event) => {
    if (event.target !== '') {
      handleTargetedEvent(event, channelContext(runtime), ensureChannel, pendingNames)
      return
    }

    // Broadcast events do not name a channel, so each tracked channel decides
    // whether the event affects its state.
    // oxlint-disable-next-line typescript-eslint/switch-exhaustiveness-check
    switch (event.command) {
      case 'NICK':
      case 'QUIT': {
        const source: ChannelSource = { ...event.from }
        for (const channel of runtime.channels.values()) {
          channel.applySource(event, source)
        }
        return
      }

      default: {
        break
      }
    }
  })
}

function channelContext(runtime: Runtime): ChannelContext {
  return {
    currentNick: runtime.connectionState.nick,
    sameIdentifier: (left, right) => runtime.sameIdentifier(left, right),
  }
}
