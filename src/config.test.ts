import { describe, expect, test } from 'bun:test'

import { resolveConfig } from './config'

describe('resolveConfig', () => {
  test('fills defaults for optional fields', () => {
    const config = resolveConfig({ nick: 'bot' })

    expect(config.nick).toBe('bot')
    expect(config.user).toBe('bot')
    expect(config.realname).toBe('bot')
    expect(config.password).toBeUndefined()
    expect(config.sendDelayMs).toBe(1500)
    expect(config.requestedCapabilities).toEqual([])
    expect(config.sasl).toBeUndefined()
  })

  test('preserves explicit values over defaults', () => {
    const config = resolveConfig({
      nick: 'mybot',
      password: 'secret',
      realname: 'My Bot',
      sasl: { password: 'pw', username: 'me' },
      sendDelayMs: 200,
      user: 'botuser',
    })

    expect(config.nick).toBe('mybot')
    expect(config.user).toBe('botuser')
    expect(config.realname).toBe('My Bot')
    expect(config.password).toBe('secret')
    expect(config.sendDelayMs).toBe(200)
    expect(config.requestedCapabilities).toEqual(['sasl'])
    expect(config.sasl).toEqual({ password: 'pw', username: 'me' })
  })

  test('normalises whitespace-only nick to error', () => {
    expect(() => resolveConfig({ nick: '  ' })).toThrow('nick is required and must be non-empty')
  })

  test('throws on empty nick', () => {
    expect(() => resolveConfig({ nick: '' })).toThrow('nick is required and must be non-empty')
  })

  test('falls back to nick when user is whitespace-only', () => {
    const config = resolveConfig({ nick: 'bot', user: '  ' })
    expect(config.user).toBe('bot')
  })

  test('falls back to nick when realname is whitespace-only', () => {
    const config = resolveConfig({ nick: 'bot', realname: '  ' })
    expect(config.realname).toBe('bot')
  })

  test('throws on negative sendDelayMs', () => {
    expect(() => resolveConfig({ nick: 'bot', sendDelayMs: -1 })).toThrow(
      'sendDelayMs must be non-negative',
    )
  })

  test('accepts sendDelayMs of 0', () => {
    const config = resolveConfig({ nick: 'bot', sendDelayMs: 0 })
    expect(config.sendDelayMs).toBe(0)
  })

  test('throws when sasl is missing username', () => {
    expect(() => resolveConfig({ nick: 'bot', sasl: { password: 'pw', username: '' } })).toThrow(
      'sasl.username is required when sasl is configured',
    )
  })

  test('throws when sasl is missing password', () => {
    expect(() => resolveConfig({ nick: 'bot', sasl: { password: '', username: 'me' } })).toThrow(
      'sasl.password is required when sasl is configured',
    )
  })

  test('keeps requestedCapabilities in the order given', () => {
    const config = resolveConfig({
      nick: 'bot',
      requestedCapabilities: ['server-time', 'message-tags'],
    })
    expect(config.requestedCapabilities).toEqual(['server-time', 'message-tags'])
  })

  test('does not duplicate a repeated capability', () => {
    const config = resolveConfig({
      nick: 'bot',
      requestedCapabilities: ['message-tags', 'server-time', 'message-tags'],
    })
    expect(config.requestedCapabilities).toEqual(['message-tags', 'server-time'])
  })

  test('trims and drops empty requested capabilities', () => {
    const config = resolveConfig({ nick: 'bot', requestedCapabilities: [' server-time ', '  '] })
    expect(config.requestedCapabilities).toEqual(['server-time'])
  })

  test('auto-adds sasl capability when sasl config is provided', () => {
    const config = resolveConfig({
      nick: 'bot',
      sasl: { password: 'pw', username: 'me' },
    })
    expect(config.requestedCapabilities).toContain('sasl')
  })

  test('does not duplicate sasl capability if already requested', () => {
    const config = resolveConfig({
      nick: 'bot',
      requestedCapabilities: ['sasl'],
      sasl: { password: 'pw', username: 'me' },
    })
    const saslCount = config.requestedCapabilities.filter((c) => c === 'sasl').length
    expect(saslCount).toBe(1)
  })

  test('normalises empty password to undefined', () => {
    const config = resolveConfig({ nick: 'bot', password: '' })
    expect(config.password).toBeUndefined()
  })

  test('normalises whitespace-only password to undefined', () => {
    const config = resolveConfig({ nick: 'bot', password: '   ' })
    expect(config.password).toBeUndefined()
  })

  test('trims nick, user, and realname', () => {
    const config = resolveConfig({
      nick: '  bot  ',
      realname: '  My Bot  ',
      user: '  user  ',
    })
    expect(config.nick).toBe('bot')
    expect(config.user).toBe('user')
    expect(config.realname).toBe('My Bot')
  })
})
