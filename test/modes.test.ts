import { describe, expect, test } from 'bun:test'

import { parseChanModes, parseModeChanges, parseNamesReply } from '../src/client/protocol/modes'

describe('parseChanModes', () => {
  test('parses standard CHANMODES string', () => {
    const result = parseChanModes('beI,k,l,imnpst')
    expect(result.list).toEqual(['b', 'e', 'I'])
    expect(result.param).toEqual(['k'])
    expect(result.paramSet).toEqual(['l'])
    expect(result.noParam).toEqual(['i', 'm', 'n', 'p', 's', 't'])
  })

  test('returns empty arrays for undefined', () => {
    const result = parseChanModes(undefined)
    expect(result.list).toEqual([])
    expect(result.param).toEqual([])
    expect(result.paramSet).toEqual([])
    expect(result.noParam).toEqual([])
  })

  test('handles missing categories', () => {
    const result = parseChanModes('b,,l,')
    expect(result.list).toEqual(['b'])
    expect(result.param).toEqual([])
    expect(result.paramSet).toEqual(['l'])
    expect(result.noParam).toEqual([])
  })
})

describe('parseModeChanges', () => {
  const chanModes = parseChanModes('beI,k,l,imnpst')
  const prefixModes = new Set(['o', 'v', 'h'])

  test('parses +o with param', () => {
    const changes = parseModeChanges({
      modeString: '+o',
      params: ['nick'],
      chanModes,
      prefixModes,
    })
    expect(changes).toEqual([{ adding: true, mode: 'o', param: 'nick' }])
  })

  test('parses -o with param', () => {
    const changes = parseModeChanges({
      modeString: '-o',
      params: ['nick'],
      chanModes,
      prefixModes,
    })
    expect(changes).toEqual([{ adding: false, mode: 'o', param: 'nick' }])
  })

  test('parses combined +ov with params', () => {
    const changes = parseModeChanges({
      modeString: '+ov',
      params: ['nick1', 'nick2'],
      chanModes,
      prefixModes,
    })
    expect(changes).toEqual([
      { adding: true, mode: 'o', param: 'nick1' },
      { adding: true, mode: 'v', param: 'nick2' },
    ])
  })

  test('parses channel mode without param', () => {
    const changes = parseModeChanges({
      modeString: '+im',
      params: [],
      chanModes,
      prefixModes,
    })
    expect(changes).toEqual([
      { adding: true, mode: 'i' },
      { adding: true, mode: 'm' },
    ])
  })

  test('parses mixed add/remove', () => {
    const changes = parseModeChanges({
      modeString: '+o-v',
      params: ['nick1', 'nick2'],
      chanModes,
      prefixModes,
    })
    expect(changes).toEqual([
      { adding: true, mode: 'o', param: 'nick1' },
      { adding: false, mode: 'v', param: 'nick2' },
    ])
  })

  test('list mode takes param on add and remove', () => {
    const changes = parseModeChanges({
      modeString: '+b-b',
      params: ['*!*@bad.host', '*!*@other.host'],
      chanModes,
      prefixModes,
    })
    expect(changes).toEqual([
      { adding: true, mode: 'b', param: '*!*@bad.host' },
      { adding: false, mode: 'b', param: '*!*@other.host' },
    ])
  })

  test('paramSet mode takes param only when setting', () => {
    const changes = parseModeChanges({
      modeString: '+l-l',
      params: ['50'],
      chanModes,
      prefixModes,
    })
    expect(changes).toEqual([
      { adding: true, mode: 'l', param: '50' },
      { adding: false, mode: 'l' },
    ])
  })
})

describe('parseNamesReply', () => {
  const prefixMap = new Map([
    ['@', 'o'],
    ['+', 'v'],
    ['%', 'h'],
  ])

  test('parses nicks with prefixes', () => {
    const users = parseNamesReply({ namesStr: '@op +voice regular', prefixMap })
    expect(users).toEqual([
      { nick: 'op', modes: ['o'] },
      { nick: 'voice', modes: ['v'] },
      { nick: 'regular', modes: [] },
    ])
  })

  test('parses multiple prefixes', () => {
    const users = parseNamesReply({ namesStr: '@+nick', prefixMap })
    expect(users).toEqual([{ nick: 'nick', modes: ['o', 'v'] }])
  })

  test('handles empty string', () => {
    const users = parseNamesReply({ namesStr: '', prefixMap })
    expect(users).toEqual([])
  })

  test('handles extra spaces', () => {
    const users = parseNamesReply({ namesStr: 'nick1  nick2', prefixMap })
    expect(users).toEqual([
      { nick: 'nick1', modes: [] },
      { nick: 'nick2', modes: [] },
    ])
  })
})
