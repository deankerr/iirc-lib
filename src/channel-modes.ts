export type ChannelModeType = 'A' | 'B' | 'C' | 'D' | 'PREFIX'

export interface ChannelModeChange {
  action: '+' | '-'
  mode: string
  type: ChannelModeType
  argument?: string
}

export interface ChannelModesJSON {
  A: Record<string, string[]>
  B: Record<string, string>
  C: Record<string, string>
  D: Record<string, boolean>
  PREFIX: Record<string, string[]>
}

export interface ChannelPrefixEntry {
  nick: string
  mode?: string
}

// CHANMODES A-D and PREFIX describe five different value domains. Keeping
// them separate makes their wire rules structural: list entries accumulate,
// settings hold one value, flags hold booleans, and membership statuses follow
// IRC identifier comparison and membership lifecycle.
export class ChannelModes {
  readonly A = new Map<string, string[]>()
  readonly B = new Map<string, string>()
  readonly C = new Map<string, string>()
  readonly D = new Map<string, boolean>()
  readonly PREFIX = new Map<string, string[]>()

  private readonly caseFold: (identifier: string) => string

  constructor(caseFold: (identifier: string) => string) {
    this.caseFold = caseFold
  }

  apply(change: ChannelModeChange): void {
    switch (change.type) {
      case 'A': {
        ChannelModes.applyListChange(this.A, change)
        return
      }
      case 'B': {
        ChannelModes.applySettingChange(this.B, change)
        return
      }
      case 'C': {
        ChannelModes.applySettingChange(this.C, change)
        return
      }
      case 'D': {
        if (change.action === '+') {
          this.D.set(change.mode, true)
        } else {
          this.D.delete(change.mode)
        }
        return
      }
      case 'PREFIX': {
        this.applyPrefixChange(change)
        break
      }
      default: {
        break
      }
    }
  }

  getMemberModes(nick: string): Set<string> {
    const result = new Set<string>()
    for (const [mode, nicks] of this.PREFIX) {
      if (nicks.some((candidate) => this.sameIdentifier(candidate, nick))) {
        result.add(mode)
      }
    }
    return result
  }

  removeMember(nick: string): void {
    for (const [mode, nicks] of this.PREFIX) {
      const remaining = nicks.filter((candidate) => !this.sameIdentifier(candidate, nick))
      if (remaining.length === 0) {
        this.PREFIX.delete(mode)
      } else if (remaining.length !== nicks.length) {
        this.PREFIX.set(mode, remaining)
      }
    }
  }

  renameMember(previousNick: string, nick: string): void {
    for (const [mode, nicks] of this.PREFIX) {
      const index = nicks.findIndex((candidate) => this.sameIdentifier(candidate, previousNick))
      if (index === -1) {
        continue
      }

      const renamed = [...nicks]
      renamed[index] = nick
      this.PREFIX.set(mode, renamed)
    }
  }

  replacePrefixes(entries: readonly ChannelPrefixEntry[]): void {
    this.PREFIX.clear()
    for (const { mode, nick } of entries) {
      if (mode !== undefined) {
        this.apply({ action: '+', argument: nick, mode, type: 'PREFIX' })
      }
    }
  }

  toJSON(): ChannelModesJSON {
    return {
      A: Object.fromEntries([...this.A].map(([mode, values]) => [mode, [...values]])),
      B: Object.fromEntries(this.B),
      C: Object.fromEntries(this.C),
      D: Object.fromEntries(this.D),
      PREFIX: Object.fromEntries([...this.PREFIX].map(([mode, values]) => [mode, [...values]])),
    }
  }

  private static applyListChange(store: Map<string, string[]>, change: ChannelModeChange): void {
    const argument = change.argument ?? ''
    if (change.action === '+') {
      const values = store.get(change.mode)
      if (values === undefined) {
        store.set(change.mode, [argument])
      } else if (!values.includes(argument)) {
        store.set(change.mode, [...values, argument])
      }
      return
    }

    const values = store.get(change.mode)
    if (values === undefined) {
      return
    }

    const remaining = values.filter((value) => value !== argument)
    if (remaining.length === 0) {
      store.delete(change.mode)
    } else if (remaining.length !== values.length) {
      store.set(change.mode, remaining)
    }
  }

  private applyPrefixChange(change: ChannelModeChange): void {
    const nick = change.argument ?? ''
    const nicks = this.PREFIX.get(change.mode)

    if (change.action === '+') {
      if (nicks === undefined) {
        this.PREFIX.set(change.mode, [nick])
      } else if (!nicks.some((candidate) => this.sameIdentifier(candidate, nick))) {
        this.PREFIX.set(change.mode, [...nicks, nick])
      }
      return
    }

    if (nicks === undefined) {
      return
    }

    const remaining = nicks.filter((candidate) => !this.sameIdentifier(candidate, nick))
    if (remaining.length === 0) {
      this.PREFIX.delete(change.mode)
    } else if (remaining.length !== nicks.length) {
      this.PREFIX.set(change.mode, remaining)
    }
  }

  private static applySettingChange(store: Map<string, string>, change: ChannelModeChange): void {
    if (change.action === '+') {
      store.set(change.mode, change.argument ?? '')
    } else {
      store.delete(change.mode)
    }
  }

  private sameIdentifier(left: string, right: string): boolean {
    return this.caseFold(left) === this.caseFold(right)
  }
}
