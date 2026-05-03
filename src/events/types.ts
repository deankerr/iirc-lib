// Injected into every enricher. Reads params sequentially.
// req() — next param, throws if missing or empty.
// opt() — next param, returns undefined if missing.
// rest() — all remaining params as an array, consumes them.
export type EnricherCtx = {
  req: () => string
  opt: () => string | undefined
  rest: () => string[]
}
