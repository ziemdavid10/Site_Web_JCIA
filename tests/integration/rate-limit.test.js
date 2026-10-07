/**
 * Tests d'intégration — limitation de débit RÉELLEMENT active (désactivée dans
 * les autres suites pour ne pas fausser les mesures).
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { startStack, paymentBody } from '../helpers/harness.js'

let stack
let PRICE

test.before(async () => {
  stack = await startStack({ env: { RATE_LIMIT_ENABLED: 'true', RATE_LIMIT_MULTIPLIER: '1' } })
  const { getTicketPricing } = await import('../../src/utils/pricing.js')
  PRICE = getTicketPricing('standard').price
})

test.after(async () => {
  await stack.close()
})

test('ANTI-ABUS - création de paiements : 10 par IP et par 10 min, puis 429', async () => {
  const statuses = []
  for (let i = 0; i < 12; i += 1) {
    // Numéros différents : on mesure ici la limite PAR IP
    const res = await stack.request('POST', '/payments', paymentBody({ phone: `67712${String(3000 + i)}` }, PRICE))
    statuses.push(res.status)
  }
  assert.deepEqual(statuses.slice(0, 10), Array(10).fill(200))
  assert.deepEqual(statuses.slice(10), [429, 429])
  const last = await stack.request('POST', '/payments', paymentBody({ phone: '677129876' }, PRICE))
  assert.equal(last.body.code, 'RATE_LIMITED')
  assert.ok(last.headers.get('ratelimit-policy') || last.headers.get('ratelimit'), 'en-têtes RateLimit standard')
})

test('ANTI-ABUS - énumération des commandes freinée (GET /orders/:id)', async () => {
  let limited = 0
  for (let i = 0; i < 130; i += 1) {
    const res = await stack.request('GET', `/orders/JCIA27-AAAA${String(i % 100).padStart(2, '0').replace(/[01]/g, 'B')}`)
    if (res.status === 429) limited += 1
    else assert.equal(res.status, 404)
  }
  assert.ok(limited >= 10, `au moins 10 refus attendus (obtenu ${limited})`)
})

test('ANTI-ABUS - un même numéro ne reçoit pas plus de 5 demandes de paiement en 10 min', async () => {
  // Nouvelle IP simulée impossible ici : on vérifie la limite téléphone sur un serveur neuf
  const { default: express } = await import('express')
  const { limiters } = await import('../../src/middleware/security.js')
  const app = express()
  app.use(express.json())
  app.post('/p', limiters.createPaymentPerPhone, (req, res) => res.json({ ok: true }))
  const server = await new Promise((r) => {
    const s = app.listen(0, '127.0.0.1', () => r(s))
  })
  const url = `http://127.0.0.1:${server.address().port}/p`
  const call = (phone) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) }).then((r) => r.status)
  const same = []
  for (let i = 0; i < 6; i += 1) same.push(await call('+237 6 99 00 00 42'))
  assert.deepEqual(same, [200, 200, 200, 200, 200, 429])
  assert.equal(await call('699000043'), 200, 'un autre numéro reste libre')
  server.close()
})
