import { identity, isupport, ping, connect } from './features/index'
import type { Runtime } from './runtime'

export type RuntimeFeature = (runtime: Runtime) => void

export const builtinRuntimeFeatures: RuntimeFeature[] = [connect, ping, identity, isupport]
