import { Numeric } from '../numerics'
import type { Runtime } from '../runtime'
import { parseCapMessage } from './cap-message'
import { finishCapabilityNegotiation } from './capabilities'
import {
  getCapabilityState,
  getSaslState,
  setSaslState,
  updateConnectionState,
  updateSaslState,
} from './state'

export function installSaslFeature(runtime: Runtime): void {
  const config = runtime.getConfig().sasl
  if (!config) return

  setSaslState(runtime, {
    mechanism: config.mechanism ?? 'PLAIN',
    availableMechanisms: [],
    started: false,
    waitingForChallenge: false,
    completed: false,
    successful: false,
    failed: false,
    required: config.required ?? false,
  })

  runtime.on('message', (message) => {
    const state = getSaslState(runtime)
    if (!state) return

    const cap = parseCapMessage(message)
    if (cap?.subcommand === 'ACK') {
      const ackedSasl = cap.tokens.some((token) => token.name === 'sasl')
      if (ackedSasl && !state.started && !state.completed) {
        const mechanism = chooseMechanism(runtime, state.mechanism)
        if (!mechanism) {
          failSasl(runtime, `Requested SASL mechanism ${state.mechanism} is not available`)
          finishCapabilityNegotiation(runtime)
          return
        }

        setSaslState(runtime, {
          ...state,
          started: true,
          mechanism,
          waitingForChallenge: true,
        })
        runtime.send('AUTHENTICATE', mechanism)
      }
      return
    }

    if (message.command === 'AUTHENTICATE') {
      if ((message.params[0] ?? '') !== '+') return

      const current = getSaslState(runtime)
      if (!current || !current.started || !current.waitingForChallenge || current.completed) return

      for (const chunk of buildSaslPlainResponses(runtime)) {
        runtime.send('AUTHENTICATE', chunk)
      }

      setSaslState(runtime, {
        ...current,
        waitingForChallenge: false,
      })
      return
    }

    if (message.command === Numeric.RPL_SASLMECHS) {
      const mechanisms = (message.params[1] ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0)

      updateSaslState(runtime, (current) => ({
        ...(current ?? {
          mechanism: config.mechanism ?? 'PLAIN',
          availableMechanisms: [],
          started: false,
          waitingForChallenge: false,
          completed: false,
          successful: false,
          failed: false,
          required: config.required ?? false,
        }),
        availableMechanisms: mechanisms,
      }))
      return
    }

    if (message.command === Numeric.RPL_SASLSUCCESS) {
      const current = getSaslState(runtime)
      if (!current) return

      setSaslState(runtime, {
        ...current,
        completed: true,
        successful: true,
        failed: false,
        waitingForChallenge: false,
      })
      finishCapabilityNegotiation(runtime)
      return
    }

    if (
      message.command === Numeric.ERR_SASLFAIL ||
      message.command === Numeric.ERR_SASLTOOLONG ||
      message.command === Numeric.ERR_SASLABORTED ||
      message.command === Numeric.ERR_SASLALREADY ||
      message.command === Numeric.ERR_NICKLOCKED
    ) {
      failSasl(runtime, message.params.at(-1) ?? 'SASL authentication failed')
      finishCapabilityNegotiation(runtime)
    }
  })
}

function chooseMechanism(runtime: Runtime, requested: string): string | undefined {
  const capabilityState = getCapabilityState(runtime)
  const saslValue = capabilityState.available.get('sasl')
  if (typeof saslValue !== 'string' || saslValue.length === 0) {
    return requested
  }

  const available = saslValue.split(',').map((value) => value.trim())
  return available.includes(requested) ? requested : undefined
}

function buildSaslPlainResponses(runtime: Runtime): string[] {
  const config = runtime.getConfig().sasl
  if (!config) return []

  const authzid = config.authorizationIdentity ?? ''
  const payload = `${authzid}\u0000${config.username}\u0000${config.password}`
  const encoded = Buffer.from(payload, 'utf8').toString('base64')

  if (encoded.length === 0) {
    return ['+']
  }

  const chunks: string[] = []
  for (let index = 0; index < encoded.length; index += 400) {
    chunks.push(encoded.slice(index, index + 400))
  }

  if (encoded.length % 400 === 0) {
    chunks.push('+')
  }

  return chunks
}

function failSasl(runtime: Runtime, message: string): void {
  const current = getSaslState(runtime)
  if (!current) return

  setSaslState(runtime, {
    ...current,
    completed: true,
    successful: false,
    failed: true,
    waitingForChallenge: false,
  })

  updateConnectionState(runtime, (state) => ({
    ...state,
    account: undefined,
  }))

  if (current.required) {
    runtime.emit('error', new Error(message))
  }
}
