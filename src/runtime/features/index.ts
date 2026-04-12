import type { Runtime } from '../runtime'
import { installCapabilityFeature } from './capabilities'
import { installIdentityFeature } from './identity'
import { installIsupportFeature } from './isupport'
import { installPingFeature } from './ping'
import { installSaslFeature } from './sasl'
import { installStartupFeature } from './startup'

export type RuntimeFeature = (runtime: Runtime) => void

export function installBuiltinFeatures(runtime: Runtime): void {
  const features: RuntimeFeature[] = [
    installStartupFeature,
    installPingFeature,
    installIdentityFeature,
    installIsupportFeature,
    installCapabilityFeature,
    installSaslFeature,
  ]

  for (const feature of features) {
    runtime.install(feature)
  }
}
