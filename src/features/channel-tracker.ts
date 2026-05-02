import { CaseFoldMap } from '../case-fold-map'
import type { Runtime } from '../runtime'
import type { ClientEvent, ClientModeChange } from './client-events'

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

  // Server query results are allowed to replace member state when the feature
  // layer has assembled a complete logical names response.
  setMembers(members: ChannelMember[]): void {
    this.members.clear()

    for (const member of members) {
      this.members.set(member.nick, member)
    }
  }

  addMember(nick: string): ChannelMember {
    return this.members.ensure(nick, () => ({ modes: new Set<string>(), nick }))
  }

  removeMember(nick: string): void {
    this.members.delete(nick)
  }

  renameMember(previousNick: string, nick: string): void {
    const member = this.members.get(previousNick)
    if (member === undefined) {
      return
    }

    this.members.delete(previousNick)
    member.nick = nick
    this.members.set(nick, member)
  }
}

type HandlerEvent<T extends string> = Extract<ClientEvent, { command: T }>

// Channel state mutation handlers. Each key matches a ClientEvent command and
// receives its specific event variant — no command guards needed inside. The map
// lookup replaces both the router switch and Channel.apply: no double-dispatch.
const channelHandlers = {
  JOIN(channel: Channel, event: HandlerEvent<'JOIN'>) {
    if (event.from.isSelf) {
      channel.joined = true
    }

    channel.addMember(event.from.name)
  },

  PART(channel: Channel, event: HandlerEvent<'PART'>) {
    if (event.from.isSelf) {
      channel.joined = false
    }

    channel.removeMember(event.from.name)
  },

  QUIT(channel: Channel, event: HandlerEvent<'QUIT'>) {
    if (event.from.isSelf) {
      channel.joined = false
    }

    channel.removeMember(event.from.name)
  },

  KILL(channel: Channel, event: HandlerEvent<'KILL'>) {
    if (event.from.isSelf) {
      channel.joined = false
    }

    channel.removeMember(event.from.name)
  },

  NICK(channel: Channel, event: HandlerEvent<'NICK'>) {
    channel.renameMember(event.from.name, event.nick)
  },

  KICK(channel: Channel, event: HandlerEvent<'KICK'>) {
    if (event.nickIsSelf) {
      channel.joined = false
    }

    channel.removeMember(event.nick)
  },

  TOPIC(channel: Channel, event: HandlerEvent<'TOPIC'>) {
    if (event.text === '') {
      channel.topic = undefined
      return
    }

    channel.topic = {
      ...channel.topic,
      setAt: String(Date.now() / 1000),
      setBy: event.from.name,
      text: event.text,
    }
  },

  RPL_TOPIC(channel: Channel, event: HandlerEvent<'RPL_TOPIC'>) {
    channel.topic = {
      ...channel.topic,
      text: event.text,
    }
  },

  RPL_TOPICWHOTIME(channel: Channel, event: HandlerEvent<'RPL_TOPICWHOTIME'>) {
    channel.topic = {
      setAt: event.setAt,
      setBy: event.nick,
      text: channel.topic?.text ?? '',
    }
  },

  RPL_NOTOPIC() {
    // RPL_NOTOPIC is the server's explicit response when querying a channel
    // that has no topic set. Live clearing is handled by TOPIC with empty text.
  },

  RPL_CHANNELMODEIS(channel: Channel, event: HandlerEvent<'RPL_CHANNELMODEIS'>) {
    channel.applyChanges(event.changes)
  },

  MODE(channel: Channel, event: HandlerEvent<'MODE'>) {
    channel.applyChanges(event.changes)
  },

  RPL_CREATIONTIME(channel: Channel, event: HandlerEvent<'RPL_CREATIONTIME'>) {
    channel.createdAt = event.setAt
  },
}

type ChannelHandler = (channel: Channel, event: ClientEvent) => void

export function channelTracker(runtime: Runtime): void {
  const pendingNames = new CaseFoldMap<ChannelMember[]>((name) => runtime.caseFold(name))
  const ensureChannel = (name: string) =>
    runtime.channels.ensure(name, () => new Channel(name, (key) => runtime.caseFold(key)))

  // The handler key matches the event command by construction — each handler
  // receives its specific event variant. TypeScript cannot verify this
  // correlation at the call site, so we cast once at the dispatch point.
  // oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
  const handlers = channelHandlers as unknown as Record<string, ChannelHandler>

  runtime.on('clientEvent', (event) => {
    // NAMES accumulation is a tracker concern, not a channel mutation.
    if (event.command === 'RPL_NAMREPLY') {
      ensureChannel(event.target)
      for (const entry of event.members) {
        const modes = new Set<string>()
        if (entry.mode !== undefined) {
          modes.add(entry.mode)
        }

        pendingNames.ensure(event.target, () => []).push({ modes, nick: entry.nick })
      }

      return
    }

    if (event.command === 'RPL_ENDOFNAMES') {
      const channel = ensureChannel(event.target)
      channel.setMembers(pendingNames.get(event.target) ?? [])
      pendingNames.delete(event.target)
      return
    }

    const handler = handlers[event.command]
    if (handler === undefined) {
      return
    }

    // Targeted events mutate a single channel.
    if ('target' in event && typeof event.target === 'string') {
      handler(ensureChannel(event.target), event)
      return
    }

    // Broadcast events mutate every tracked channel.
    for (const channel of runtime.channels.values()) {
      handler(channel, event)
    }
  })
}
