export type IrcTags = Record<string, string>

// Canonical parsed protocol shape. This is the message format shared between
// the transport loop and the higher-level runtime logic.
export interface IrcMessage {
  command: string
  params: string[]
  source?: string
  tags: IrcTags
}

// Outbound commands stay intentionally small. Encoding concerns live in the
// transport submodule, not in the runtime coordinator.
export interface IrcCommand {
  command: string
  params: string[]
}
