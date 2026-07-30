import { CaseFoldMap } from '../case-fold-map'
import { ChannelModes } from '../channel-modes'
import type { ChannelModesJSON } from '../channel-modes'
import type { Runtime } from '../runtime'

export interface ChannelTopic {
  text: string
  setAt?: string
  setBy?: string
}

export interface ChannelMember {
  nick: string
}

export interface ChannelJSON {
  createdAt?: string
  joined: boolean
  members: string[]
  modes: ChannelModesJSON
  name: string
  topic?: ChannelTopic
}

export class Channel {
  readonly members: CaseFoldMap<ChannelMember>
  readonly modes: ChannelModes
  readonly name: string

  joined = false
  topic?: ChannelTopic
  createdAt?: string

  constructor(name: string, caseFold: (key: string) => string) {
    this.members = new CaseFoldMap(caseFold)
    this.modes = new ChannelModes(caseFold)
    this.name = name
  }

  getMemberModes(nick: string): Set<string> {
    return this.modes.getMemberModes(nick)
  }

  addMember(nick: string): void {
    this.members.ensure(nick, () => ({ nick }))
  }

  removeMember(nick: string): void {
    this.members.delete(nick)
    this.modes.removeMember(nick)
  }

  toJSON(): ChannelJSON {
    return {
      ...(this.createdAt !== undefined && { createdAt: this.createdAt }),
      joined: this.joined,
      members: [...this.members.keys()],
      modes: this.modes.toJSON(),
      name: this.name,
      ...(this.topic !== undefined && { topic: { ...this.topic } }),
    }
  }

  renameMember(previousNick: string, nick: string): void {
    if (!this.members.has(previousNick)) {
      return
    }

    this.members.delete(previousNick)
    this.members.set(nick, { nick })

    this.modes.renameMember(previousNick, nick)
  }
}

export function channelTracker(runtime: Runtime): void {
  const pendingNames = new CaseFoldMap<{ nick: string; mode?: string }[]>((name) =>
    runtime.caseFold(name),
  )
  const ensureChannel = (name: string) =>
    runtime.channels.ensure(name, () => new Channel(name, (key) => runtime.caseFold(key)))

  runtime.on('event', (event) => {
    if (event.command === 'RPL_NAMREPLY') {
      ensureChannel(event.channel)

      for (const entry of runtime.parseNames(event.names)) {
        pendingNames.ensure(event.channel, () => []).push(entry)
      }

      return
    }

    if (event.command === 'RPL_ENDOFNAMES') {
      const channel = ensureChannel(event.channel)
      const pending = pendingNames.get(event.channel) ?? []

      // Replace members and their prefix modes atomically.
      channel.members.clear()
      channel.modes.replacePrefixes(pending)

      for (const { nick } of pending) {
        channel.addMember(nick)
      }

      pendingNames.delete(event.channel)
      return
    }

    if (event.command === 'MODE') {
      if (!runtime.isChannel(event.target)) {
        return
      }
      const channel = ensureChannel(event.target)
      for (const change of runtime.parseModeChanges(event.modestring, event.modeArgs)) {
        channel.modes.apply(change)
      }
      return
    }

    if (event.command === 'RPL_CHANNELMODEIS') {
      const channel = ensureChannel(event.channel)
      for (const change of runtime.parseModeChanges(event.modestring, event.modeArgs)) {
        channel.modes.apply(change)
      }
      return
    }

    if (event.command === 'JOIN') {
      const channel = ensureChannel(event.channel)
      if (event.from.isSelf) {
        channel.joined = true
      }

      channel.addMember(event.from.name)
      return
    }

    if (event.command === 'PART') {
      const channel = ensureChannel(event.channel)
      if (event.from.isSelf) {
        channel.joined = false
      }

      channel.removeMember(event.from.name)
      return
    }

    if (event.command === 'TOPIC') {
      const channel = ensureChannel(event.channel)
      if (event.topic === '') {
        delete channel.topic
        return
      }

      // A TOPIC command carries no timestamp: it means the topic was just set,
      // so we record now. Match RPL_TOPICWHOTIME's format — integer unix seconds.
      channel.topic = {
        ...channel.topic,
        setAt: String(Math.floor(Date.now() / 1000)),
        setBy: event.from.name,
        text: event.topic,
      }
      return
    }

    if (event.command === 'RPL_NOTOPIC') {
      const channel = ensureChannel(event.channel)
      delete channel.topic
      return
    }

    if (event.command === 'RPL_TOPIC') {
      const channel = ensureChannel(event.channel)
      channel.topic = {
        ...channel.topic,
        text: event.topic,
      }
      return
    }

    if (event.command === 'RPL_TOPICWHOTIME') {
      const channel = ensureChannel(event.channel)
      channel.topic = {
        setAt: event.setat,
        setBy: event.nick,
        text: channel.topic?.text ?? '',
      }
      return
    }

    if (event.command === 'RPL_CREATIONTIME') {
      const channel = ensureChannel(event.channel)
      channel.createdAt = event.creationtime
      return
    }

    if (event.command === 'KICK') {
      const channel = ensureChannel(event.channel)
      channel.removeMember(event.user)

      if (runtime.sameIdentifier(event.user, runtime.connectionState.nick)) {
        channel.joined = false
      }
      return
    }

    if (event.command === 'QUIT') {
      if (event.from.isSelf) {
        for (const channel of runtime.channels.values()) {
          channel.joined = false
        }
      }

      for (const channel of runtime.channels.values()) {
        channel.removeMember(event.from.name)
      }
      return
    }

    if (event.command === 'KILL') {
      if (runtime.sameIdentifier(event.nickname, runtime.connectionState.nick)) {
        for (const channel of runtime.channels.values()) {
          channel.joined = false
        }
      }

      for (const channel of runtime.channels.values()) {
        channel.removeMember(event.nickname)
      }
      return
    }

    if (event.command === 'NICK') {
      for (const channel of runtime.channels.values()) {
        channel.renameMember(event.from.name, event.newnick)
      }
    }
  })
}
