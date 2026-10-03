// Grille tarifaire officielle (FCFA)
const TIERS_CONFIG = {
  etudiant: { id: 'etudiant', basePrice: 5000, maxQty: 5 },
  standard: { id: 'standard', basePrice: 10000, maxQty: 10 },
  enligne: { id: 'enligne', basePrice: 15000, maxQty: 10 },
  vip: { id: 'vip', basePrice: 25000, maxQty: 10 },
}

const PROMOTION_START = new Date('2026-10-05T00:00:00+01:00')
const PROMOTION_END = new Date('2026-12-31T23:59:59+01:00')

export function getTicketPricing(tierId, currentDate = new Date()) {
  const tier = TIERS_CONFIG[tierId]
  if (!tier) return null

  const evaluatedAt = currentDate instanceof Date
    ? currentDate
    : new Date(currentDate)

  if (Number.isNaN(evaluatedAt.getTime())) return null

  let price = tier.basePrice
  let originalPrice = tier.basePrice
  let discounted = false
  let discountPercent = 0

  if (evaluatedAt >= PROMOTION_START && evaluatedAt <= PROMOTION_END) {
    discountPercent = 30
    price = Math.round(tier.basePrice * (1 - discountPercent / 100))
    discounted = true
  }

  return { price, originalPrice, discounted, discountPercent }
}

export function validateOrderAmount(tierId, quantity, clientTotal, currentDate = new Date()) {
  const tier = TIERS_CONFIG[tierId]
  if (!tier) return false

  const qty = Number(quantity)
  if (!Number.isInteger(qty) || qty < 1 || qty > tier.maxQty) return false

  const pricing = getTicketPricing(tierId, currentDate)
  if (!pricing) return false

  return Number(clientTotal) === pricing.price * qty
}

export function inferTierIdFromAmount(amount, currentDate = new Date()) {
  const value = Number(amount)
  if (!Number.isFinite(value) || value <= 0) return null

  const matches = Object.values(TIERS_CONFIG).filter((tier) => {
    const pricing = getTicketPricing(tier.id, currentDate)
    return pricing?.price === value
  })

  return matches.length === 1 ? matches[0].id : null
}