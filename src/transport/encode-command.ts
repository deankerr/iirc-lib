import type { IrcCommand } from './types'

// Pure outbound processor: canonical command -> IRC line text.
export function encodeCommand(command: IrcCommand): string {
  assertDefinedParams(command)
  const line = buildLine(command.command, command.params)

  // CR, LF, and NUL can never appear inside an IRC message. CR/LF delimit lines,
  // so an embedded one would split our single command into two — the classic IRC
  // command-injection vector — and NUL is outside the protocol's octet set. We
  // truncate at the first occurrence and emit the valid prefix, matching
  // WeeChat's outbound behaviour. This guarantees framing integrity: one command
  // is always exactly one message on the wire, whatever the caller placed in a
  // param. It does not guarantee semantic fidelity of the params themselves —
  // see the positional contract on Runtime.send().
  const controlIndex = firstControlIndex(line)
  return controlIndex === -1 ? line : line.slice(0, controlIndex)
}

// Index of the first CR (0x0D), LF (0x0A), or NUL (0x00), or -1 if none.
function firstControlIndex(line: string): number {
  for (let index = 0; index < line.length; index += 1) {
    const code = line.codePointAt(index)
    if (code === 0x0d || code === 0x0a || code === 0x00) {
      return index
    }
  }
  return -1
}

function buildLine(command: string, params: readonly string[]): string {
  let line = command.toUpperCase()
  const lastDefinedIndex = params.length - 1

  for (const [index, param] of params.entries()) {
    const needsTrailing =
      index === lastDefinedIndex &&
      (param.length === 0 || param.includes(' ') || param.startsWith(':'))

    line += needsTrailing ? ` :${param}` : ` ${param}`
  }

  return line
}

function assertDefinedParams(command: IrcCommand): void {
  for (const param of command.params as readonly (string | undefined)[]) {
    if (param === undefined) {
      throw new Error(`Invalid IRC command "${command.command}": params must not contain undefined`)
    }
  }
}
