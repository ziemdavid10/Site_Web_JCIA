/**
 * Grille tarifaire officielle (FCFA) — miroir EXACT de frontend/src/data/config.js
 * (CONFIG.tickets.tiers et CONFIG.promotion). Le test d'intégration
 * « contrat frontend ↔ backend » vérifie que les deux restent identiques.
 *
 * Identifiants : ceux du frontend (`en-ligne` avec tiret). L'ancien identifiant
 * backend `enligne` reste accepté comme alias pour les commandes existantes.
 */
export const TIERS_CONFIG = {
  gratuit: { id: 'gratuit', basePrice: 0, maxQty: 10, quota: null },
  etudiant: { id: 'etudiant', basePrice: 5000, maxQty: 5, quota: 100 },
  standard: { id: 'standard', basePrice: 10000, maxQty: 10, quota: 250 },
  'en-ligne': { id: 'en-ligne', basePrice: 15000, maxQty: 10, quota: null },
  vip: { id: 'vip', basePrice: 25000, maxQty: 10, quota: 150 },
}

const TIER_ALIASES = { enligne: 'en-ligne', professionnel: 'vip' }

export const PROMOTION = {
  discountPercent: 30,
  start: new Date('2026-10-05T00:00:00+01:00'),
  end: new Date('2026-12-31T23:59:59+01:00'),
}

/** Identifiant canonique d'un tarif, ou null s'il est inconnu. */
export function normalizeTierId(tierId) {
  if (typeof tierId !== 'string') return null
  const id = TIER_ALIASES[tierId] ?? tierId
  return Object.hasOwn(TIERS_CONFIG, id) ? id : null
}

export function isPromotionActive(currentDate = new Date()) {
  const d = currentDate instanceof Date ? currentDate : new Date(currentDate)
  return !Number.isNaN(d.getTime()) && d >= PROMOTION.start && d <= PROMOTION.end
}

export function getTicketPricing(tierId, currentDate = new Date()) {
  const id = normalizeTierId(tierId)
  if (!id) return null
  const tier = TIERS_CONFIG[id]

  const evaluatedAt = currentDate instanceof Date ? currentDate : new Date(currentDate)
  if (Number.isNaN(evaluatedAt.getTime())) return null

  let price = tier.basePrice
  const originalPrice = tier.basePrice
  let discounted = false
  let discountPercent = 0

  if (tier.basePrice > 0 && isPromotionActive(evaluatedAt)) {
    discountPercent = PROMOTION.discountPercent
    price = Math.round(tier.basePrice * (1 - discountPercent / 100))
    discounted = true
  }

  return { price, originalPrice, discounted, discountPercent }
}

export function isValidQuantity(tierId, quantity) {
  const id = normalizeTierId(tierId)
  if (!id) return false
  const qty = typeof quantity === 'string' && quantity.trim() !== '' ? Number(quantity) : quantity
  return Number.isInteger(qty) && qty >= 1 && qty <= TIERS_CONFIG[id].maxQty
}

export function validateOrderAmount(tierId, quantity, clientTotal, currentDate = new Date()) {
  if (!isValidQuantity(tierId, quantity)) return false
  const pricing = getTicketPricing(tierId, currentDate)
  if (!pricing) return false
  return Number(clientTotal) === pricing.price * Number(quantity)
}

/**
 * Ancien contrat (frontend ≤ v1) : la commande n'envoyait que le montant.
 * Ne fonctionne que pour une quantité de 1 — le nouveau frontend envoie tierId.
 */
export function inferTierIdFromAmount(amount, currentDate = new Date()) {
  const value = Number(amount)
  if (!Number.isFinite(value) || value <= 0) return null

  const matches = Object.values(TIERS_CONFIG).filter((tier) => {
    const pricing = getTicketPricing(tier.id, currentDate)
    return pricing?.price === value
  })

  return matches.length === 1 ? matches[0].id : null
}

/**
 * Frais acheteur TIKORA (pourcentage du sous-total, plancher en XAF).
 * Estimation affichée au client ; le montant facturé fait foi côté TIKORA.
 */
export function estimateBuyerFee(subtotal, { type = 'percent', value = 2, minimum = 100 } = {}) {
  if (!subtotal) return 0
  const fee = type === 'fixed' ? value : Math.round((subtotal * value) / 100)
  return Math.max(minimum, fee)
}
