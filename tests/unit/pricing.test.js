import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getTicketPricing,
  validateOrderAmount,
  inferTierIdFromAmount,
  normalizeTierId,
  estimateBuyerFee
} from '../../src/utils/pricing.js'

// Identifiants alignés sur le frontend (src/data/config.js) : « en-ligne ».
const OFFICIAL_TIERS = [
  'etudiant',
  'standard',
  'en-ligne',
  'vip'
]

test('TARIFS - chaque catégorie officielle possède un tarif', () => {
  for (const tier of OFFICIAL_TIERS) {
    const pricing = getTicketPricing(
      tier,
      new Date('2026-09-01T12:00:00+01:00')
    )

    assert.ok(pricing)
    assert.ok(pricing.price > 0)
  }
})

test('TARIFS - aucune catégorie non officielle n’est acceptée', () => {
  for (const tier of [
    'EN-LIGNE',
    'online',
    'student',
    'standard-plus'
  ]) {
    assert.equal(
      getTicketPricing(
        tier,
        new Date('2026-09-01T12:00:00+01:00')
      ),
      null
    )
  }
})

test('TARIFS - montant exact accepté et montant altéré refusé', () => {
  assert.equal(
    validateOrderAmount(
      'etudiant',
      2,
      10000,
      new Date('2026-09-01')
    ),
    true
  )

  assert.equal(
    validateOrderAmount(
      'etudiant',
      2,
      9999,
      new Date('2026-09-01')
    ),
    false
  )
})

test('TARIFS - quantité minimale et maximale', () => {
  assert.equal(
    validateOrderAmount(
      'etudiant',
      1,
      5000,
      new Date('2026-09-01')
    ),
    true
  )

  assert.equal(
    validateOrderAmount(
      'etudiant',
      5,
      25000,
      new Date('2026-09-01')
    ),
    true
  )

  assert.equal(
    validateOrderAmount(
      'etudiant',
      0,
      0,
      new Date('2026-09-01')
    ),
    false
  )

  assert.equal(
    validateOrderAmount(
      'etudiant',
      6,
      30000,
      new Date('2026-09-01')
    ),
    false
  )
})

test('TARIFS - catégories et quantités invalides', () => {
  assert.equal(
    validateOrderAmount(
      'inconnu',
      1,
      5000
    ),
    false
  )

  assert.equal(
    validateOrderAmount(
      'etudiant',
      1.5,
      7500
    ),
    false
  )

  assert.equal(
    validateOrderAmount(
      'etudiant',
      'abc',
      5000
    ),
    false
  )

  assert.equal(
    validateOrderAmount(
      'etudiant',
      -1,
      -5000
    ),
    false
  )
})

test('TARIFS - promotion appliquée uniquement dans la période prévue', () => {
  const before = getTicketPricing(
    'standard',
    new Date('2026-10-04T23:59:59+01:00')
  )

  const during = getTicketPricing(
    'standard',
    new Date('2026-10-05T00:00:00+01:00')
  )

  const end = getTicketPricing(
    'standard',
    new Date('2026-12-31T23:59:59+01:00')
  )

  const after = getTicketPricing(
    'standard',
    new Date('2027-01-01T00:00:00+01:00')
  )

  assert.equal(before.discounted, false)
  assert.equal(during.discounted, true)
  assert.equal(end.discounted, true)
  assert.equal(after.discounted, false)
  assert.equal(during.price, 7000)
})

test('TARIFS - inférence d’un tarif à partir du montant', () => {
  assert.equal(
    inferTierIdFromAmount(
      10000,
      new Date('2026-09-01')
    ),
    'standard'
  )

  assert.equal(
    inferTierIdFromAmount(
      15000,
      new Date('2026-09-01')
    ),
    'en-ligne'
  )

  assert.equal(
    inferTierIdFromAmount(0),
    null
  )

  assert.equal(
    inferTierIdFromAmount(-1),
    null
  )

  assert.equal(
    inferTierIdFromAmount('abc'),
    null
  )
})

test(
  'TARIFS - date de promotion invalide est rejetée sans calcul incohérent',
  () => {
    assert.equal(
      getTicketPricing(
        'standard',
        'date-invalide'
      ),
      null
    )
  }
)

test('TARIFS - bornes de promotion inclusives', () => {
  const start = getTicketPricing(
    'standard',
    '2026-10-05T00:00:00+01:00'
  )

  const end = getTicketPricing(
    'standard',
    '2026-12-31T23:59:59+01:00'
  )

  assert.equal(start.discounted, true)
  assert.equal(end.discounted, true)
  assert.equal(start.price, 7000)
  assert.equal(end.price, 7000)
})

test('TARIFS - l’ancien identifiant « enligne » reste accepté (alias)', () => {
  assert.equal(normalizeTierId('enligne'), 'en-ligne')
  assert.equal(getTicketPricing('enligne', new Date('2026-09-01')).price, 15000)
})

test('TARIFS - tarif gratuit : prix nul, jamais remisé', () => {
  const p = getTicketPricing('gratuit', new Date('2026-11-01'))
  assert.equal(p.price, 0)
  assert.equal(p.discounted, false)
})

test('TARIFS - estimation des frais TIKORA (2 %, plancher 100 FCFA)', () => {
  assert.equal(estimateBuyerFee(0), 0)
  assert.equal(estimateBuyerFee(3500), 100)
  assert.equal(estimateBuyerFee(17500), 350)
  assert.equal(estimateBuyerFee(10000, { type: 'percent', value: 3.5, minimum: 100 }), 350)
})
