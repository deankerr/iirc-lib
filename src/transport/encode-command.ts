import type { IrcCommand } from './types'

// Pure outbound processor: canonical command -> IRC line text.
export function encodeCommand(command: IrcCommand): string {
  assertDefinedParams(command)

  if (command.trailing !== true) {
    return buildLine(command.command, command.params)
  }

  if (command.params.length === 0) {
    return command.command.toUpperCase()
  }

  const head = command.params.slice(0, -1)
  const tail = command.params.at(-1) ?? ''

  let line = buildLine(command.command, head)
  line += ` :${tail}`
  return line
}

function buildLine(command: string, params: ReadonlyArray<string>): string {
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
  for (const param of command.params as ReadonlyArray<string | undefined>) {
    if (param === undefined) {
      throw new Error(`Invalid IRC command "${command.command}": params must not contain undefined`)
    }
  }
}
