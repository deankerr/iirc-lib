import { identity, isupport, ping, registration } from './features/index'
import type { Runtime } from './runtime'

export type RuntimeFeature = (runtime: Runtime) => void

export const builtinRuntimeFeatures: RuntimeFeature[] = [registration, ping, identity, isupport]
