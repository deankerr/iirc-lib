import { allEnrichers } from './events/index'
import type { EnricherCtx } from './events/types'
import { numericsMap } from './numerics-map'
import type { ParsedSource } from './runtime'
import type { IrcMessage } from './transport'

// Fields automatically added to every event by the dispatcher.
interface EventBase {
  from: ParsedSource
  raw: IrcMessage
}

// Flattens an intersection type into a single object for cleaner type display.
// oxlint-disable-next-line typescript/ban-types
type Simplify<T> = { [K in keyof T]: T[K] } & {}

// Derives the discriminated union from an enricher table. Each key becomes the
// `command` literal; each return type contributes the event's own fields.
type BuildEvents<T extends Record<string, (ctx: EnricherCtx) => object>> = {
  [K in keyof T & string]: Simplify<{ command: K } & ReturnType<T[K]> & EventBase>
}[keyof T & string]

// Fallback for commands with no enricher. Access the original command via raw.command.
export type UnknownIrcEvent = Simplify<{ command: 'UNKNOWN' } & EventBase>

export type IrcEvent = BuildEvents<typeof allEnrichers> | UnknownIrcEvent

export type IrcEventOf<T extends IrcEvent['command'] = IrcEvent['command']> = Extract<
  IrcEvent,
  { command: T }
>

function makeCtx(params: string[]): EnricherCtx {
  let i = 0
  return {
    optional: () => {
      const v = params[i]
      i += 1
      return v
    },
    param: () => {
      const v = params[i]
      i += 1
      if (v === undefined) {
        throw new Error(`irc: required param missing at index ${i - 1}`)
      }
      return v
    },
    rest: () => {
      const v = params.slice(i)
      i = params.length
      return v
    },
    trailing: () => {
      const v = params[i]
      i += 1
      if (v === undefined) {
        throw new Error(`irc: trailing param missing at index ${i - 1}`)
      }
      return v
    },
  }
}

function hasNumericName(command: string): command is keyof typeof numericsMap {
  return Object.hasOwn(numericsMap, command)
}

function resolveCommand(command: string) {
  if (hasNumericName(command)) {
    return numericsMap[command]
  }
  return command
}

function hasEnricher(command: string): command is keyof typeof allEnrichers {
  return Object.hasOwn(allEnrichers, command)
}

export function buildEvent(message: IrcMessage, from: ParsedSource): IrcEvent {
  const command = resolveCommand(message.command)
  if (!hasEnricher(command)) {
    return { command: 'UNKNOWN', from, raw: message }
  }

  const ctx = makeCtx(message.params)
  const fields = allEnrichers[command](ctx)
  // oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
  return { command, ...fields, from, raw: message } as IrcEvent
}
