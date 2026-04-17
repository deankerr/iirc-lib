import { describe, expect, test } from 'bun:test'

import { encodeCommand } from './encode-command'
import type { IrcCommand, IrcTags } from './types'

type MessageJoinAtoms = {
  tags?: IrcTags
  source?: string
  verb: string
  params?: string[]
}

type MessageJoinFixture = {
  tests: Array<{
    desc?: string
    atoms: MessageJoinAtoms
    matches: string[]
  }>
}

// The outbound encoder currently models only command + params. We still use the
// shared msg-join corpus here, but only for fixture cases that are representable
// by IrcCommand today. Source/tag serialization can be added later with their
// own transport shape and fixture coverage.
const fixture = Bun.YAML.parse(
  await Bun.file(new URL('../../test-data/msg-join.yaml', import.meta.url)).text(),
) as MessageJoinFixture

describe('encodeCommand', () => {
  const supportedCases = fixture.tests.filter((entry) => isRepresentableCommand(entry.atoms))

  test('keeps a meaningful subset of the shared msg-join fixture representable', () => {
    expect(supportedCases.length).toBeGreaterThan(0)
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
