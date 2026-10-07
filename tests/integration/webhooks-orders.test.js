/**
 * Tests d'intégration — webhooks TIKORA, commandes gratuites, liste publique,
 * reçu, et intégration du contrat attendu par le frontend.
 */
import crypto from 'node:crypto'
import test from 'node:test'
import assert from 'node:assert/strict'
import { startStack, paymentBody, newOrderId } from '../helpers/harness.js'
import { MOCK_WEBHOOK_SECRET } from '../helpers/mock-tikora-server.js'

let stack
let PRICE

test.before(async () => {
  // Paiements laissés en attente (…1111) : seul le webhook ou le rattrapage les fera évoluer
  stack = await startStack({ env: { RECEIPT_MIN_INTERVAL_MS: '60000' } })
  const { getTicketPricing } = await import('../../src/utils/pricing.js')
  PRICE = getTicketPricing('standard').price
})

test.after(async () => {
  await stack.close()
})

const sign = (raw) => `sha256=${crypto.createHmac('sha256', MOCK_WEBHOOK_SECRET).update(raw).digest('hex')}`

async function postRaw(path, payload, headers = {}) {
  const raw = JSON.stringify(payload)
  const res = await fetch(`${stack.api}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: raw })
  return { status: res.status, body: await res.json().catch(() => null), raw }
}

test('WEBHOOK - un faux « order.paid » ne valide PAS une commande impayée', async () => {
  const body = paymentBody({ phone: '677121111' }, PRICE) // reste en attente chez TIKORA
  const created = await stack.request('POST', '/payments', body)
  const { tikora_order_id: tkId } = await stack.db.get('SELECT tikora_order_id FROM orders WHERE id = ?', [body.orderId])

  // Sans signature (accepté comme simple signal → relecture TIKORA)
  const forged = await postRaw('/webhooks/tikora', { event: 'order.paid', data: { id: tkId, status: 'paid' } })
  assert.equal(forged.status, 200)
  // Ancienne route de notification, qui validait aveuglément la commande
  const legacy = await postRaw('/payments/callback', { orderId: body.orderId, status: 'SUCCESSFUL', transactionId: 'FAKE' })
  assert.equal(legacy.status, 200)

  const order = await stack.db.get('SELECT status FROM orders WHERE id = ?', [body.orderId])
  assert.equal(order.status, 'pending')
  assert.equal((await stack.request('GET', `/payments/${created.body.paymentId}`)).body.status, 'PENDING')
})

test('WEBHOOK - signature invalide : 401', async () => {
  const res = await postRaw('/webhooks/tikora', { event: 'order.paid', data: { id: crypto.randomUUID() } }, { 'X-Tikora-Signature': 'sha256=deadbeef' })
  assert.equal(res.status, 401)
})

test('WEBHOOK - webhook signé de TIKORA : commande payée sans sondage, doublon ignoré', async () => {
  stack.mock.setWebhookUrl(`${stack.api}/webhooks/tikora`)
  try {
    const body = paymentBody({}, PRICE)
    await stack.request('POST', '/payments', body)
    // Le faux TIKORA confirme puis envoie un webhook signé ; aucun GET /payments
    const deadline = Date.now() + 4000
    let order
    while (Date.now() < deadline) {
      order = await stack.db.get('SELECT status FROM orders WHERE id = ?', [body.orderId])
      if (order.status === 'paid') break
      await new Promise((r) => setTimeout(r, 50))
    }
    assert.equal(order.status, 'paid')

    const { tikora_order_id: tkId } = await stack.db.get('SELECT tikora_order_id FROM orders WHERE id = ?', [body.orderId])
    const payload = { event: 'order.paid', data: { id: tkId, reference: body.orderId } }
    const raw = JSON.stringify(payload)
    const first = await fetch(`${stack.api}/webhooks/tikora`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Tikora-Signature': sign(raw) }, body: raw })
    const second = await fetch(`${stack.api}/webhooks/tikora`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Tikora-Signature': sign(raw) }, body: raw })
    assert.equal(first.status, 200)
    assert.deepEqual(await second.json(), { received: true, duplicate: true })
    assert.equal(stack.sent.filter((m) => m.orderId === body.orderId).length, 1, 'un seul reçu')
  } finally {
    stack.mock.setWebhookUrl('')
  }
})

test('WEBHOOK - commande inconnue : même réponse (pas d’énumération)', async () => {
  const res = await postRaw('/webhooks/tikora', { event: 'order.paid', data: { id: crypto.randomUUID() } })
  assert.equal(res.status, 200)
  assert.deepEqual(res.body, { received: true })
})

test('GRATUIT - inscription, billets signés, consentement, plafond par e-mail', async () => {
  const orderId = newOrderId()
  const body = {
    orderId,
    tierId: 'gratuit',
    quantity: 2,
    customer: { name: 'Paul Essomba', email: 'free.user@example.com', phone: '699000001', org: 'Université de Yaoundé I' },
    attendees: ['Paul Essomba', 'Marie Ngo'],
    publicListing: true,
    lang: 'en',
  }
  const created = await stack.request('POST', '/orders/free', body)
  assert.equal(created.status, 201)
  assert.equal(created.body.status, 'free')

  const view = await stack.request('GET', `/orders/${orderId}`, undefined, { 'X-Order-Token': created.body.accessToken })
  assert.equal(view.body.tickets.length, 2)
  assert.match(view.body.tickets[0].qrToken, new RegExp(`^JCIA27F\\.${orderId}\\.1\\.`))

  // Rejeu identique : idempotent
  assert.equal((await stack.request('POST', '/orders/free', body)).status, 201)
  // Le tarif payant ne peut pas passer par la route gratuite
  assert.equal((await stack.request('POST', '/orders/free', { ...body, orderId: newOrderId(), tierId: 'vip' })).status, 400)

  // Plafond : 10 places gratuites par adresse
  const many = { ...body, quantity: 9, attendees: undefined }
  const capped = await stack.request('POST', '/orders/free', { ...many, orderId: newOrderId() })
  assert.equal(capped.status, 429)
  assert.equal(capped.body.code, 'FREE_LIMIT_REACHED')

  const attendees = (await stack.request('GET', '/attendees')).body
  assert.ok(attendees.some((a) => a.name === 'Marie Ngo' && a.profile === 'entreprise' && a.tier === 'gratuit'))
  assert.equal(JSON.stringify(attendees).includes('free.user@example.com'), false)
})

test('LISTE PUBLIQUE - consentement explicite obligatoire, profils du frontend', async () => {
  const { getTicketPricing } = await import('../../src/utils/pricing.js')
  const student = getTicketPricing('etudiant').price
  const visible = paymentBody({ tierId: 'etudiant', customer: { name: 'Ada Lovelace', email: 'ada@example.com', phone: '677123456' }, attendees: ['Ada Lovelace'] }, student)
  const hidden = paymentBody({ customer: { name: 'Discret Total', email: 'd@example.com', phone: '677123456' }, attendees: ['Discret Total'], publicListing: undefined }, PRICE)
  for (const b of [visible, hidden]) {
    const r = await stack.request('POST', '/payments', b)
    await stack.waitForStatus(r.body.paymentId, 'SUCCESSFUL')
  }
  const list = (await stack.request('GET', '/attendees')).body
  const ada = list.find((a) => a.name === 'Ada Lovelace')
  assert.equal(ada.profile, 'etudiant')
  assert.equal(list.some((a) => a.name === 'Discret Total'), false, 'consentement non présumé')
})

test('REÇU - renvoi manuel : vérifications et délai anti-spam', async () => {
  const body = paymentBody({ customer: { name: 'Reçu Test', email: 'recu@example.com', phone: '677123456' }, attendees: ['Reçu Test'] }, PRICE)
  const r = await stack.request('POST', '/payments', body)
  await stack.waitForStatus(r.body.paymentId, 'SUCCESSFUL')
  await new Promise((res) => setTimeout(res, 50))
  // Le reçu automatique vient de partir : le renvoi immédiat est refusé
  const tooSoon = await stack.request('POST', `/orders/${body.orderId}/receipt`, { email: 'recu@example.com', lang: 'fr' })
  assert.equal(tooSoon.status, 429)
  assert.ok(tooSoon.headers.get('retry-after'))
  const other = await stack.request('POST', `/orders/${body.orderId}/receipt`, { email: 'autre@example.com' })
  assert.equal(other.status, 403)
})

test('HTTP - en-têtes de sécurité, JSON obligatoire, corps limité', async () => {
  const res = await fetch(`${stack.api}/health`)
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(res.headers.get('cache-control'), 'no-store')
  assert.ok(res.headers.get('x-request-id'))
  assert.equal(res.headers.get('x-powered-by'), null)

  const form = await fetch(`${stack.api}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'orderId=x' })
  assert.equal(form.status, 415)

  const big = await fetch(`${stack.api}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ x: 'a'.repeat(30_000) }) })
  assert.equal(big.status, 413)
})
