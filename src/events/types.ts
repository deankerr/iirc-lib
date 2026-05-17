// Injected into every enricher. Reads params sequentially.
// param()    — next middle param; throws if missing (empty is impossible for middle params).
// trailing() — next trailing param; throws if missing, allows empty string.
// optional() — next param; returns undefined if missing.
// rest()     — all remaining params as an array, consumes them.
export interface EnricherCtx {
  param: () => string
  trailing: () => string
  optional: () => string | undefined
  rest: () => string[]
}
