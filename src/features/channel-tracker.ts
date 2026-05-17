import { CaseFoldMap } from '../case-fold-map'
import type { Runtime } from '../runtime'

export interface ChannelTopic {
  text: string
  setAt?: string
  setBy?: string
}

export interface ChannelMember {
  nick: string
}

export type ChannelState = Channel

export class Channel {
  readonly members: CaseFoldMap<ChannelMember>
  // Each mode letter maps to the set of arguments associated with it.
  // Boolean modes (type D) use an empty set; list modes (type A) and prefix
  // modes accumulate entries; setting modes (type B/C) hold a single entry.
  readonly modes = new Map<string, Set<string>>()
  readonly name: string

  joined = false
  topic?: ChannelTopic
  createdAt?: string

  constructor(name: string, caseFold: (key: string) => string) {
    this.members = new CaseFoldMap(caseFold)
    this.name = name
  }

  addMode(mode: string, argument?: string): void {
    if (argument === undefined) {
      if (!this.modes.has(mode)) {
        this.modes.set(mode, new Set())
      }
      return
    }

    let args = this.modes.get(mode)
    if (args === undefined) {
      args = new Set()
      this.modes.set(mode, args)
    }
    args.add(argument)
  }

  removeMode(mode: string, argument?: string): void {
    if (argument === undefined) {
      this.modes.delete(mode)
      return
    }

    const args = this.modes.get(mode)
    if (args !== undefined) {
      args.delete(argument)
      if (args.size === 0) {
        this.modes.delete(mode)
      }
    }
  }

  // Returns the set of mode letters this nick holds as an argument (prefix modes).
  // Scans all mode entries; fine given the small number of active mode letters.
  getMemberModes(nick: string): Set<string> {
    const result = new Set<string>()
    for (const [mode, args] of this.modes) {
      if (args.has(nick)) {
        result.add(mode)
      }
    }
    return result
  }

  addMember(nick: string): void {
    this.members.ensure(nick, () => ({ nick }))
  }

  removeMember(nick: string): void {
    this.members.delete(nick)
    // Clean up any prefix mode entries for this nick.
    for (const args of this.modes.values()) {
      args.delete(nick)
    }
  }

  renameMember(previousNick: string, nick: string): void {
    if (!this.members.has(previousNick)) {
      return
    }

    this.members.delete(previousNick)
    this.members.set(nick, { nick })

    // Update the nick in any mode argument sets (covers prefix modes).
    for (const args of this.modes.values()) {
      if (args.has(previousNick)) {
        args.delete(previousNick)
        args.add(nick)
      }
    }
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
      for (const prefixMode of runtime.isupport.prefixModes) {
        channel.modes.delete(prefixMode)
      }

      for (const { nick, mode } of pending) {
        channel.addMember(nick)
        if (mode !== undefined) {
          channel.addMode(mode, nick)
        }
      }

      pendingNames.delete(event.channel)
      return
    }

    if (event.command === 'MODE') {
      if (!runtime.isChannel(event.target)) {
        return
      }
      const channel = ensureChannel(event.target)
      const [, typeB] = runtime.isupport.chanModeGroups
      for (const change of runtime.parseModeChanges(event.modestring, event.modeArgs)) {
        if (change.action === '+') {
          channel.addMode(change.mode, change.argument)
        } else if (typeB.includes(change.mode)) {
          // Type B remove argument is a protocol artifact — always clear the whole setting.
          channel.removeMode(change.mode)
        } else {
          channel.removeMode(change.mode, change.argument)
        }
      }
      return
    }

    if (event.command === 'RPL_CHANNELMODEIS') {
      const channel = ensureChannel(event.channel)
      const [, typeB] = runtime.isupport.chanModeGroups
      for (const change of runtime.parseModeChanges(event.modestring, event.modeArgs)) {
        if (change.action === '+') {
          channel.addMode(change.mode, change.argument)
        } else if (typeB.includes(change.mode)) {
          channel.removeMode(change.mode)
        } else {
          channel.removeMode(change.mode, change.argument)
        }
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
