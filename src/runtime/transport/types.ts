export type IrcTags = Record<string, string>

// Canonical parsed protocol shape. This is the message format shared between
// the transport loop and the higher-level runtime logic.
export type IrcMessage = {
  tags?: IrcTags
  source?: string
  command: string
  params: string[]
}

// Outbound commands stay intentionally small. Encoding concerns live in the
// transport submodule, not in the runtime coordinator.
export type IrcCommand = {
  command: string
  params: string[]
  trailing?: boolean
}
