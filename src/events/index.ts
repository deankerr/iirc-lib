import { capEnrichers } from './cap'
import { commandEnrichers } from './commands'
import { numericEnrichers } from './numerics'

export const allEnrichers = {
  ...commandEnrichers,
  ...numericEnrichers,
  ...capEnrichers,
}
