import { identity, isupport, ping, registration } from './features/index'
import type { Runtime } from './runtime'

export const builtinRuntimeFeatures: ((runtime: Runtime) => void)[] = [
  registration,
  ping,
  identity,
  isupport,
]
