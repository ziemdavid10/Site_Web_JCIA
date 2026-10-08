/**
 * Banc d'intégration : faux TIKORA + backend JCIA réel (en mode live) dans le
 * même processus, sur des ports libres. À importer AVANT tout module de src/
 * (la configuration est lue au chargement).
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMockTikora, mockEnv } from './mock-tikora-server.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

export async function startStack({ env = {}, mockOptions = {} } = {}) {
  const mock = await createMockTikora({ payDelayMs: 150, ...mockOptions }).listen()
  Object.assign(process.env, mockEnv(mock.url), { TIKORA_TIMEOUT_MS: '2000', ...env })

  const { default: app } = await import('../../src/app.js')
  const db = await import('../../src/database/db.js')
  await db.dbReady
  const orders = await import('../../src/services/orders.js')
  const { mailerService } = await import('../../src/services/mailer.js')
  const catalog = await import('../../src/services/catalog.js')

  const sent = []
  mailerService.sendReceiptEmail = async (args) => {
    sent.push(args)
    return true
  }
  const formsSent = []
  let formFailures = 0
  mailerService.sendAttendeeFormEmail = async (args) => {
    if (formFailures > 0) {
      formFailures -= 1
      throw new Error('SMTP indisponible')
    }
    formsSent.push(args)
    return true
  }

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  const api = `http://127.0.0.1:${server.address().port}`

  async function request(method, url, body, headers = {}) {
    const res = await fetch(`${api}${url}`, {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    const text = await res.text()
    let json
    try {
      json = JSON.parse(text)
    } catch {
      json = null
    }
    return { status: res.status, body: json, headers: res.headers }
  }

  async function waitForStatus(paymentId, expected, timeoutMs = 5000) {
    const deadline = Date.now() + timeoutMs
    let last
    while (Date.now() < deadline) {
      last = await request('GET', `/payments/${paymentId}`)
      if (last.body?.status === expected) return last
      if (last.body?.status && last.body.status !== 'PENDING') return last
      await new Promise((r) => setTimeout(r, 100))
    }
    return last
  }

  return {
    mock,
    api,
    db,
    orders,
    catalog,
    sent,
    formsSent,
    failNextForms(n = 1) {
      formFailures = n
    },
    request,
    waitForStatus,
    async close() {
      server.closeAllConnections?.()
      await new Promise((r) => server.close(r))
      await mock.close()
    },
  }
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
/** Même générateur que le frontend (src/services/orders.js#newOrderId) */
export function newOrderId() {
  const rand = crypto.getRandomValues(new Uint8Array(6))
  return `JCIA27-${[...rand].map((n) => ALPHABET[n % ALPHABET.length]).join('')}`
}

/** Corps de POST /payments tel que l'envoie le frontend (src/services/payment.js) */
export function paymentBody(overrides = {}, price) {
  const quantity = overrides.quantity ?? 1
  return {
    orderId: newOrderId(),
    amount: price * quantity,
    currency: 'XAF',
    method: 'momo',
    operator: 'mtn',
    phone: '677123456',
    tierId: 'standard',
    quantity,
    customer: { name: 'Awa Diallo', email: 'awa@example.com', phone: '677123456', org: 'IAC' },
    attendees: Array.from({ length: quantity }, (_, i) => (i === 0 ? 'Awa Diallo' : `Invité ${'BCDEFGHIJ'[i]}. Kamga`)),
    publicListing: true,
    lang: 'fr',
    description: 'JCIA 2027 — standard × 1',
    ...overrides,
  }
}

/** Démarre le VRAI serveur (node src/server.js) dans un processus séparé. */
export function spawnServer(env, { port } = {}) {
  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      PATH: process.env.PATH,
      SKIP_DOTENV: '1', // configuration du test uniquement, jamais le .env du poste
      PORT: String(port ?? 0),
      HOST: '127.0.0.1',
      DB_PATH: path.join(os.tmpdir(), `jcia-spawn-${process.pid}-${Date.now()}.sqlite`),
      LOG_LEVEL: 'info',
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  child.stdout.on('data', (d) => (output += d))
  child.stderr.on('data', (d) => (output += d))
  const exited = new Promise((resolve) => child.on('exit', (code) => resolve(code)))
  return { child, exited, output: () => output }
}
