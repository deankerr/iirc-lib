import { CaseFoldMap } from '../case-fold-map'
import type { ClientModeChange, Runtime } from '../runtime'

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

export function channelTracker(runtime: Runtime): void {
  const pendingNames = new CaseFoldMap<ChannelMember[]>((name) => runtime.caseFold(name))
  const ensureChannel = (name: string) =>
    runtime.channels.ensure(name, () => new Channel(name, (key) => runtime.caseFold(key)))

  runtime.on('event', (event) => {
    if (event.command === 'RPL_NAMREPLY') {
      ensureChannel(event.channel)

      const members = runtime.parseNames(event.names)

      for (const entry of members) {
        const modes = new Set<string>()

        if (entry.mode !== undefined) {
          modes.add(entry.mode)
        }

        pendingNames.ensure(event.channel, () => []).push({ modes, nick: entry.nick })
      }

      return
    }

    if (event.command === 'RPL_ENDOFNAMES') {
      const channel = ensureChannel(event.channel)
      channel.setMembers(pendingNames.get(event.channel) ?? [])
      pendingNames.delete(event.channel)
      return
    }

    if (event.command === 'MODE') {
      if (!runtime.isChannel(event.target)) {
        return
      }
      const channel = ensureChannel(event.target)
      const changes = runtime.parseModeChanges(event.target, event.modestring, event.modeArgs)
      channel.applyChanges(changes)
      return
    }

    if (event.command === 'RPL_CHANNELMODEIS') {
      const channel = ensureChannel(event.channel)
      const changes = runtime.parseModeChanges(event.channel, event.modestring, event.modeArgs)
      channel.applyChanges(changes)
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
        channel.topic = undefined
        return
      }

      channel.topic = {
        ...channel.topic,
        setAt: String(Date.now() / 1000),
        setBy: event.from.name,
        text: event.topic,
      }
      return
    }

    if (event.command === 'RPL_NOTOPIC') {
      const channel = ensureChannel(event.channel)
      channel.topic = undefined
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
