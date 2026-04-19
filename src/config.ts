import { z } from 'zod'

// --- Input schema ---
// Lightweight parsing for what the consumer supplies. Trims whitespace and
// normalises empty strings to undefined, but defers strict validation to the
// runtime schema so that fallback logic (e.g. nick → user) has a chance to
// run first.

const zStringTrim = z
  .string()
  .trim()
  .transform((v) => (v === '' ? undefined : v))

const runtimeInputConfigSchema = z.object({
  nick: z.string().trim(),
  password: zStringTrim.optional(),
  realname: zStringTrim.optional(),
  sasl: z
    .object({
      password: z.string(),
      username: z.string().trim(),
    })
    .optional(),
  sendDelayMs: z.number().optional(),
  user: zStringTrim.optional(),
})

export type RuntimeInputConfig = z.input<typeof runtimeInputConfigSchema>

// --- Runtime schema ---
// Strict validation on the fully-resolved config. Catches both invalid user
// input and bugs in our own resolution logic.

const saslSchema = z.object({
  password: z.string().min(1, 'sasl.password is required when sasl is configured'),
  username: z.string().min(1, 'sasl.username is required when sasl is configured'),
})

export type SaslConfig = z.infer<typeof saslSchema>

const runtimeConfigSchema = z.object({
  nick: z.string().min(1, 'nick is required and must be non-empty'),
  password: z.string().optional(),
  realname: z.string().min(1, 'realname is required and must be non-empty'),
  requestedCapabilities: z.array(z.string()),
  sasl: saslSchema.optional(),
  sendDelayMs: z.number().nonnegative('sendDelayMs must be non-negative'),
  user: z.string().min(1, 'user is required and must be non-empty'),
})

export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>

const DEFAULT_DELAYMS = 1500
const DEFAULT_CAPABILITIES = ['message-tags']

export function resolveConfig(input: RuntimeInputConfig): RuntimeConfig {
  // Light parse: trim and normalise incoming values.
  const parsed = runtimeInputConfigSchema.parse(input)

  // Resolve defaults that depend on other fields.
  const { nick } = parsed
  const user = parsed.user ?? nick
  const realname = parsed.realname ?? nick

  const config: RuntimeConfig = {
    nick,
    password: parsed.password,
    realname,
    requestedCapabilities: [...DEFAULT_CAPABILITIES],
    sendDelayMs: parsed.sendDelayMs ?? DEFAULT_DELAYMS,
    user,
    ...(parsed.sasl ? { sasl: parsed.sasl } : {}),
  }

  // Auto-include 'sasl' capability when SASL auth is configured.
  if (config.sasl && !config.requestedCapabilities.includes('sasl')) {
    config.requestedCapabilities.push('sasl')
  }

  // Strict validation on the fully-resolved config.
  return runtimeConfigSchema.parse(config)
}
