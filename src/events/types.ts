// Injected into every enricher. Reads params sequentially.
// req() — next param, throws if missing or empty.
// str() — next param as string, throws if missing, allows empty.
// opt() — next param, returns undefined if missing.
// rest() — all remaining params as an array, consumes them.
export type EnricherCtx = {
  req: () => string
  str: () => string
  opt: () => string | undefined
  rest: () => string[]
}
