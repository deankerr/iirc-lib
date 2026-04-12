import type { IrcMessage } from '../transport/types'

export type CapToken = {
  name: string
  value?: string
}

export type CapMessage = {
  subcommand: string
  continuation: boolean
  tokens: CapToken[]
}

export function parseCapMessage(message: IrcMessage): CapMessage | undefined {
  if (message.command !== 'CAP') return undefined

  const subcommand = message.params[1]?.toUpperCase()
  if (!subcommand) return undefined

  const continuation = message.params[2] === '*'
  const list = message.params[continuation ? 3 : 2] ?? ''

  return {
    subcommand,
    continuation,
    tokens: parseCapTokens(list),
  }
}

function parseCapTokens(list: string): CapToken[] {
  if (list.length === 0) return []

  return list
    .split(' ')
    .filter((token) => token.length > 0)
    .map((token) => {
      const equalsIndex = token.indexOf('=')
      if (equalsIndex === -1) {
        return { name: token }
      }

      return {
        name: token.slice(0, equalsIndex),
        value: token.slice(equalsIndex + 1),
      }
    })
}
