import { describe, expect, test } from 'bun:test'

import { createMockTransport } from '../mock-transport'
import { createRuntime } from '../runtime'

function createClient() {
  const transport = createMockTransport()
  const runtime = createRuntime({ nick: 'bot', sendDelayMs: 0 }, transport.stream)
  runtime.register()
  transport.sentLines.length = 0
  return { runtime, transport }
}

describe('channelTracker', () => {
  describe('membership', () => {
    test('JOIN creates channel and adds member', () => {
      const { runtime, transport } = createClient()
      transport.receive(':alice!u@h JOIN #test')

      const channel = runtime.channels.get('#test')
      expect(channel).toBeDefined()
      expect(channel?.members.has('alice')).toBe(true)
    })

    test('self JOIN sets joined flag', () => {
      const { runtime, transport } = createClient()
      transport.receive(':bot!u@h JOIN #test')

      expect(runtime.channels.get('#test')?.joined).toBe(true)
    })

    test('PART removes member', () => {
      const { runtime, transport } = createClient()
      transport.receive(':alice!u@h JOIN #test')
      transport.receive(':alice!u@h PART #test')

      expect(runtime.channels.get('#test')?.members.has('alice')).toBe(false)
    })

    test('self PART clears joined flag', () => {
      const { runtime, transport } = createClient()
      transport.receive(':bot!u@h JOIN #test')
      transport.receive(':bot!u@h PART #test')

      expect(runtime.channels.get('#test')?.joined).toBe(false)
    })

    test('QUIT removes member from all channels', () => {
      const { runtime, transport } = createClient()
      transport.receive(':alice!u@h JOIN #one')
      transport.receive(':alice!u@h JOIN #two')
      transport.receive(':alice!u@h QUIT :bye')

      expect(runtime.channels.get('#one')?.members.has('alice')).toBe(false)
      expect(runtime.channels.get('#two')?.members.has('alice')).toBe(false)
    })

    test('self QUIT clears joined flag on all channels', () => {
      const { runtime, transport } = createClient()
      transport.receive(':bot!u@h JOIN #one')
      transport.receive(':bot!u@h JOIN #two')
      transport.receive(':bot!u@h QUIT')

      expect(runtime.channels.get('#one')?.joined).toBe(false)
      expect(runtime.channels.get('#two')?.joined).toBe(false)
    })

    test('KICK removes member', () => {
      const { runtime, transport } = createClient()
      transport.receive(':alice!u@h JOIN #test')
      transport.receive(':op!u@h KICK #test alice')

      expect(runtime.channels.get('#test')?.members.has('alice')).toBe(false)
    })

    test('self KICK clears joined flag', () => {
      const { runtime, transport } = createClient()
      transport.receive(':bot!u@h JOIN #test')
      transport.receive(':op!u@h KICK #test bot')

      expect(runtime.channels.get('#test')?.joined).toBe(false)
    })

    test('NICK renames member across all channels', () => {
      const { runtime, transport } = createClient()
      transport.receive(':alice!u@h JOIN #one')
      transport.receive(':alice!u@h JOIN #two')
      transport.receive(':alice!u@h NICK newname')

      expect(runtime.channels.get('#one')?.members.has('alice')).toBe(false)
      expect(runtime.channels.get('#one')?.members.has('newname')).toBe(true)
      expect(runtime.channels.get('#two')?.members.has('newname')).toBe(true)
    })

    test('KILL removes member from all channels', () => {
      const { runtime, transport } = createClient()
      transport.receive(':alice!u@h JOIN #one')
      transport.receive(':alice!u@h JOIN #two')
      transport.receive(':server KILL alice :flood')

      expect(runtime.channels.get('#one')?.members.has('alice')).toBe(false)
      expect(runtime.channels.get('#two')?.members.has('alice')).toBe(false)
    })
  })

  describe('NAMES list', () => {
    test('RPL_NAMREPLY + RPL_ENDOFNAMES populates members', () => {
      const { runtime, transport } = createClient()
      transport.receive(':server 353 bot = #test :alice bob')
      transport.receive(':server 366 bot #test :End of names')

      const channel = runtime.channels.get('#test')
      expect(channel?.members.has('alice')).toBe(true)
      expect(channel?.members.has('bob')).toBe(true)
    })

    test('@ prefix in NAMES sets op mode on member', () => {
      const { runtime, transport } = createClient()
      transport.receive(':server 353 bot = #test :@alice bob')
      transport.receive(':server 366 bot #test :End of names')

      const channel = runtime.channels.get('#test')
      expect(channel?.modes.PREFIX.get('o')).toEqual(['alice'])
      expect(channel?.modes.PREFIX.has('o')).toBe(true)
      expect([...(channel?.getMemberModes('alice') ?? [])]).toContain('o')
    })

    test('+ prefix in NAMES sets voice mode on member', () => {
      const { runtime, transport } = createClient()
      transport.receive(':server 353 bot = #test :+alice')
      transport.receive(':server 366 bot #test :End of names')

      expect(runtime.channels.get('#test')?.modes.PREFIX.get('v')).toEqual(['alice'])
    })

    test('unprefixed nicks have no modes', () => {
      const { runtime, transport } = createClient()
      transport.receive(':server 353 bot = #test :alice')
      transport.receive(':server 366 bot #test :End of names')

      expect(runtime.channels.get('#test')?.getMemberModes('alice').size).toBe(0)
    })

    test('multiple RPL_NAMREPLY batches before RPL_ENDOFNAMES', () => {
      const { runtime, transport } = createClient()
      transport.receive(':server 353 bot = #test :alice bob')
      transport.receive(':server 353 bot = #test :charlie')
      transport.receive(':server 366 bot #test :End of names')

      const channel = runtime.channels.get('#test')
      expect(channel?.members.has('alice')).toBe(true)
      expect(channel?.members.has('bob')).toBe(true)
      expect(channel?.members.has('charlie')).toBe(true)
    })

    test('RPL_ENDOFNAMES replaces previous member list', () => {
      const { runtime, transport } = createClient()
      transport.receive(':server 353 bot = #test :alice')
      transport.receive(':server 366 bot #test :End of names')
      transport.receive(':server 353 bot = #test :bob')
      transport.receive(':server 366 bot #test :End of names')

      const channel = runtime.channels.get('#test')
      expect(channel?.members.has('alice')).toBe(false)
      expect(channel?.members.has('bob')).toBe(true)
    })

    test('RPL_ENDOFNAMES replaces prefix modes from previous list', () => {
      const { runtime, transport } = createClient()
      transport.receive(':server 353 bot = #test :@alice')
      transport.receive(':server 366 bot #test :End of names')
      transport.receive(':server 353 bot = #test :bob')
      transport.receive(':server 366 bot #test :End of names')

      // alice had op from first NAMES, should be gone after second
      expect(runtime.channels.get('#test')?.modes.PREFIX.has('o')).toBe(false)
    })
  })

  // Protocol claims:
  // - Type A holds a list; entries accumulate and the key disappears with the final entry.
  // - Type B holds one setting and consumes its wire argument on both + and -.
  // - Type C holds one setting, consuming an argument only on +.
  // - Type D is a boolean and consumes no argument.
  // - ISUPPORT assigns arbitrary mode letters to these stores; letters are not policy.
  describe('channel modes via MODE', () => {
    test('type D (boolean) mode set and unset', () => {
      const { runtime, transport } = createClient()
      transport.receive(':bot!u@h JOIN #test')
      transport.receive(':server MODE #test +m')

      expect(runtime.channels.get('#test')?.modes.D.get('m')).toBe(true)

      transport.receive(':server MODE #test -m')
      expect(runtime.channels.get('#test')?.modes.D.has('m')).toBe(false)
    })

    test('type B (setting) mode set and unset', () => {
      const { runtime, transport } = createClient()
      transport.receive(':bot!u@h JOIN #test')
      transport.receive(':server MODE #test +k hunter2')

      expect(runtime.channels.get('#test')?.modes.B.get('k')).toBe('hunter2')

      transport.receive(':server MODE #test -k *')
      expect(runtime.channels.get('#test')?.modes.B.has('k')).toBe(false)
    })

    test('type C (limit) mode set and unset', () => {
      const { runtime, transport } = createClient()
      transport.receive(':bot!u@h JOIN #test')
      transport.receive(':server MODE #test +l 50')

      expect(runtime.channels.get('#test')?.modes.C.get('l')).toBe('50')

      // type C has no argument when unset
      transport.receive(':server MODE #test -l')
      expect(runtime.channels.get('#test')?.modes.C.has('l')).toBe(false)
    })

    test('type A (list) mode accumulates entries', () => {
      const { runtime, transport } = createClient()
      transport.receive(':bot!u@h JOIN #test')
      transport.receive(':server MODE #test +b *!*@bad.host')
      transport.receive(':server MODE #test +b spammer!*@*')

      const bans = runtime.channels.get('#test')?.modes.A.get('b')
      expect(bans).toEqual(['*!*@bad.host', 'spammer!*@*'])
    })

    test('type A (list) mode removes specific entry', () => {
      const { runtime, transport } = createClient()
      transport.receive(':bot!u@h JOIN #test')
      transport.receive(':server MODE #test +b *!*@bad.host')
      transport.receive(':server MODE #test +b spammer!*@*')
      transport.receive(':server MODE #test -b *!*@bad.host')

      const bans = runtime.channels.get('#test')?.modes.A.get('b')
      expect(bans).toEqual(['spammer!*@*'])
    })

    test('type A removes the store entry with its final list value', () => {
      const { runtime, transport } = createClient()
      transport.receive(':bot!u@h JOIN #test')
      transport.receive(':server MODE #test +b *!*@bad.host')
      transport.receive(':server MODE #test -b *!*@bad.host')

      expect(runtime.channels.get('#test')?.modes.A.has('b')).toBe(false)
    })

    test('multiple modes in one modestring', () => {
      const { runtime, transport } = createClient()
      transport.receive(':bot!u@h JOIN #test')
      // +m (type D, no arg), +b (type A, arg), +s (type D, no arg)
      transport.receive(':server MODE #test +mbs *!*@bad.host')

      const channel = runtime.channels.get('#test')
      expect(channel?.modes.D.get('m')).toBe(true)
      expect(channel?.modes.A.get('b')).toEqual(['*!*@bad.host'])
      expect(channel?.modes.D.get('s')).toBe(true)
    })

    test('mixed add/remove in one modestring', () => {
      const { runtime, transport } = createClient()
      transport.receive(':bot!u@h JOIN #test')
      transport.receive(':server MODE #test +mn')
      // Remove m, add key, remove n — the example from the docs
      transport.receive(':server MODE #test -m+k-n hunter2')

      const channel = runtime.channels.get('#test')
      expect(channel?.modes.D.has('m')).toBe(false)
      expect(channel?.modes.B.get('k')).toBe('hunter2')
      expect(channel?.modes.D.has('n')).toBe(false)
    })

    test('user MODE message is ignored', () => {
      const { runtime, transport } = createClient()
      transport.receive(':server MODE bot +i')

      // No channel should have been created
      expect(runtime.channels.get('bot')).toBeUndefined()
    })

    test('ISUPPORT routes arbitrary mode letters into their advertised stores', () => {
      const { runtime, transport } = createClient()
      transport.receive(':server 005 bot CHANMODES=x,y,z,w PREFIX=(p)! :supported')
      transport.receive(':bot!u@h JOIN #test')
      transport.receive(':server MODE #test +xyzwp list setting conditional alice')

      const modes = runtime.channels.get('#test')?.modes
      expect(modes?.A.get('x')).toEqual(['list'])
      expect(modes?.B.get('y')).toBe('setting')
      expect(modes?.C.get('z')).toBe('conditional')
      expect(modes?.D.get('w')).toBe(true)
      expect(modes?.PREFIX.get('p')).toEqual(['alice'])
    })
  })

  // Membership-prefix claims:
  // - PREFIX values are IRC identifiers, not opaque channel-mode arguments.
  // - Departure removes only that member and deletes an empty PREFIX entry.
  // - NICK and CASEMAPPING apply to PREFIX values without touching types A-D.
  describe('prefix (member) modes via MODE', () => {
    test('+o gives op to member', () => {
      const { runtime, transport } = createClient()
      transport.receive(':alice!u@h JOIN #test')
      transport.receive(':server MODE #test +o alice')

      const channel = runtime.channels.get('#test')
      expect(channel?.modes.PREFIX.get('o')).toEqual(['alice'])
      expect([...(channel?.getMemberModes('alice') ?? [])]).toContain('o')
    })

    test('-o removes op from member', () => {
      const { runtime, transport } = createClient()
      transport.receive(':alice!u@h JOIN #test')
      transport.receive(':server MODE #test +o alice')
      transport.receive(':server MODE #test -o alice')

      expect(runtime.channels.get('#test')?.modes.PREFIX.has('o')).toBe(false)
    })

    test('getMemberModes returns all prefix modes for a member', () => {
      const { runtime, transport } = createClient()
      transport.receive(':alice!u@h JOIN #test')
      transport.receive(':server MODE #test +o alice')
      transport.receive(':server MODE #test +v alice')

      const modes = runtime.channels.get('#test')?.getMemberModes('alice')
      expect(modes?.has('o')).toBe(true)
      expect(modes?.has('v')).toBe(true)
    })

    test('PART removes the final holder and the empty PREFIX entry', () => {
      const { runtime, transport } = createClient()
      transport.receive(':alice!u@h JOIN #test')
      transport.receive(':server MODE #test +o alice')
      transport.receive(':alice!u@h PART #test')

      expect(runtime.channels.get('#test')?.modes.PREFIX.has('o')).toBe(false)
    })

    test('removing one holder preserves the other PREFIX holders', () => {
      const { runtime, transport } = createClient()
      transport.receive(':alice!u@h JOIN #test')
      transport.receive(':bob!u@h JOIN #test')
      transport.receive(':server MODE #test +oo alice bob')
      transport.receive(':alice!u@h PART #test')

      expect(runtime.channels.get('#test')?.modes.PREFIX.get('o')).toEqual(['bob'])
    })

    test('PREFIX membership follows IRC case mapping on removal', () => {
      const { runtime, transport } = createClient()
      transport.receive(':Alice!u@h JOIN #test')
      transport.receive(':server MODE #test +o Alice')
      transport.receive(':alice!u@h PART #test')

      expect(runtime.channels.get('#test')?.modes.PREFIX.has('o')).toBe(false)
    })

    test('member removal does not alter opaque type A entries', () => {
      const { runtime, transport } = createClient()
      transport.receive(':alice!u@h JOIN #test')
      transport.receive(':server MODE #test +b alice')
      transport.receive(':alice!u@h PART #test')

      expect(runtime.channels.get('#test')?.modes.A.get('b')).toEqual(['alice'])
    })

    test('member modes follow NICK rename', () => {
      const { runtime, transport } = createClient()
      transport.receive(':alice!u@h JOIN #test')
      transport.receive(':server MODE #test +o alice')
      transport.receive(':alice!u@h NICK ael')

      const channel = runtime.channels.get('#test')
      expect(channel?.modes.PREFIX.get('o')).toEqual(['ael'])
    })
  })

  describe('RPL_CHANNELMODEIS', () => {
    test('sets channel modes from query response', () => {
      const { runtime, transport } = createClient()
      transport.receive(':bot!u@h JOIN #test')
      transport.receive(':server 324 bot #test +nst')

      const channel = runtime.channels.get('#test')
      expect(channel?.modes.D.get('n')).toBe(true)
      expect(channel?.modes.D.get('s')).toBe(true)
      expect(channel?.modes.D.get('t')).toBe(true)
    })

    test('sets mode with argument from query response', () => {
      const { runtime, transport } = createClient()
      transport.receive(':bot!u@h JOIN #test')
      transport.receive(':server 324 bot #test +nk hunter2')

      expect(runtime.channels.get('#test')?.modes.B.get('k')).toBe('hunter2')
    })
  })

  describe('RPL_CREATIONTIME', () => {
    test('sets createdAt on channel', () => {
      const { runtime, transport } = createClient()
      transport.receive(':server 329 bot #test 1620807422')

      expect(runtime.channels.get('#test')?.createdAt).toBe('1620807422')
    })
  })

  describe('topic', () => {
    test('TOPIC message sets topic text', () => {
      const { runtime, transport } = createClient()
      transport.receive(':bot!u@h JOIN #test')
      transport.receive(':alice!u@h TOPIC #test :hello world')

      expect(runtime.channels.get('#test')?.topic?.text).toBe('hello world')
    })

    test('TOPIC message with empty string clears topic', () => {
      const { runtime, transport } = createClient()
      transport.receive(':bot!u@h JOIN #test')
      transport.receive(':alice!u@h TOPIC #test :some topic')
      transport.receive(':alice!u@h TOPIC #test :')

      expect(runtime.channels.get('#test')?.topic).toBeUndefined()
    })

    test('RPL_TOPIC sets topic text', () => {
      const { runtime, transport } = createClient()
      transport.receive(':server 332 bot #test :the topic text')

      expect(runtime.channels.get('#test')?.topic?.text).toBe('the topic text')
    })

    test('RPL_NOTOPIC clears topic', () => {
      const { runtime, transport } = createClient()
      transport.receive(':server 332 bot #test :initial topic')
      transport.receive(':server 331 bot #test :No topic is set')

      expect(runtime.channels.get('#test')?.topic).toBeUndefined()
    })

    test('RPL_TOPICWHOTIME sets topic metadata', () => {
      const { runtime, transport } = createClient()
      transport.receive(':server 332 bot #test :the topic')
      transport.receive(':server 333 bot #test alice 1620000000')

      const topic = runtime.channels.get('#test')?.topic
      expect(topic?.setBy).toBe('alice')
      expect(topic?.setAt).toBe('1620000000')
    })

    test('TOPIC message sets setBy and setAt', () => {
      const { runtime, transport } = createClient()
      transport.receive(':bot!u@h JOIN #test')
      transport.receive(':alice!u@h TOPIC #test :new topic')

      const topic = runtime.channels.get('#test')?.topic
      expect(topic?.text).toBe('new topic')
      expect(topic?.setBy).toBe('alice')
      expect(topic?.setAt).toBeDefined()
    })
  })
})
