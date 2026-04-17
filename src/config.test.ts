import { describe, expect, test } from 'bun:test'
import { z } from 'zod'

import { resolveConfig } from './config'

describe('resolveConfig', () => {
  test('fills defaults for optional fields', () => {
    const config = resolveConfig({ nick: 'bot' })

    expect(config.nick).toBe('bot')
    expect(config.user).toBe('bot')
    expect(config.realname).toBe('bot')
    expect(config.password).toBeUndefined()
    expect(config.sendDelayMs).toBe(1500)
    expect(config.requestedCapabilities).toEqual(['message-tags'])
    expect(config.sasl).toBeUndefined()
  })

  test('preserves explicit values over defaults', () => {
    const config = resolveConfig({
      nick: 'mybot',
      user: 'botuser',
      realname: 'My Bot',
      password: 'secret',
      sendDelayMs: 200,
      sasl: { username: 'me', password: 'pw' },
    })

    expect(config.nick).toBe('mybot')
    expect(config.user).toBe('botuser')
    expect(config.realname).toBe('My Bot')
    expect(config.password).toBe('secret')
    expect(config.sendDelayMs).toBe(200)
    expect(config.requestedCapabilities).toEqual(['message-tags', 'sasl'])
    expect(config.sasl).toEqual({ username: 'me', password: 'pw' })
  })

  test('normalises whitespace-only nick to error', () => {
    expect(() => resolveConfig({ nick: '  ' })).toThrow(z.ZodError)
  })

  test('throws on empty nick', () => {
    expect(() => resolveConfig({ nick: '' })).toThrow(z.ZodError)
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
    expect(() => resolveConfig({ nick: 'bot', sendDelayMs: -1 })).toThrow(z.ZodError)
  })

  test('accepts sendDelayMs of 0', () => {
    const config = resolveConfig({ nick: 'bot', sendDelayMs: 0 })
    expect(config.sendDelayMs).toBe(0)
  })

  test('throws when sasl is missing username', () => {
    expect(() => resolveConfig({ nick: 'bot', sasl: { username: '', password: 'pw' } })).toThrow(
      z.ZodError,
    )
  })

  test('throws when sasl is missing password', () => {
    expect(() => resolveConfig({ nick: 'bot', sasl: { username: 'me', password: '' } })).toThrow(
      z.ZodError,
    )
  })

  test('auto-adds sasl capability when sasl config is provided', () => {
    const config = resolveConfig({
      nick: 'bot',
      sasl: { username: 'me', password: 'pw' },
    })
    expect(config.requestedCapabilities).toContain('sasl')
  })

  test('does not duplicate sasl capability if already in defaults', () => {
    const config = resolveConfig({
      nick: 'bot',
      sasl: { username: 'me', password: 'pw' },
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
      user: '  user  ',
      realname: '  My Bot  ',
    })
    expect(config.nick).toBe('bot')
    expect(config.user).toBe('user')
    expect(config.realname).toBe('My Bot')
  })

  test('includes structured zod issues on validation error', () => {
    try {
      resolveConfig({ nick: '' })
    } catch (error) {
      expect(error).toBeInstanceOf(z.ZodError)
      const zodError = error as z.ZodError
      expect(zodError.issues.length).toBeGreaterThan(0)
      expect(zodError.issues.some((i) => i.message.includes('nick is required'))).toBe(true)
    }
  })

  test('aggregates multiple validation errors', () => {
    try {
      resolveConfig({ nick: '', sendDelayMs: -5 })
    } catch (error) {
      expect(error).toBeInstanceOf(z.ZodError)
      const issues = (error as z.ZodError).issues
      // Empty nick and negative sendDelayMs should both appear.
      expect(issues.length).toBeGreaterThanOrEqual(2)
    }
  })
})