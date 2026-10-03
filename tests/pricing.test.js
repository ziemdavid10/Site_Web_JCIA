import test from 'node:test'
import assert from 'node:assert/strict'
import { getTicketPricing, validateOrderAmount, inferTierIdFromAmount } from '../src/utils/pricing.js'

test('TARIFS - chaque catégorie possède un tarif', () => {
  for (const tier of ['etudiant', 'standard', 'en-ligne', 'enligne', 'vip']) {
    const pricing = getTicketPricing(tier, new Date('2026-09-01T12:00:00+01:00'))
    assert.ok(pricing)
    assert.ok(pricing.price > 0)
  }
})

test('TARIFS - montant exact accepté et montant altéré refusé', () => {
  assert.equal(validateOrderAmount('etudiant', 2, 10000, new Date('2026-09-01')), true)
  assert.equal(validateOrderAmount('etudiant', 2, 9999, new Date('2026-09-01')), false)
})

test('TARIFS - quantité minimale et maximale', () => {
  assert.equal(validateOrderAmount('etudiant', 1, 5000, new Date('2026-09-01')), true)
  assert.equal(validateOrderAmount('etudiant', 5, 25000, new Date('2026-09-01')), true)
  assert.equal(validateOrderAmount('etudiant', 0, 0, new Date('2026-09-01')), false)
  assert.equal(validateOrderAmount('etudiant', 6, 30000, new Date('2026-09-01')), false)
})

test('TARIFS - catégories et quantités invalides', () => {
  assert.equal(validateOrderAmount('inconnu', 1, 5000), false)
  assert.equal(validateOrderAmount('etudiant', 1.5, 7500), false)
  assert.equal(validateOrderAmount('etudiant', 'abc', 5000), false)
  assert.equal(validateOrderAmount('etudiant', -1, -5000), false)
})

test('TARIFS - promotion appliquée uniquement dans la période prévue', () => {
  const before = getTicketPricing('standard', new Date('2026-10-04T23:59:59+01:00'))
  const during = getTicketPricing('standard', new Date('2026-10-05T00:00:00+01:00'))
  const end = getTicketPricing('standard', new Date('2026-12-31T23:59:59+01:00'))
  const after = getTicketPricing('standard', new Date('2027-01-01T00:00:00+01:00'))

  assert.equal(before.discounted, false)
  assert.equal(during.discounted, true)
  assert.equal(end.discounted, true)
  assert.equal(after.discounted, false)
  assert.equal(during.price, 7000)
})

test('TARIFS - inférence d’un tarif à partir du montant', () => {
  assert.equal(inferTierIdFromAmount(10000, new Date('2026-09-01')), 'standard')
  assert.equal(inferTierIdFromAmount(0), null)
  assert.equal(inferTierIdFromAmount(-1), null)
  assert.equal(inferTierIdFromAmount('abc'), null)
})
