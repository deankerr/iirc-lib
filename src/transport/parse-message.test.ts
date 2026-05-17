import { describe, expect, test } from 'bun:test'

import { parseMessage } from './parse-message'
import type { IrcMessage, IrcTags } from './types'

interface MessageAtoms {
  tags?: IrcTags
  source?: string
  verb: string
  params?: string[]
}

interface MessageSplitFixture {
  tests: {
    input: string
    atoms: MessageAtoms
  }[]
}

// These tests pin our inbound parser to the shared IRC fixture corpus in
// test-data/msg-split.yaml, so future parser changes stay aligned with the
// expected wire-level message shape.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const fixture = Bun.YAML.parse(
  await Bun.file(new URL('../../test-data/msg-split.yaml', import.meta.url)).text(),
) as MessageSplitFixture

describe('parseMessage', () => {
  for (const [index, { input, atoms }] of fixture.tests.entries()) {
    test(`matches msg-split fixture #${index + 1}: ${input}`, () => {
      expect(parseMessage(input)).toEqual(toExpectedMessage(atoms))
    })
  }
})

function toExpectedMessage(atoms: MessageAtoms): IrcMessage {
  const message: IrcMessage = {
    command: atoms.verb.toUpperCase(),
    params: atoms.params ?? [],
    tags: atoms.tags ?? {},
  }

  if (atoms.source !== undefined) {
    message.source = atoms.source
  }

  return message
}
