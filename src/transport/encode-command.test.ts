import { describe, expect, test } from 'bun:test'

import { encodeCommand } from './encode-command'
import type { IrcCommand, IrcTags } from './types'

interface MessageJoinAtoms {
  tags?: IrcTags
  source?: string
  verb: string
  params?: string[]
}

interface MessageJoinFixture {
  tests: {
    desc?: string
    atoms: MessageJoinAtoms
    matches: string[]
  }[]
}

// The outbound encoder currently models only command + params. We still use the
// shared msg-join corpus here, but only for fixture cases that are representable
// by IrcCommand today. Source/tag serialization can be added later with their
// own transport shape and fixture coverage.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const fixture = Bun.YAML.parse(
  await Bun.file(new URL('../../test-data/msg-join.yaml', import.meta.url)).text(),
) as MessageJoinFixture

describe('encodeCommand', () => {
  const supportedCases = fixture.tests.filter((entry) => isRepresentableCommand(entry.atoms))

  test('keeps a meaningful subset of the shared msg-join fixture representable', () => {
    expect(supportedCases.length).toBeGreaterThan(0)
  })

  test('does not force a trailing marker when the last param is a single token', () => {
    expect(
      encodeCommand({
        command: 'CAP',
        params: ['REQ', 'message-tags'],
      }),
    ).toBe('CAP REQ message-tags')
  })

  test('still uses a trailing marker when the last param needs one', () => {
    expect(
      encodeCommand({
        command: 'CAP',
        params: ['REQ', 'message-tags sasl'],
      }),
    ).toBe('CAP REQ :message-tags sasl')
  })

  for (const [index, { desc, atoms, matches }] of supportedCases.entries()) {
    const label = desc ?? atoms.verb

    test(`matches msg-join fixture #${index + 1}: ${label}`, () => {
      const command = toCommand(atoms)
      expect(matches.map(normalizeExpectedLine)).toContain(encodeCommand(command))
    })
  }
})

function isRepresentableCommand(atoms: MessageJoinAtoms): atoms is MessageJoinAtoms & {
  tags?: undefined
  source?: undefined
} {
  return atoms.tags === undefined && atoms.source === undefined
}

function toCommand(atoms: MessageJoinAtoms): IrcCommand {
  return {
    command: atoms.verb,
    params: atoms.params ?? [],
  }
}

function normalizeExpectedLine(line: string): string {
  const [command = '', ...params] = line.split(' ')
  return [command.toUpperCase(), ...params].join(' ')
}
