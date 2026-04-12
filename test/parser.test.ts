import { describe, expect, test } from 'bun:test'

import { parseMessage, parseUserhost } from '../src/client/protocol/parser'
import msgSplit from './data/msg-split.yaml'
import userhostSplit from './data/userhost-split.yaml'

type MsgSplitTest = {
  input: string
  atoms: {
    tags?: Record<string, string>
    source?: string
    verb: string
    params?: string[]
  }
}

describe('parseMessage', () => {
  const tests = msgSplit.tests as MsgSplitTest[]

  for (const { input, atoms } of tests) {
    test(input.length > 60 ? `${input.slice(0, 60)}...` : input, () => {
      const msg = parseMessage(input)

      expect(msg.command).toBe(atoms.verb.toUpperCase())
      expect(msg.source).toBe(atoms.source)
      expect(msg.params).toEqual(atoms.params ?? [])

      if (atoms.tags) {
        expect(msg.tags).toEqual(atoms.tags)
      } else {
        expect(msg.tags).toBeUndefined()
      }
    })
  }
})

type UserhostTest = {
  source: string
  atoms: {
    nick?: string
    user?: string
    host?: string
  }
}

describe('parseUserhost', () => {
  const tests = userhostSplit.tests as UserhostTest[]

  for (const { source, atoms } of tests) {
    test(source, () => {
      const result = parseUserhost(source)

      expect(result.nick).toBe(atoms.nick ?? '')
      expect(result.user).toBe(atoms.user)
      expect(result.host).toBe(atoms.host)
    })
  }
})
