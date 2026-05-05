import { connect } from 'node:net'

import { createRuntime } from '../src'
import { FileSinkLogger } from './file-sink-logger'

const HOST = 'localhost'
const PORT = 6667
const NICK = 'iirc-demo'
const CHANNELS = ['#dev', '#dev2']

// Attach the runtime to a local IRC server and print the enriched client event
// stream. This intentionally has no flags: it is a small live-shape probe.
const socket = connect({ host: HOST, port: PORT })
const runtime = createRuntime({ nick: NICK }, socket)
const logger = new FileSinkLogger('./logs')

runtime.transport.on('read', (line) => {
  logger.log('wire.log', `[${FileSinkLogger.localISOString()}] ${line}`)
})

runtime.transport.on('write', (line) => {
  logger.log('wire.log', `[${FileSinkLogger.localISOString()}] [>>>] ${line}`)
})

runtime.on('registered', () => {
  for (const channel of CHANNELS) {
    runtime.send('JOIN', channel)
  }
})

runtime.on('error', (error) => {
  console.error(error)
})

runtime.on('close', () => {
  console.error('Connection closed')
  // void logger.end()
})

socket.on('connect', () => {
  runtime.register()
})
