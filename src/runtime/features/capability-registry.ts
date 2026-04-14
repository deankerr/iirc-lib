// Capability registry for the built-in runtime features.
// This is intentionally small and explicit so the negotiated CAP surface is
// easy to inspect without spelunking feature installation order.

export const capabilityRegistry = {
  coreMetadata: ['message-tags', 'server-time', 'echo-message'],
  presence: ['account-notify', 'account-tag', 'extended-join', 'away-notify', 'chghost'],
  namesAndMembership: ['multi-prefix', 'userhost-in-names'],
} as const

export const builtinCapabilities = [
  ...capabilityRegistry.coreMetadata,
  ...capabilityRegistry.presence,
  ...capabilityRegistry.namesAndMembership,
] as const

export type BuiltinCapability = (typeof builtinCapabilities)[number]
