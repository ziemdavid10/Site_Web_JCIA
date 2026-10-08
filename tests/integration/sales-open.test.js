/**
 * Test d'intégration — ouverture de la vente.
 * Tant que TIKORA n'a pas validé l'événement (statut pending_review), le serveur
 * l'annonce au site (salesOpen: false) et refuse les paiements avec un code
 * distinct de « billets épuisés ». L'inscription gratuite, gérée par JCIA,
 * reste ouverte. Dès la validation, la vente s'ouvre sans redémarrage.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { startStack, paymentBody, newOrderId } from '../helpers/harness.js'

let stack

test.before(async () => {
  stack = await startStack({ mockOptions: { eventStatus: 'pending_review' } })
})

test.after(async () => {
  await stack.close()
})

test('VENTE - événement en attente de validation TIKORA : « ouverture prochaine », pas « complet »', async () => {
  const { getTicketPricing } = await import('../../src/utils/pricing.js')
  const catalog = (await stack.request('GET', '/tickets')).body
  assert.equal(catalog.salesOpen, false)
  assert.equal(catalog.eventStatus, 'pending_review')
  assert.equal(catalog.mode, undefined, 'plus de mode démo annoncé au site')
  for (const tier of catalog.tiers.filter((t) => t.id !== 'gratuit')) {
    assert.equal(tier.onSale, false, tier.id)
    assert.ok(tier.available > 0, `${tier.id} : des places restent disponibles`)
  }
  assert.equal(catalog.tiers.find((t) => t.id === 'gratuit').onSale, true)

  const refused = await stack.request('POST', '/payments', paymentBody({ tierId: 'etudiant' }, getTicketPricing('etudiant').price))
  assert.equal(refused.status, 409)
  assert.equal(refused.body.code, 'SALES_NOT_OPEN')
  const state = await (await fetch(`${stack.mock.base}/__mock/state`)).json()
  assert.equal(state.orders.length, 0, 'aucune réservation créée chez TIKORA')

  // L'inscription gratuite ne dépend pas de TIKORA
  const free = await stack.request('POST', '/orders/free', {
    orderId: newOrderId(),
    tierId: 'gratuit',
    quantity: 1,
    customer: { name: 'Lina Mbarga', email: 'lina.sales@example.com', phone: '699000055', org: '' },
    attendees: ['Lina Mbarga'],
    publicListing: false,
    lang: 'fr',
  })
  assert.equal(free.status, 201)
})

test('VENTE - dès que TIKORA publie l’événement, la vente s’ouvre sans redémarrage', async () => {
  const { getTicketPricing } = await import('../../src/utils/pricing.js')
  stack.mock.setEventStatus('published')
  stack.catalog.resetCatalogCache()
  const catalog = (await stack.request('GET', '/tickets')).body
  assert.equal(catalog.salesOpen, true)
  assert.ok(catalog.tiers.every((t) => t.onSale))
  const price = getTicketPricing('etudiant').price
  const created = await stack.request('POST', '/payments', paymentBody({ tierId: 'etudiant' }, price))
  assert.equal(created.status, 200)
  assert.equal((await stack.waitForStatus(created.body.paymentId, 'SUCCESSFUL')).body.status, 'SUCCESSFUL')
})
