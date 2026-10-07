/**
 * Test d'intégration — montants TIKORA au format texte décimal.
 * Le vrai TIKORA renvoie "price": "3500.00" (constaté avec npm run check:config) :
 * prix, frais et totaux doivent être lus correctement sur tout le parcours.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { startStack, paymentBody } from '../helpers/harness.js'

let stack

test.before(async () => {
  stack = await startStack({ mockOptions: { decimalStrings: true } })
})

test.after(async () => {
  await stack.close()
})

test('MONTANTS "3500.00" : catalogue, contrôle de prix, achat complet et reçu', async () => {
  const { getTicketPricing } = await import('../../src/utils/pricing.js')
  const price = getTicketPricing('etudiant').price

  const catalog = await stack.request('GET', '/tickets')
  const tier = catalog.body.tiers.find((t) => t.id === 'etudiant')
  assert.equal(tier.onSale, true)
  assert.equal(tier.priceMismatch, undefined, 'aucune fausse alerte de dérive de prix')

  const body = paymentBody({ tierId: 'etudiant', quantity: 2 }, price)
  const created = await stack.request('POST', '/payments', body)
  assert.equal(created.status, 200, JSON.stringify(created.body))
  assert.strictEqual(created.body.subtotal, price * 2)
  assert.strictEqual(created.body.fees, Math.max(100, Math.round(price * 2 * 0.02)))
  assert.strictEqual(created.body.amount, created.body.subtotal + created.body.fees)

  const final = await stack.waitForStatus(created.body.paymentId, 'SUCCESSFUL')
  assert.equal(final.body.status, 'SUCCESSFUL')
  const order = await stack.db.get('SELECT total, fees FROM orders WHERE id = ?', [body.orderId])
  assert.strictEqual(order.total, created.body.amount)
  assert.strictEqual(order.fees, created.body.fees)
})
