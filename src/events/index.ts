import { commandEnrichers } from './commands'
import { numericEnrichers } from './numerics'

export const allEnrichers = {
  ...commandEnrichers,
  ...numericEnrichers,
}
