import type { ParsedMessage } from './client'
import type { Isupport } from './protocol/isupport'
import { parseChanModes, parseModeChanges, parseNamesReply } from './protocol/modes'
import { parseUserhost } from './protocol/parser'

export type ChannelMember = {
  nick: string
  user?: string
  host?: string
  modes: string[]
}

export type ChannelState = {
  name: string
  topic: string
  topicSetBy?: string
  topicSetAt?: number
  modes: string[]
  users: Map<string, ChannelMember>
  joined: boolean
}

export type ChannelTrackerHost = {
  isupport: Isupport
  isSelf(source: string): boolean
}

export type ChannelTracker = {
  readonly channels: ReadonlyMap<string, ChannelState>
  getChannel(name: string): ChannelState | undefined
  processMessage(msg: ParsedMessage): void
  handleClose(): void
  clear(): void
}

function createChannelState(name: string): ChannelState {
  return { name, topic: '', modes: [], users: new Map(), joined: false }
}

export function createChannelTracker(host: ChannelTrackerHost): ChannelTracker {
  const channels = new Map<string, ChannelState>()

  // Case-fold a string using the server's CASEMAPPING
  function fold(str: string): string {
    return host.isupport.casemapper.fold(str)
  }

  function getOrCreateChannel(name: string): ChannelState {
    const key = fold(name)
    let channel = channels.get(key)
    if (!channel) {
      channel = createChannelState(name)
      channels.set(key, channel)
    }
    return channel
  }

  // Build prefix char -> mode char map from ISUPPORT PREFIX
  function getPrefixMap(): Map<string, string> {
    const { modes, prefixes } = host.isupport.prefix
    const map = new Map<string, string>()
    for (let i = 0; i < modes.length && i < prefixes.length; i++) {
      const p = prefixes[i]
      const m = modes[i]
      if (p && m) map.set(p, m)
    }
    return map
  }

  // Get the set of prefix mode chars (e.g. {'o', 'v', 'h'})
  function getPrefixModeSet(): Set<string> {
    const { modes } = host.isupport.prefix
    return new Set(modes)
  }

  function processMessage(msg: ParsedMessage) {
    switch (msg.command) {
      // JOIN
      case 'JOIN': {
        const channelName = msg.params[0]
        if (!channelName || !msg.source) break

        const channel = getOrCreateChannel(channelName)
        const parsed = parseUserhost(msg.source)

        // Self join: clear stale users, mark joined
        if (msg.fromSelf) {
          channel.users.clear()
          channel.joined = true
        }

        // Add user to channel
        const userKey = fold(parsed.nick)
        if (!channel.users.has(userKey)) {
          channel.users.set(userKey, {
            nick: parsed.nick,
            user: parsed.user,
            host: parsed.host,
            modes: [],
          })
        }
        break
      }

      // PART
      case 'PART': {
        const channelName = msg.params[0]
        if (!channelName || !msg.source) break

        const channel = channels.get(fold(channelName))
        if (!channel) break

        if (msg.fromSelf) {
          channel.joined = false
        } else {
          const parsed = parseUserhost(msg.source)
          channel.users.delete(fold(parsed.nick))
        }
        break
      }

      // KICK
      case 'KICK': {
        const channelName = msg.params[0]
        const kickedNick = msg.params[1]
        if (!channelName || !kickedNick) break

        const channel = channels.get(fold(channelName))
        if (!channel) break

        if (host.isSelf(kickedNick)) {
          channel.joined = false
        } else {
          channel.users.delete(fold(kickedNick))
        }
        break
      }

      // QUIT — remove from all channels
      case 'QUIT': {
        if (!msg.source) break
        const parsed = parseUserhost(msg.source)
        const nickKey = fold(parsed.nick)

        for (const channel of channels.values()) {
          channel.users.delete(nickKey)
        }
        break
      }

      // NICK — rename in all channels
      case 'NICK': {
        if (!msg.source) break
        const newNick = msg.params[0]
        if (!newNick) break

        const parsed = parseUserhost(msg.source)
        const oldKey = fold(parsed.nick)
        const newKey = fold(newNick)

        for (const channel of channels.values()) {
          const user = channel.users.get(oldKey)
          if (user) {
            user.nick = newNick
            channel.users.delete(oldKey)
            channel.users.set(newKey, user)
          }
        }
        break
      }

      // TOPIC
      case 'TOPIC': {
        const channelName = msg.params[0]
        const topic = msg.params[1] ?? ''
        if (!channelName) break

        const channel = channels.get(fold(channelName))
        if (!channel) break

        channel.topic = topic
        if (msg.source) {
          channel.topicSetBy = parseUserhost(msg.source).nick
        }
        channel.topicSetAt = Date.now()
        break
      }

      // RPL_TOPIC (332)
      case '332': {
        const channelName = msg.params[1]
        const topic = msg.params[2] ?? ''
        if (!channelName) break

        const channel = getOrCreateChannel(channelName)
        channel.topic = topic
        break
      }

      // RPL_TOPICWHOTIME (333)
      case '333': {
        const channelName = msg.params[1]
        const setter = msg.params[2]
        const timestamp = msg.params[3]
        if (!channelName) break

        const channel = channels.get(fold(channelName))
        if (!channel) break

        channel.topicSetBy = setter
        if (timestamp) {
          channel.topicSetAt = Number.parseInt(timestamp, 10) * 1000
        }
        break
      }

      // MODE
      case 'MODE': {
        const target = msg.params[0]
        const modeString = msg.params[1]
        if (!target || !modeString) break

        const channel = channels.get(fold(target))
        if (!channel) break

        const params = msg.params.slice(2)
        const chanModes = parseChanModes(
          (() => {
            const v = host.isupport.get('CHANMODES')
            return typeof v === 'string' ? v : undefined
          })(),
        )
        const prefixModeSet = getPrefixModeSet()

        const changes = parseModeChanges({
          modeString,
          params,
          chanModes,
          prefixModes: prefixModeSet,
        })

        for (const change of changes) {
          // User prefix mode (e.g. +o nick)
          if (prefixModeSet.has(change.mode) && change.param) {
            const user = channel.users.get(fold(change.param))
            if (!user) continue
            if (change.adding && !user.modes.includes(change.mode)) {
              user.modes.push(change.mode)
            } else if (!change.adding) {
              user.modes = user.modes.filter((m) => m !== change.mode)
            }
            continue
          }

          // Channel mode
          if (change.adding && !channel.modes.includes(change.mode)) {
            channel.modes.push(change.mode)
          } else if (!change.adding) {
            channel.modes = channel.modes.filter((m) => m !== change.mode)
          }
        }
        break
      }

      // RPL_NAMREPLY (353)
      case '353': {
        // params: <nick> <channel_type> <channel> :<names>
        const channelName = msg.params[2]
        const namesStr = msg.params[3]
        if (!channelName || !namesStr) break

        const channel = getOrCreateChannel(channelName)
        const users = parseNamesReply({ namesStr, prefixMap: getPrefixMap() })

        for (const user of users) {
          const key = fold(user.nick)
          const existing = channel.users.get(key)
          if (existing) {
            // Merge modes
            for (const mode of user.modes) {
              if (!existing.modes.includes(mode)) {
                existing.modes.push(mode)
              }
            }
          } else {
            channel.users.set(key, { nick: user.nick, modes: user.modes })
          }
        }
        break
      }

      default:
        break
    }
  }

  function handleClose() {
    for (const channel of channels.values()) {
      channel.joined = false
    }
  }

  return {
    channels,

    getChannel(name: string): ChannelState | undefined {
      return channels.get(fold(name))
    },

    processMessage,
    handleClose,

    clear() {
      channels.clear()
    },
  }
}
