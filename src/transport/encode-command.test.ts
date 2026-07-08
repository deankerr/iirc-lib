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

  // Framing integrity: CR, LF, and NUL are truncated so one command can never
  // become more than one line on the wire, regardless of caller input.
  describe('truncates control characters', () => {
    test('CRLF in the trailing param cannot inject a second command', () => {
      expect(encodeCommand({ command: 'PRIVMSG', params: ['#chan', 'hi\r\nJOIN #evil'] })).toBe(
        'PRIVMSG #chan :hi',
      )
    })

    // No colon here: a param with no space is a plain (middle) param, so the
    // surviving prefix keeps that form. Both are the same value to the server.
    test('a lone LF also truncates', () => {
      expect(encodeCommand({ command: 'PRIVMSG', params: ['#chan', 'hi\nQUIT'] })).toBe(
        'PRIVMSG #chan hi',
      )
    })

    test('a lone CR also truncates', () => {
      expect(encodeCommand({ command: 'PRIVMSG', params: ['#chan', 'hi\rQUIT'] })).toBe(
        'PRIVMSG #chan hi',
      )
    })

    test('NUL truncates', () => {
      expect(encodeCommand({ command: 'PRIVMSG', params: ['#chan', 'a\u0000b'] })).toBe(
        'PRIVMSG #chan a',
      )
    })

    test('a control char in a middle param truncates the whole line there', () => {
      expect(encodeCommand({ command: 'PRIVMSG', params: ['#a\nb', 'hi'] })).toBe('PRIVMSG #a')
    })

    test('a control char in the command truncates', () => {
      expect(encodeCommand({ command: 'QUIT\r\nOPER a b', params: [] })).toBe('QUIT')
    })

    test('a leading control char yields an empty line', () => {
      expect(encodeCommand({ command: '\nPRIVMSG', params: ['#chan', 'hi'] })).toBe('')
    })

    test('leaves control-free lines untouched', () => {
      expect(encodeCommand({ command: 'PRIVMSG', params: ['#chan', 'hello world'] })).toBe(
        'PRIVMSG #chan :hello world',
      )
    })
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
