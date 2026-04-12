import { describe, expect, test } from 'bun:test'

import { Client, type ParsedMessage } from '../src/client/client'
import { createMockTransport } from '../src/mock-transport'

function createConnectedClient(nick = 'testbot', opts?: { sendDelay?: number }) {
  const mock = createMockTransport()
  const client = new Client({
    nick,
    user: 'test',
    realname: 'Test Bot',
    sendDelay: opts?.sendDelay ?? 0,
  })
  client.connect(mock.stream)
  mock.receive(`:server 001 ${nick} :Welcome to the test server`)
  return { mock, client }
}

describe('Client connection', () => {
  test('starts in disconnected status', () => {
    const client = new Client({ nick: 'bot', user: 'bot', realname: 'Bot', sendDelay: 0 })
    expect(client.status).toBe('disconnected')
  })

  test('sends NICK and USER on connect', () => {
    const mock = createMockTransport()
    const client = new Client({
      nick: 'bot',
      user: 'myuser',
      realname: 'My Bot',
      sendDelay: 0,
    })

    client.connect(mock.stream)

    expect(mock.sentLines).toContain('NICK bot')
    expect(mock.sentLines).toContain('USER myuser 0 * :My Bot')
  })

  test('sends PASS before NICK when password provided', () => {
    const mock = createMockTransport()
    const client = new Client({
      nick: 'bot',
      user: 'bot',
      realname: 'Bot',
      password: 'secret',
      sendDelay: 0,
    })

    client.connect(mock.stream)

    const passIdx = mock.sentLines.findIndex((l) => l.startsWith('PASS'))
    const nickIdx = mock.sentLines.findIndex((l) => l.startsWith('NICK'))
    expect(passIdx).toBeLessThan(nickIdx)
    expect(mock.sentLines[passIdx]).toBe('PASS secret')
  })

  test('transitions to registering on connect', () => {
    const mock = createMockTransport()
    const client = new Client({ nick: 'bot', user: 'bot', realname: 'Bot', sendDelay: 0 })

    client.connect(mock.stream)

    expect(client.status).toBe('registering')
  })

  test('throws if connect called twice', () => {
    const mock = createMockTransport()
    const client = new Client({ nick: 'bot', user: 'bot', realname: 'Bot', sendDelay: 0 })
    client.connect(mock.stream)

    expect(() => client.connect(mock.stream)).toThrow()
  })
})

describe('Client registration', () => {
  test('transitions to connected on 001', () => {
    const mock = createMockTransport()
    const client = new Client({ nick: 'bot', user: 'bot', realname: 'Bot', sendDelay: 0 })
    client.connect(mock.stream)

    mock.receive(':server 001 bot :Welcome')

    expect(client.status).toBe('connected')
  })

  test('emits registered event on 001', () => {
    const mock = createMockTransport()
    const client = new Client({ nick: 'bot', user: 'bot', realname: 'Bot', sendDelay: 0 })
    let registered = false
    client.on('registered', () => {
      registered = true
    })
    client.connect(mock.stream)

    mock.receive(':server 001 bot :Welcome')

    expect(registered).toBe(true)
  })

  test('updates nick from 001 params', () => {
    const mock = createMockTransport()
    const client = new Client({ nick: 'bot', user: 'bot', realname: 'Bot', sendDelay: 0 })
    client.connect(mock.stream)

    // Server may assign different nick
    mock.receive(':server 001 bot_ :Welcome')

    expect(client.nick).toBe('bot_')
  })

  test('sets serverInfo.host from 001 source', () => {
    const mock = createMockTransport()
    const client = new Client({ nick: 'bot', user: 'bot', realname: 'Bot', sendDelay: 0 })
    client.connect(mock.stream)

    mock.receive(':irc.example.com 001 bot :Welcome')

    expect(client.serverInfo.host).toBe('irc.example.com')
  })

  test('sets serverInfo.version from 004', () => {
    const { mock, client } = createConnectedClient()

    mock.receive(':server 004 testbot server ircd-2.0 abc def')

    expect(client.serverInfo.version).toBe('ircd-2.0')
  })

  test('parses ISUPPORT from 005', () => {
    const { mock, client } = createConnectedClient()

    mock.receive(':server 005 testbot NETWORK=TestNet CASEMAPPING=ascii :are supported')

    expect(client.isupport.network).toBe('TestNet')
    expect(client.isupport.get('CASEMAPPING')).toBe('ascii')
  })
})

describe('Client PING/PONG', () => {
  test('responds to PING with PONG', () => {
    const { mock } = createConnectedClient()
    mock.sentLines.length = 0

    mock.receive('PING :token123')

    expect(mock.sentLines).toContain('PONG token123')
  })

  test('handles PING without token', () => {
    const { mock } = createConnectedClient()
    mock.sentLines.length = 0

    mock.receive('PING')

    // Empty token results in trailing colon per send() logic
    expect(mock.sentLines).toContain('PONG :')
  })
})

describe('Client nick tracking', () => {
  test('updates nick on NICK message for self', () => {
    const { mock, client } = createConnectedClient('oldnick')

    mock.receive(':oldnick!user@host NICK newnick')

    expect(client.nick).toBe('newnick')
  })

  test('does not update nick on NICK message for others', () => {
    const { mock, client } = createConnectedClient('mybot')

    mock.receive(':someone!user@host NICK newsomeone')

    expect(client.nick).toBe('mybot')
  })

  test('nickEqual uses casemapper', () => {
    const { mock, client } = createConnectedClient()
    mock.receive(':server 005 testbot CASEMAPPING=ascii :are supported')

    expect(client.nickEqual('Nick', 'nick')).toBe(true)
    expect(client.nickEqual('[Nick]', '{nick}')).toBe(false) // ascii doesn't fold brackets
  })

  test('isSelf compares with current nick', () => {
    const { client } = createConnectedClient('mybot')

    expect(client.isSelf('mybot')).toBe(true)
    expect(client.isSelf('MYBOT')).toBe(true)
    expect(client.isSelf('other')).toBe(false)
  })
})

describe('Client events', () => {
  test('emits raw for every message', () => {
    const { mock, client } = createConnectedClient()
    const raw: string[] = []
    client.on('raw', (msg) => raw.push(msg.command))

    mock.receive(':server NOTICE * :Hello')
    mock.receive('PING :test')

    expect(raw).toContain('NOTICE')
    expect(raw).toContain('PING')
  })

  test('emits message with enriched ParsedMessage', () => {
    const { mock, client } = createConnectedClient()
    let received: ParsedMessage | undefined
    client.on('message', (msg) => {
      received = msg
    })

    mock.receive(':user!u@h PRIVMSG #chan :hello')

    expect(received?.target).toBe('#chan')
    expect(received?.source).toBe('user!u@h')
  })

  test('emits close on stream close', () => {
    const { mock, client } = createConnectedClient()
    let closed = false
    client.on('close', () => {
      closed = true
    })

    mock.close()

    expect(closed).toBe(true)
    expect(client.status).toBe('disconnected')
  })

  test('emits error on stream error', () => {
    const { mock, client } = createConnectedClient()
    let errorMsg = ''
    client.on('error', (err) => {
      errorMsg = err.message
    })

    mock.error(new Error('Connection reset'))

    expect(errorMsg).toBe('Connection reset')
    expect(client.status).toBe('error')
  })

  test('ERROR command flows through message, not error event', () => {
    const { mock, client } = createConnectedClient()
    let errorEventFired = false
    const messages: ParsedMessage[] = []
    client.on('error', () => {
      errorEventFired = true
    })
    client.on('message', (msg) => messages.push(msg))

    mock.receive('ERROR :Closing connection')

    expect(errorEventFired).toBe(false)
    expect(messages.some((m) => m.command === 'ERROR')).toBe(true)
  })
})

describe('Client target computation', () => {
  test('PRIVMSG to channel targets channel', () => {
    const { mock, client } = createConnectedClient()
    let target: string | undefined
    client.on('message', (msg) => {
      target = msg.target
    })

    mock.receive(':user!u@h PRIVMSG #channel :hello')

    expect(target).toBe('#channel')
  })

  test('PRIVMSG to self targets sender (PM flip)', () => {
    const { mock, client } = createConnectedClient('mybot')
    let target: string | undefined
    client.on('message', (msg) => {
      target = msg.target
    })

    mock.receive(':sender!u@h PRIVMSG mybot :hello')

    expect(target).toBe('sender')
  })

  test('JOIN targets channel', () => {
    const { mock, client } = createConnectedClient()
    let target: string | undefined
    client.on('message', (msg) => {
      target = msg.target
    })

    mock.receive(':user!u@h JOIN #channel')

    expect(target).toBe('#channel')
  })

  test('MODE on channel targets channel', () => {
    const { mock, client } = createConnectedClient()
    let target: string | undefined
    client.on('message', (msg) => {
      target = msg.target
    })

    mock.receive(':op!u@h MODE #channel +o user')

    expect(target).toBe('#channel')
  })

  test('MODE on user targets undefined', () => {
    const { mock, client } = createConnectedClient('mybot')
    let target: string | undefined = 'not-set'
    client.on('message', (msg) => {
      target = msg.target
    })

    mock.receive(':mybot MODE mybot +i')

    expect(target).toBeUndefined()
  })

  test('RPL_TOPIC targets channel', () => {
    const { mock, client } = createConnectedClient()
    let target: string | undefined
    client.on('message', (msg) => {
      target = msg.target
    })

    mock.receive(':server 332 testbot #channel :The topic')

    expect(target).toBe('#channel')
  })

  test('RPL_NAMREPLY targets channel from params[2]', () => {
    const { mock, client } = createConnectedClient()
    let target: string | undefined
    client.on('message', (msg) => {
      target = msg.target
    })

    mock.receive(':server 353 testbot = #channel :user1 user2')

    expect(target).toBe('#channel')
  })

  test('server messages have undefined target', () => {
    const { mock, client } = createConnectedClient()
    let target: string | undefined = 'not-set'
    client.on('message', (msg) => {
      target = msg.target
    })

    // Numeric 251 (RPL_LUSERCLIENT) has no channel routing
    mock.receive(':server 251 testbot :There are 100 users')

    expect(target).toBeUndefined()
  })
})

describe('Client send', () => {
  test('auto-adds trailing for params with spaces', () => {
    const { mock, client } = createConnectedClient()
    mock.sentLines.length = 0

    client.privmsg('#chan', 'hello world')

    expect(mock.sentLines).toContain('PRIVMSG #chan :hello world')
  })

  test('auto-adds trailing for empty params', () => {
    const { mock, client } = createConnectedClient()
    mock.sentLines.length = 0

    client.send('TOPIC', '#chan', '')

    expect(mock.sentLines).toContain('TOPIC #chan :')
  })

  test('auto-adds trailing for params starting with colon', () => {
    const { mock, client } = createConnectedClient()
    mock.sentLines.length = 0

    client.privmsg('#chan', ':)')

    expect(mock.sentLines).toContain('PRIVMSG #chan ::)')
  })
})

describe('Client methods', () => {
  test('join sends JOIN', () => {
    const { mock, client } = createConnectedClient()
    mock.sentLines.length = 0

    client.join('#channel')

    expect(mock.sentLines).toContain('JOIN #channel')
  })

  test('join with key sends JOIN with key', () => {
    const { mock, client } = createConnectedClient()
    mock.sentLines.length = 0

    client.join('#channel', 'secret')

    expect(mock.sentLines).toContain('JOIN #channel secret')
  })

  test('part sends PART', () => {
    const { mock, client } = createConnectedClient()
    mock.sentLines.length = 0

    client.part('#channel', 'Goodbye everyone')

    expect(mock.sentLines).toContain('PART #channel :Goodbye everyone')
  })

  test('quit sends QUIT', () => {
    const { mock, client } = createConnectedClient()
    mock.sentLines.length = 0

    client.quit('Bye for now!')

    expect(mock.sentLines).toContain('QUIT :Bye for now!')
  })

  test('setNick sends NICK', () => {
    const { mock, client } = createConnectedClient()
    mock.sentLines.length = 0

    client.setNick('newnick')

    expect(mock.sentLines).toContain('NICK newnick')
  })
})

describe('Client send queue', () => {
  test('sends immediately with sendDelay: 0', () => {
    const { mock, client } = createConnectedClient('bot', { sendDelay: 0 })
    mock.sentLines.length = 0

    client.privmsg('#chan', 'hello world')
    client.privmsg('#chan', 'goodbye world')

    expect(mock.sentLines).toEqual(['PRIVMSG #chan :hello world', 'PRIVMSG #chan :goodbye world'])
  })

  test('first message is immediate with sendDelay > 0', () => {
    const { mock, client } = createConnectedClient('bot', { sendDelay: 1000 })
    mock.sentLines.length = 0

    client.privmsg('#chan', 'hello world')

    expect(mock.sentLines).toEqual(['PRIVMSG #chan :hello world'])
  })

  test('queues subsequent messages during cooldown', () => {
    const { mock, client } = createConnectedClient('bot', { sendDelay: 1000 })
    mock.sentLines.length = 0

    client.privmsg('#chan', 'hello world')
    client.privmsg('#chan', 'second msg')
    client.privmsg('#chan', 'third msg')

    // Only the first goes immediately
    expect(mock.sentLines).toEqual(['PRIVMSG #chan :hello world'])
  })

  test('drains queued messages after delay', async () => {
    const { mock, client } = createConnectedClient('bot', { sendDelay: 10 })
    mock.sentLines.length = 0

    client.privmsg('#chan', 'hello world')
    client.privmsg('#chan', 'second msg')
    client.privmsg('#chan', 'third msg')

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(mock.sentLines).toEqual([
      'PRIVMSG #chan :hello world',
      'PRIVMSG #chan :second msg',
      'PRIVMSG #chan :third msg',
    ])
  })

  test('PONG bypasses the queue', () => {
    const { mock, client } = createConnectedClient('bot', { sendDelay: 1000 })
    mock.sentLines.length = 0

    // Fill the queue
    client.privmsg('#chan', 'hello world')
    // PONG should go immediately despite cooldown
    client.pong('token')

    expect(mock.sentLines).toEqual(['PRIVMSG #chan :hello world', 'PONG token'])
  })

  test('auto-PONG bypasses the queue', () => {
    const { mock, client } = createConnectedClient('bot', { sendDelay: 1000 })
    mock.sentLines.length = 0

    // Fill the queue
    client.privmsg('#chan', 'hello world')
    // Server PING should trigger immediate PONG
    mock.receive('PING :server123')

    expect(mock.sentLines).toContain('PONG server123')
  })

  test('registration bypasses the queue', () => {
    const mock = createMockTransport()
    const client = new Client({ nick: 'bot', user: 'bot', realname: 'My Bot', sendDelay: 5000 })

    client.connect(mock.stream)

    // All registration commands sent immediately despite sendDelay
    expect(mock.sentLines).toContain('NICK bot')
    expect(mock.sentLines).toContain('USER bot 0 * :My Bot')
  })

  test('clears queue on close', async () => {
    const { mock, client } = createConnectedClient('bot', { sendDelay: 5000 })
    mock.sentLines.length = 0

    client.privmsg('#chan', 'hello world')
    client.privmsg('#chan', 'second msg')
    mock.close()

    // Wait to ensure no queued messages are sent after close
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(mock.sentLines).toEqual(['PRIVMSG #chan :hello world'])
  })
})

describe('Client message splitting', () => {
  test('maxTextBytes uses ISUPPORT fallbacks for prefix', () => {
    const { client } = createConnectedClient('bot')
    // Always uses worst-case: USERLEN(10)+1=11 for user, HOSTLEN(63) for host
    // prefix: 1 + 3(bot) + 1 + 11 + 1 + 63 + 1 = 81
    // overhead: 7(PRIVMSG) + 1 + 5(#test) + 2 = 15
    // available = 510 - 81 - 15 = 414
    const max = client.maxTextBytes('PRIVMSG', '#test')
    expect(max).toBe(414)
  })

  test('maxTextBytes ignores actual self user/host', () => {
    const { mock, client } = createConnectedClient('bot')
    // Even with known self identity, still uses ISUPPORT limits
    mock.receive(':bot!~botuser@myhost.example.com PRIVMSG #chan :hello')

    const max = client.maxTextBytes('PRIVMSG', '#test')
    // Same as without self prefix — always uses worst-case
    expect(max).toBe(414)
  })

  test('maxTextBytes respects ISUPPORT HOSTLEN', () => {
    const { mock, client } = createConnectedClient('bot')
    mock.receive(':server 005 bot HOSTLEN=40 :are supported')

    // prefix: 1 + 3 + 1 + 11(USERLEN+1) + 1 + 40(HOSTLEN) + 1 = 58
    // overhead: 7 + 1 + 5 + 2 = 15
    // available = 510 - 58 - 15 = 437
    const max = client.maxTextBytes('PRIVMSG', '#test')
    expect(max).toBe(437)
  })

  test('privmsg does not split short messages', () => {
    const { mock, client } = createConnectedClient('bot')
    mock.sentLines.length = 0

    client.privmsg('#chan', 'hello world')

    expect(mock.sentLines).toEqual(['PRIVMSG #chan :hello world'])
  })

  test('privmsg splits messages exceeding maxTextBytes', () => {
    const { mock, client } = createConnectedClient('bot')
    mock.sentLines.length = 0

    const max = client.maxTextBytes('PRIVMSG', '#chan')
    const text = 'a'.repeat(max * 2)
    client.privmsg('#chan', text)

    expect(mock.sentLines).toHaveLength(2)
    // Each chunk's text should be within limit
    const prefix = 'PRIVMSG #chan '
    for (const line of mock.sentLines) {
      const msgText = line.slice(prefix.length)
      expect(Buffer.byteLength(msgText, 'utf8')).toBeLessThanOrEqual(max)
    }
    // All text should be preserved
    const reassembled = mock.sentLines.map((l) => l.slice(prefix.length)).join('')
    expect(reassembled).toBe(text)
  })

  test('notice splits messages the same way', () => {
    const { mock, client } = createConnectedClient('bot')
    mock.sentLines.length = 0

    const max = client.maxTextBytes('NOTICE', '#chan')
    const text = 'b'.repeat(max + 10)
    client.notice('#chan', text)

    expect(mock.sentLines).toHaveLength(2)
    expect(mock.sentLines[0]!.startsWith('NOTICE #chan ')).toBe(true)
  })

  test('privmsg respects UTF-8 boundaries when splitting', () => {
    const { mock, client } = createConnectedClient('bot')
    mock.sentLines.length = 0

    const max = client.maxTextBytes('PRIVMSG', '#chan')
    // Fill most of the space with ASCII, then add a multi-byte char near the boundary
    const padding = 'a'.repeat(max - 1)
    const text = padding + 'é' // é is 2 bytes, total = max+1 bytes, forces split

    client.privmsg('#chan', text)

    expect(mock.sentLines).toHaveLength(2)
    // The second chunk should be the complete "é", not a broken byte
    const chunk2 = mock.sentLines[1]!.slice('PRIVMSG #chan '.length)
    expect(chunk2).toBe('é')
  })

  test('privmsg splits at word boundaries', () => {
    const { mock, client } = createConnectedClient('bot')
    mock.sentLines.length = 0

    const max = client.maxTextBytes('PRIVMSG', '#chan')
    // Build a sentence that exceeds the limit with spaces
    const word1 = 'a'.repeat(max - 10)
    const word2 = 'b'.repeat(20)
    const text = `${word1} ${word2}`

    client.privmsg('#chan', text)

    expect(mock.sentLines).toHaveLength(2)
    // Should split at the space, not mid-word
    // word1 has no spaces, so buildLine omits the trailing colon
    expect(mock.sentLines[0]).toBe(`PRIVMSG #chan ${word1}`)
    expect(mock.sentLines[1]).toBe(`PRIVMSG #chan ${word2}`)
  })

  test('QUIT bypasses the queue', () => {
    const { mock, client } = createConnectedClient('bot', { sendDelay: 1000 })
    mock.sentLines.length = 0

    // Fill the queue
    client.privmsg('#chan', 'hello world')
    // QUIT should go immediately despite cooldown
    client.quit('Leaving')

    expect(mock.sentLines).toEqual(['PRIVMSG #chan :hello world', 'QUIT Leaving'])
  })
})

describe('Client nick collision (433)', () => {
  test('sends NICK nick2 on 433 during registration', () => {
    const mock = createMockTransport()
    const client = new Client({ nick: 'bot', user: 'bot', realname: 'Bot', sendDelay: 0 })
    client.connect(mock.stream)

    mock.receive(':server 433 * bot :Nickname is already in use')

    expect(mock.sentLines).toContain('NICK bot2')
    expect(client.nick).toBe('bot2')
  })

  test('sends nick3, nick4 on multiple 433s', () => {
    const mock = createMockTransport()
    const client = new Client({ nick: 'bot', user: 'bot', realname: 'Bot', sendDelay: 0 })
    client.connect(mock.stream)

    mock.receive(':server 433 * bot :Nickname is already in use')
    expect(mock.sentLines).toContain('NICK bot2')

    mock.receive(':server 433 * bot2 :Nickname is already in use')
    expect(mock.sentLines).toContain('NICK bot3')

    mock.receive(':server 433 * bot3 :Nickname is already in use')
    expect(mock.sentLines).toContain('NICK bot4')
    expect(client.nick).toBe('bot4')
  })

  test('resets attempt counter on successful registration', () => {
    const mock = createMockTransport()
    const client = new Client({ nick: 'bot', user: 'bot', realname: 'Bot', sendDelay: 0 })
    client.connect(mock.stream)

    mock.receive(':server 433 * bot :Nickname is already in use')
    expect(client.nick).toBe('bot2')

    mock.receive(':server 001 bot2 :Welcome')
    expect(client.status).toBe('connected')
  })

  test('ignores 433 after registration', () => {
    const { mock } = createConnectedClient('bot')
    const linesBefore = [...mock.sentLines]

    mock.receive(':server 433 bot bot :Nickname is already in use')

    // No new NICK command sent
    const newLines = mock.sentLines.slice(linesBefore.length)
    const nickLines = newLines.filter((l) => l.startsWith('NICK'))
    expect(nickLines).toHaveLength(0)
  })
})
