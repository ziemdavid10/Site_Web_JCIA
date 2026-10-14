/**
 * Test d'intégration — billet payant réglé par CARTE BANCAIRE ou PAYPAL :
 *   inscription sur le site → POST /orders/:id/checkout → page Stripe (TIKORA)
 *   → paiement → confirmation automatique (webhook, relecture, rattrapage).
 * Le statut « payé » ne vient jamais du navigateur.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { startStack, newOrderId } from '../helpers/harness.js'

let stack
let cardCheckout

test.before(async () => {
  stack = await startStack({ env: { TIKORA_LOOKUP_MIN_INTERVAL_MS: '0' } })
  cardCheckout = await import('../../src/services/cardCheckout.js')
})

test.after(async () => {
  await stack.close()
})

let n = 0
const profile = () => ({
  firstName: 'Paul',
  lastName: 'Ndongo',
  email: `carte${++n}@example.com`,
  whatsapp: '6 77 12 34 56',
  org: 'Polytechnique Yaoundé',
  role: 'Ingénieur',
})

async function registerPaid(tierId = 'standard') {
  const res = await stack.request('POST', '/orders/register', { orderId: newOrderId(), tierId, quantity: 1, customer: profile(), publicListing: true, lang: 'fr' })
  assert.equal(res.status, 201)
  return res.body
}

const checkout = (reg, method, headers = {}) =>
  stack.request('POST', `/orders/${reg.orderId}/checkout`, { method, lang: 'fr' }, { 'X-Order-Token': reg.accessToken, Origin: 'https://www.jcia.cm', ...headers })
const getOrder = (reg) => stack.request('GET', `/orders/${reg.orderId}`, undefined, { 'X-Order-Token': reg.accessToken })
const mockOrder = (reg) => [...stack.mock.state.orders.values()].find((o) => o.reference === reg.orderId)
const payByCard = (o, webhook = false) => fetch(`${stack.mock.base}/__mock/orders/${o.id}/card-paid?webhook=${webhook ? 1 : 0}`, { method: 'POST' })

test('CARTE - crée la commande TIKORA du bon billet et renvoie la page Stripe (HTTPS, retour vers le site)', async () => {
  const reg = await registerPaid('standard')
  const res = await checkout(reg, 'card')
  assert.equal(res.status, 200, JSON.stringify(res.body))
  assert.match(res.body.checkoutUrl, /^https:\/\//)
  assert.equal(res.body.method, 'card')

  const o = mockOrder(reg)
  assert.ok(o, 'commande TIKORA créée avec notre référence')
  assert.equal(o.tier, 'standard')
  assert.equal(o.quantity, 1)
  assert.equal(o.checkout.successUrl, `https://www.jcia.cm/billetterie/confirmation/${reg.orderId}?paiement=ok`)
  assert.equal(o.checkout.cancelUrl, `https://www.jcia.cm/billetterie/confirmation/${reg.orderId}?paiement=annule`)
  assert.equal(o.checkout.locale, 'fr')

  // Second clic (ou PayPal ensuite) : même commande TIKORA, pas de double réservation
  const again = await checkout(reg, 'paypal')
  assert.equal(again.status, 200)
  assert.equal(again.body.chargedCurrency, 'EUR')
  assert.equal([...stack.mock.state.orders.values()].filter((x) => x.reference === reg.orderId).length, 1)
  assert.equal((await getOrder(reg)).body.status, 'registered')
})

test('CARTE - paiement confirmé : la page de confirmation relit TIKORA et finalise l’inscription', async () => {
  const reg = await registerPaid('standard')
  assert.equal((await checkout(reg, 'card')).status, 200)
  await payByCard(mockOrder(reg))

  const view = await getOrder(reg)
  assert.equal(view.body.status, 'paid')
  await new Promise((r) => setTimeout(r, 80)) // envoi en arrière-plan
  assert.ok(stack.sent.some((m) => m.orderId === reg.orderId || m.order?.id === reg.orderId), 'e-mail de confirmation envoyé')
  const list = (await stack.request('GET', '/attendees')).body
  assert.ok(list.some((a) => a.id === `cmd-${reg.orderId}-1`), 'participant visible dans la liste')

  // Déjà payé : plus de page de paiement
  const after = await checkout(reg, 'card')
  assert.equal(after.status, 409)
  assert.equal(after.body.code, 'ORDER_ALREADY_PAID')
})

test('CARTE - webhook order.paid : confirmation sans que le participant revienne sur le site', async () => {
  stack.mock.setWebhookUrl(`${stack.api}/webhooks/tikora`)
  try {
    const reg = await registerPaid('standard')
    assert.equal((await checkout(reg, 'paypal')).status, 200)
    await payByCard(mockOrder(reg), true)
    const row = await (await import('../../src/services/orders.js')).getOrderRow(reg.orderId)
    assert.equal(row.status, 'paid')
  } finally {
    stack.mock.setWebhookUrl('')
  }
})

test('CARTE - rattrapage périodique si ni webhook ni retour sur le site', async () => {
  const reg = await registerPaid('standard')
  assert.equal((await checkout(reg, 'card')).status, 200)
  await payByCard(mockOrder(reg))
  assert.ok((await cardCheckout.reconcileRegistrations()) >= 1)
  const row = await (await import('../../src/services/orders.js')).getOrderRow(reg.orderId)
  assert.equal(row.status, 'paid')
})

test('CARTE - sécurité et erreurs : jeton, moyen invalide, PayPal indisponible', async () => {
  const reg = await registerPaid('standard')
  const noToken = await stack.request('POST', `/orders/${reg.orderId}/checkout`, { method: 'card' })
  assert.equal(noToken.status, 404)
  const badMethod = await checkout(reg, 'bitcoin')
  assert.equal(badMethod.status, 400)

  stack.mock.state.checkoutUnavailable = { paypal: true }
  try {
    const res = await checkout(reg, 'paypal')
    assert.equal(res.status, 409)
    assert.equal(res.body.code, 'METHOD_UNAVAILABLE')
  } finally {
    stack.mock.state.checkoutUnavailable = null
  }
  // La carte reste possible
  assert.equal((await checkout(reg, 'card')).status, 200)
})

test('CARTE - origine non HTTPS (développement local) : page Stripe sans adresse de retour', async () => {
  const reg = await registerPaid('standard')
  const prev = cardCheckout.returnBase('http://localhost:5173')
  // PUBLIC_SITE_URL par défaut est en HTTPS : c'est elle qui sert de retour
  assert.match(prev ?? '', /^https:\/\//)
  const res = await checkout(reg, 'card', { Origin: 'http://localhost:5173' })
  assert.equal(res.status, 200)
  assert.ok(mockOrder(reg).checkout.successUrl.startsWith(prev))
})
