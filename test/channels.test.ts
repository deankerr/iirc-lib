import { beforeEach, describe, expect, test } from 'bun:test'

import {
  createChannelTracker,
  type ChannelTracker,
  type ChannelTrackerHost,
} from '../src/client/channels'
import { Client } from '../src/client/client'
import { createMockTransport } from '../src/mock-transport'

function createConnectedClient(nick = 'mynick') {
  const mock = createMockTransport()
  const client = new Client({ nick, user: 'test', realname: 'Test', sendDelay: 0 })
  client.connect(mock.stream)
  mock.receive(`:server 001 ${nick} :Welcome`)

  // Wire channel tracker to client
  const host: ChannelTrackerHost = {
    get isupport() {
      return client.isupport
    },
    isSelf(source: string) {
      return client.isSelf(source)
    },
  }
  const tracker = createChannelTracker(host)
  client.on('message', (msg) => tracker.processMessage(msg))
  client.on('close', () => tracker.handleClose())

  return { mock, client, tracker }
}

// Send ISUPPORT for PREFIX and CHANMODES
function sendIsupport(mock: ReturnType<typeof createMockTransport>, nick: string) {
  mock.receive(`:server 005 ${nick} PREFIX=(ohv)@%+ CHANMODES=beI,k,l,imnpst :are supported`)
}

describe('client.channels', () => {
  let mock: ReturnType<typeof createMockTransport>
  let tracker: ChannelTracker

  beforeEach(() => {
    const connected = createConnectedClient()
    mock = connected.mock
    tracker = connected.tracker
  })

  describe('JOIN', () => {
    test('creates channel and adds user on other join', () => {
      mock.receive(':user!u@host JOIN #test')

      const channel = tracker.getChannel('#test')
      expect(channel).toBeDefined()
      expect(channel!.users.has('user')).toBe(true)
    })

    test('marks channel as joined on self join', () => {
      mock.receive(':mynick!u@host JOIN #test')

      const channel = tracker.getChannel('#test')
      expect(channel!.joined).toBe(true)
    })

    test('stores user/host from source', () => {
      mock.receive(':user!~ident@some.host JOIN #test')

      const channel = tracker.getChannel('#test')
      const member = channel!.users.get('user')
      expect(member!.user).toBe('~ident')
      expect(member!.host).toBe('some.host')
    })

    test('clears stale users on self rejoin', () => {
      // First join with other user
      mock.receive(':mynick!u@host JOIN #test')
      mock.receive(':stale!u@host JOIN #test')
      expect(tracker.getChannel('#test')!.users.size).toBe(2)

      // Simulate part + rejoin
      mock.receive(':mynick!u@host PART #test')
      mock.receive(':mynick!u@host JOIN #test')

      // Stale user should be gone
      expect(tracker.getChannel('#test')!.users.has('stale')).toBe(false)
      expect(tracker.getChannel('#test')!.users.has('mynick')).toBe(true)
    })
  })

  describe('PART', () => {
    beforeEach(() => {
      mock.receive(':mynick!u@host JOIN #test')
      mock.receive(':user!u@host JOIN #test')
    })

    test('removes other user from channel', () => {
      mock.receive(':user!u@host PART #test')

      const channel = tracker.getChannel('#test')
      expect(channel!.users.has('user')).toBe(false)
    })

    test('sets joined=false on self part, keeps users', () => {
      mock.receive(':mynick!u@host PART #test :Goodbye')

      const channel = tracker.getChannel('#test')
      expect(channel!.joined).toBe(false)
      // Stale-but-informative: users preserved
      expect(channel!.users.size).toBe(2)
    })
  })

  describe('KICK', () => {
    beforeEach(() => {
      mock.receive(':mynick!u@host JOIN #test')
      mock.receive(':victim!u@host JOIN #test')
    })

    test('removes kicked user', () => {
      mock.receive(':op!u@host KICK #test victim :Bad behavior')

      const channel = tracker.getChannel('#test')
      expect(channel!.users.has('victim')).toBe(false)
    })

    test('sets joined=false when self kicked, keeps users', () => {
      mock.receive(':op!u@host KICK #test mynick :Bye')

      const channel = tracker.getChannel('#test')
      expect(channel!.joined).toBe(false)
      // Stale-but-informative
      expect(channel!.users.size).toBe(2)
    })
  })

  describe('QUIT', () => {
    test('removes user from all channels', () => {
      mock.receive(':user!u@host JOIN #chan1')
      mock.receive(':user!u@host JOIN #chan2')
      mock.receive(':user!u@host QUIT :Bye')

      expect(tracker.getChannel('#chan1')!.users.has('user')).toBe(false)
      expect(tracker.getChannel('#chan2')!.users.has('user')).toBe(false)
    })
  })

  describe('NICK', () => {
    test('updates nick in all channels', () => {
      mock.receive(':user!u@host JOIN #chan1')
      mock.receive(':user!u@host JOIN #chan2')
      mock.receive(':user!u@host NICK newnick')

      expect(tracker.getChannel('#chan1')!.users.has('newnick')).toBe(true)
      expect(tracker.getChannel('#chan1')!.users.has('user')).toBe(false)
      expect(tracker.getChannel('#chan2')!.users.has('newnick')).toBe(true)
    })

    test('preserves user data after rename', () => {
      mock.receive(':user!~ident@host.com JOIN #test')
      mock.receive(':user!~ident@host.com NICK newnick')

      const member = tracker.getChannel('#test')!.users.get('newnick')
      expect(member!.nick).toBe('newnick')
      expect(member!.user).toBe('~ident')
      expect(member!.host).toBe('host.com')
    })

    test('handles self nick change', () => {
      mock.receive(':mynick!u@host JOIN #test')
      mock.receive(':mynick!u@host NICK newnick')

      const channel = tracker.getChannel('#test')
      expect(channel!.users.has('newnick')).toBe(true)
      expect(channel!.users.has('mynick')).toBe(false)
    })
  })

  describe('TOPIC', () => {
    beforeEach(() => {
      mock.receive(':mynick!u@host JOIN #test')
    })

    test('updates channel topic', () => {
      mock.receive(':setter!u@host TOPIC #test :New topic')

      const channel = tracker.getChannel('#test')
      expect(channel!.topic).toBe('New topic')
      expect(channel!.topicSetBy).toBe('setter')
      expect(channel!.topicSetAt).toBeGreaterThan(0)
    })

    test('handles empty topic (unset)', () => {
      mock.receive(':setter!u@host TOPIC #test :')

      const channel = tracker.getChannel('#test')
      expect(channel!.topic).toBe('')
    })
  })

  describe('332 (RPL_TOPIC)', () => {
    test('sets topic from server reply', () => {
      mock.receive(':server 332 mynick #test :Channel topic')

      const channel = tracker.getChannel('#test')
      expect(channel!.topic).toBe('Channel topic')
    })
  })

  describe('333 (RPL_TOPICWHOTIME)', () => {
    test('sets topic metadata', () => {
      mock.receive(':server 332 mynick #test :Topic')
      mock.receive(':server 333 mynick #test setter 1700000000')

      const channel = tracker.getChannel('#test')
      expect(channel!.topicSetBy).toBe('setter')
      expect(channel!.topicSetAt).toBe(1_700_000_000_000)
    })
  })

  describe('MODE', () => {
    beforeEach(() => {
      sendIsupport(mock, 'mynick')
      mock.receive(':mynick!u@host JOIN #test')
      mock.receive(':user!u@host JOIN #test')
    })

    test('adds user prefix mode', () => {
      mock.receive(':op!u@host MODE #test +o user')

      const channel = tracker.getChannel('#test')
      const user = channel!.users.get('user')
      expect(user!.modes).toContain('o')
    })

    test('removes user prefix mode', () => {
      mock.receive(':op!u@host MODE #test +o user')
      mock.receive(':op!u@host MODE #test -o user')

      const channel = tracker.getChannel('#test')
      const user = channel!.users.get('user')
      expect(user!.modes).not.toContain('o')
    })

    test('handles multiple mode changes (+ov)', () => {
      mock.receive(':op!u@host MODE #test +ov user user')

      const channel = tracker.getChannel('#test')
      const user = channel!.users.get('user')
      expect(user!.modes).toContain('o')
      expect(user!.modes).toContain('v')
    })

    test('adds channel mode', () => {
      mock.receive(':op!u@host MODE #test +im')

      const channel = tracker.getChannel('#test')
      expect(channel!.modes).toContain('i')
      expect(channel!.modes).toContain('m')
    })

    test('removes channel mode', () => {
      mock.receive(':op!u@host MODE #test +i')
      mock.receive(':op!u@host MODE #test -i')

      const channel = tracker.getChannel('#test')
      expect(channel!.modes).not.toContain('i')
    })
  })

  describe('353 (RPL_NAMREPLY)', () => {
    beforeEach(() => {
      sendIsupport(mock, 'mynick')
    })

    test('populates channel users with prefixes', () => {
      mock.receive(':server 353 mynick = #test :@op +voice regular')

      const channel = tracker.getChannel('#test')
      expect(channel!.users.size).toBe(3)
      expect(channel!.users.get('op')!.modes).toContain('o')
      expect(channel!.users.get('voice')!.modes).toContain('v')
      expect(channel!.users.get('regular')!.modes).toEqual([])
    })

    test('merges modes with existing users', () => {
      mock.receive(':user!u@host JOIN #test')
      mock.receive(':server 353 mynick = #test :@user')

      const channel = tracker.getChannel('#test')
      const user = channel!.users.get('user')
      expect(user!.modes).toContain('o')
      // Preserves existing user/host data from JOIN
      expect(user!.user).toBe('u')
      expect(user!.host).toBe('host')
    })
  })

  describe('case-insensitive channel lookup', () => {
    test('finds channel regardless of case', () => {
      mock.receive(':mynick!u@host JOIN #TeSt')

      expect(tracker.getChannel('#test')).toBeDefined()
      expect(tracker.getChannel('#TEST')).toBeDefined()
      expect(tracker.getChannel('#TeSt')).toBeDefined()
    })

    test('uses rfc1459 case mapping by default', () => {
      mock.receive(':mynick!u@host JOIN #test[1]')

      expect(tracker.getChannel('#test{1}')).toBeDefined()
    })

    test('case-insensitive nick tracking', () => {
      mock.receive(':User!u@host JOIN #test')

      const channel = tracker.getChannel('#test')
      // rfc1459 fold of "User" is "user"
      expect(channel!.users.has('user')).toBe(true)
    })
  })

  describe('close event', () => {
    test('sets joined=false on all channels, keeps users', () => {
      mock.receive(':mynick!u@host JOIN #chan1')
      mock.receive(':other!u@host JOIN #chan1')
      mock.receive(':mynick!u@host JOIN #chan2')

      mock.close()

      expect(tracker.getChannel('#chan1')!.joined).toBe(false)
      expect(tracker.getChannel('#chan2')!.joined).toBe(false)
      // Users preserved as stale-but-informative
      expect(tracker.getChannel('#chan1')!.users.size).toBe(2)
    })
  })

  describe('clear', () => {
    test('removes all channels', () => {
      mock.receive(':mynick!u@host JOIN #test1')
      mock.receive(':mynick!u@host JOIN #test2')

      tracker.clear()

      expect(tracker.channels.size).toBe(0)
    })
  })
})
