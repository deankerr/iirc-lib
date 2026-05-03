import { connect } from 'node:net'

import { createRuntime } from '../src'

const HOST = 'localhost'
const PORT = 6667
const NICK = 'iirc-demo'
const CHANNEL = '#dev'

// Attach the runtime to a local IRC server and print the enriched client event
// stream. This intentionally has no flags: it is a small live-shape probe.
const socket = connect({ host: HOST, port: PORT })
const runtime = createRuntime({ nick: NICK }, socket)

runtime.on('registered', () => {
  runtime.send('JOIN', CHANNEL)
})

runtime.on('event', (event) => {
  if (event.command === 'JOIN' && event.from.isSelf) {
    runtime.send('PRIVMSG', CHANNEL, '')
  }

  console.log(event)
})

runtime.on('error', (error) => {
  console.error(error)
})

runtime.on('close', () => {
  console.error('Connection closed')
})

socket.on('connect', () => {
  runtime.register()
})
