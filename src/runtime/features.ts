import { capabilities, connect, identity, isupport, ping, sasl } from './features/index'
import type { Runtime } from './runtime'

export type RuntimeFeature = (runtime: Runtime) => void

export const builtinRuntimeFeatures: RuntimeFeature[] = [
  capabilities,
  connect,
  ping,
  identity,
  isupport,
  sasl,
]
