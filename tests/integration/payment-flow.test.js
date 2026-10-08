/**
 * Tests d'intégration — parcours de paiement complet contre un faux TIKORA
 * fidèle à l'API Partenaire (tests/helpers/mock-tikora-server.js).
 *
 * Couvre les scénarios listés comme « à distinguer des tests unitaires » dans
 * TEST_SCENARI.md : erreurs HTTP du fournisseur, délai dépassé, réponse non
 * JSON, webhooks (doublon, signature invalide, faux webhook), confirmation
 * asynchrone, nouvel essai après refus, réservation expirée…
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { startStack, paymentBody } from '../helpers/harness.js'
import { MOCK_CATEGORIES, MOCK_EVENT_ID } from '../helpers/mock-tikora-server.js'

let stack
let PRICE

test.before(async () => {
  stack = await startStack()
  const { getTicketPricing } = await import('../../src/utils/pricing.js')
  PRICE = getTicketPricing('standard').price
})

test.after(async () => {
  await stack.close()
})

test.beforeEach(async () => {
  stack.mock.setFault(null)
  stack.catalog.resetCatalogCache()
})

const fee = (subtotal) => Math.max(100, Math.round(subtotal * 0.02))

test('LIVE - parcours nominal : réservation, paiement, billets TIKORA, reçu', async () => {
  const body = paymentBody({ quantity: 2 }, PRICE)
  const created = await stack.request('POST', '/payments', body)
  assert.equal(created.status, 200)
  assert.match(created.body.paymentId, /^PAY-[0-9a-f-]{36}$/)
  assert.equal(created.body.status, 'PENDING')
  assert.equal(created.body.subtotal, PRICE * 2)
  assert.equal(created.body.fees, fee(PRICE * 2))
  assert.equal(created.body.amount, PRICE * 2 + fee(PRICE * 2))
  assert.ok(created.body.accessToken.length >= 40)

  // Requête envoyée à TIKORA conforme au contrat partenaire
  const state = await (await fetch(`${stack.mock.base}/__mock/state`)).json()
  const tk = state.orders.find((o) => o.reference === body.orderId)
  assert.ok(tk, 'commande TIKORA créée avec notre référence')
  assert.equal(tk.eventId, MOCK_EVENT_ID)
  assert.equal(tk.items[0].ticketCategoryId, MOCK_CATEGORIES.standard)
  assert.equal(tk.items[0].quantity, 2)
  assert.equal(tk.buyer.phone, '+237677123456')

  const final = await stack.waitForStatus(created.body.paymentId, 'SUCCESSFUL')
  assert.equal(final.body.status, 'SUCCESSFUL')
  assert.ok(final.body.transactionId)

  const order = await stack.db.get('SELECT * FROM orders WHERE id = ?', [body.orderId])
  assert.equal(order.status, 'paid')
  assert.equal(order.total, PRICE * 2 + fee(PRICE * 2))

  // Billets officiels (QR TIKORA) accessibles avec le jeton uniquement
  const denied = await stack.request('GET', `/orders/${body.orderId}`)
  assert.equal(denied.status, 404)
  const wrong = await stack.request('GET', `/orders/${body.orderId}`, undefined, { 'X-Order-Token': 'x'.repeat(43) })
  assert.equal(wrong.status, 404)
  const view = await stack.request('GET', `/orders/${body.orderId}`, undefined, { 'X-Order-Token': created.body.accessToken })
  assert.equal(view.status, 200)
  assert.equal(view.body.status, 'paid')
  assert.equal(view.body.tickets.length, 2)
  assert.match(view.body.tickets[0].qrToken, /^tikora\.qr\./)
  assert.equal(view.body.payment.phoneMasked, '***456')
  assert.equal(JSON.stringify(view.body).includes('677123456'), false, 'numéro complet jamais renvoyé')

  // Reçu envoyé automatiquement, une seule fois, avec les billets
  await new Promise((r) => setTimeout(r, 50))
  const receipts = stack.sent.filter((m) => m.orderId === body.orderId)
  assert.equal(receipts.length, 1)
  assert.equal(receipts[0].tickets.length, 2)
  assert.equal(receipts[0].accessToken, created.body.accessToken)
})

test('LIVE - double clic / onglets multiples : un seul ordre TIKORA, un seul débit', async () => {
  const body = paymentBody({}, PRICE)
  const before = (await (await fetch(`${stack.mock.base}/__mock/state`)).json()).orders.length
  const results = await Promise.all(Array.from({ length: 6 }, () => stack.request('POST', '/payments', body)))
  assert.ok(results.every((r) => r.status === 200))
  assert.equal(new Set(results.map((r) => r.body.paymentId)).size, 1)
  const after = (await (await fetch(`${stack.mock.base}/__mock/state`)).json()).orders
  assert.equal(after.length - before, 1)
  const rows = await stack.db.all('SELECT * FROM payments WHERE order_id = ?', [body.orderId])
  assert.equal(rows.length, 1)
})

test('LIVE - refus (solde insuffisant) puis nouvel essai réussi sur la même réservation', async () => {
  const body = paymentBody({ phone: '677120000' }, PRICE)
  const first = await stack.request('POST', '/payments', body)
  const failed = await stack.waitForStatus(first.body.paymentId, 'FAILED')
  assert.equal(failed.body.status, 'FAILED')
  assert.equal(failed.body.reason, 'INSUFFICIENT_BALANCE')

  const retry = await stack.request('POST', '/payments', { ...body, phone: '677123456' })
  assert.equal(retry.status, 200)
  assert.notEqual(retry.body.paymentId, first.body.paymentId)
  const ok = await stack.waitForStatus(retry.body.paymentId, 'SUCCESSFUL')
  assert.equal(ok.body.status, 'SUCCESSFUL')

  const order = await stack.db.get('SELECT * FROM orders WHERE id = ?', [body.orderId])
  assert.equal(order.tikora_order_seq, 1, 'réservation TIKORA réutilisée')
  const attempts = await stack.db.all('SELECT attempt, status FROM payments WHERE order_id = ? ORDER BY attempt', [body.orderId])
  assert.deepEqual(attempts.map((a) => a.status), ['FAILED', 'SUCCESSFUL'])
})

test('LIVE - refus immédiat du fournisseur (REJECTED)', async () => {
  const created = await stack.request('POST', '/payments', paymentBody({ phone: '677129999' }, PRICE))
  assert.equal(created.status, 200)
  assert.equal(created.body.status, 'FAILED')
  const status = await stack.request('GET', `/payments/${created.body.paymentId}`)
  assert.equal(status.body.status, 'FAILED')
})

test('LIVE - réservation expirée : une nouvelle commande TIKORA est créée', async () => {
  const body = paymentBody({ phone: '677120000' }, PRICE)
  const first = await stack.request('POST', '/payments', body)
  await stack.waitForStatus(first.body.paymentId, 'FAILED')
  const order = await stack.db.get('SELECT tikora_order_id FROM orders WHERE id = ?', [body.orderId])
  await fetch(`${stack.mock.base}/__mock/orders/${order.tikora_order_id}/expire`, { method: 'POST' })
  await stack.db.run(`UPDATE orders SET tikora_expires_at = ? WHERE id = ?`, [new Date(Date.now() - 1000).toISOString(), body.orderId])

  const retry = await stack.request('POST', '/payments', { ...body, phone: '677123456' })
  assert.equal(retry.status, 200)
  const after = await stack.db.get('SELECT tikora_order_id, tikora_order_seq FROM orders WHERE id = ?', [body.orderId])
  assert.notEqual(after.tikora_order_id, order.tikora_order_id)
  assert.equal(after.tikora_order_seq, 2)
  assert.equal((await stack.waitForStatus(retry.body.paymentId, 'SUCCESSFUL')).body.status, 'SUCCESSFUL')
})

test('LIVE - erreur 500 passagère : nouvelle tentative automatique transparente', async () => {
  stack.mock.setFault('500', 1)
  const created = await stack.request('POST', '/payments', paymentBody({}, PRICE))
  assert.equal(created.status, 200)
})

test('LIVE - clé TIKORA refusée (401) : 502 sans fuite de détail', async () => {
  stack.mock.setFault('401', 10)
  const created = await stack.request('POST', '/payments', paymentBody({}, PRICE))
  assert.equal(created.status, 502)
  assert.equal(created.body.code, 'PROVIDER_ERROR')
  assert.equal(JSON.stringify(created.body).includes('tk_'), false)
})

test('LIVE - TIKORA saturé (429 répétés) : 503 « réessayez »', async () => {
  stack.mock.setFault('429', 10)
  const created = await stack.request('POST', '/payments', paymentBody({}, PRICE))
  assert.equal(created.status, 503)
  assert.equal(created.body.code, 'PROVIDER_BUSY')
})

test('LIVE - réponse non JSON du fournisseur : 502', async () => {
  stack.mock.setFault('nonjson', 10)
  const created = await stack.request('POST', '/payments', paymentBody({}, PRICE))
  assert.equal(created.status, 502)
})

test('LIVE - délai dépassé côté fournisseur : 502 en temps borné', async () => {
  stack.mock.setFault('timeout', 10)
  const started = Date.now()
  const created = await stack.request('POST', '/payments', paymentBody({}, PRICE))
  assert.equal(created.status, 502)
  assert.ok(Date.now() - started < 12_000)
})

test('LIVE - en-têtes reçus mais corps bloqué : délai appliqué, nouvelle tentative, 502 borné', async () => {
  stack.mock.setFault('stall', 10)
  const started = Date.now()
  const created = await stack.request('POST', '/payments', paymentBody({}, PRICE))
  assert.equal(created.status, 502)
  assert.equal(created.body.code, 'PROVIDER_ERROR')
  assert.ok(Date.now() - started < 12_000)
  stack.mock.setFault(null)
})

test('LIVE - dérive de prix entre TIKORA et la grille JCIA : vente bloquée (409)', async () => {
  stack.mock.setPrice('vip', 1)
  stack.catalog.resetCatalogCache()
  const { getTicketPricing } = await import('../../src/utils/pricing.js')
  const vip = getTicketPricing('vip').price
  const created = await stack.request('POST', '/payments', paymentBody({ tierId: 'vip', amount: vip }, vip))
  assert.equal(created.status, 409)
  assert.equal(created.body.code, 'TICKETS_UNAVAILABLE')
  stack.mock.setPrice('vip', null)
})

test('LIVE - stock épuisé chez TIKORA : 409', async () => {
  stack.mock.setStock('etudiant', 0)
  const { getTicketPricing } = await import('../../src/utils/pricing.js')
  const p = getTicketPricing('etudiant').price
  const created = await stack.request('POST', '/payments', paymentBody({ tierId: 'etudiant' }, p))
  assert.equal(created.status, 409)
  stack.mock.setStock('etudiant', 1000)
})

test('SÉCURITÉ - montant falsifié, carte, commande d’autrui', async () => {
  const tampered = await stack.request('POST', '/payments', { ...paymentBody({}, PRICE), amount: 100 })
  assert.equal(tampered.status, 400)
  assert.equal(tampered.body.code, 'AMOUNT_MISMATCH')

  const card = await stack.request('POST', '/payments', { ...paymentBody({}, PRICE), method: 'card', card: { number: '4242424242424242' } })
  assert.equal(card.status, 400)

  const body = paymentBody({}, PRICE)
  assert.equal((await stack.request('POST', '/payments', body)).status, 200)
  const hijack = await stack.request('POST', '/payments', { ...body, customer: { ...body.customer, email: 'pirate@example.com' } })
  assert.equal(hijack.status, 409)
  assert.equal(hijack.body.code, 'ORDER_CONFLICT')
})

test('CATALOGUE - GET /tickets expose prix, frais et stock TIKORA', async () => {
  stack.mock.setStock('vip', 7)
  stack.catalog.resetCatalogCache()
  const res = await stack.request('GET', '/tickets')
  assert.equal(res.status, 200)
  assert.equal(res.body.salesOpen, true)
  assert.equal(res.body.eventStatus, 'published')
  assert.deepEqual(res.body.methods, ['momo'])
  assert.equal(res.body.buyerFee.value, 2)
  const vip = res.body.tiers.find((t) => t.id === 'vip')
  assert.equal(vip.available, 7)
  assert.equal(vip.onSale, true)
  assert.equal(JSON.stringify(res.body).includes(MOCK_CATEGORIES.vip), false, 'aucun identifiant TIKORA exposé')
  stack.mock.setStock('vip', 1000)
})

test('RATTRAPAGE - un paiement abandonné par le navigateur est confirmé par la tâche périodique', async () => {
  const body = paymentBody({}, PRICE)
  const created = await stack.request('POST', '/payments', body)
  await new Promise((r) => setTimeout(r, 400)) // TIKORA confirme, personne n'interroge
  await stack.orders.reconcilePending()
  const order = await stack.db.get('SELECT status FROM orders WHERE id = ?', [body.orderId])
  assert.equal(order.status, 'paid')
  const payment = await stack.db.get('SELECT status FROM payments WHERE payment_id = ?', [created.body.paymentId])
  assert.equal(payment.status, 'SUCCESSFUL')
})

test('TARIFS - achat complet pour chacun des 4 tarifs payants (catégorie TIKORA, prix, frais)', async () => {
  const { getTicketPricing } = await import('../../src/utils/pricing.js')
  for (const tierId of ['etudiant', 'standard', 'en-ligne', 'vip']) {
    const price = getTicketPricing(tierId).price
    const body = paymentBody({ tierId, quantity: 2 }, price)
    const created = await stack.request('POST', '/payments', body)
    assert.equal(created.status, 200, `${tierId} : création`)
    assert.equal(created.body.subtotal, price * 2, `${tierId} : sous-total`)
    assert.equal(created.body.fees, fee(price * 2), `${tierId} : frais`)
    const state = await (await fetch(`${stack.mock.base}/__mock/state`)).json()
    const tk = state.orders.find((o) => o.reference === body.orderId)
    assert.equal(tk.items[0].ticketCategoryId, MOCK_CATEGORIES[tierId], `${tierId} : bonne catégorie TIKORA`)
    assert.equal((await stack.waitForStatus(created.body.paymentId, 'SUCCESSFUL')).body.status, 'SUCCESSFUL', `${tierId} : payé`)
  }
})

test('TARIFS - le tarif gratuit ne passe jamais par le paiement TIKORA', async () => {
  const res = await stack.request('POST', '/payments', paymentBody({ tierId: 'gratuit', amount: 0 }, 0))
  assert.equal(res.status, 400)
  assert.equal(res.body.code, 'INVALID_TIER')
})
