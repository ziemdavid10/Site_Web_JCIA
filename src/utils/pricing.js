// src/utils/pricing.js

// Grille tarifaire officielle (FCFA)
const TIERS_CONFIG = {
  etudiant: { id: 'etudiant', basePrice: 5000, maxQty: 5 },
  standard: { id: 'standard', basePrice: 10000, maxQty: 10 },
  enligne: { id: 'enligne', basePrice: 15000, maxQty: 10 },
  vip: { id: 'vip', basePrice: 25000, maxQty: 10 },
}

/**
 * Calcule le prix unitaire d'un billet en fonction des remises/promotions actives
 */
export function getTicketPricing(tierId, currentDate = new Date()) {
  const tier = TIERS_CONFIG[tierId]
  if (!tier) return null

  let price = tier.basePrice
  let originalPrice = tier.basePrice
  let discounted = false
  let discountPercent = 0

  // Exemple de promotion : 30% de réduction sur tous les billets du 1er octobre au 31 décembre 2026
  const promoStartDate = new Date('2026-10-05T00:00:00+01:00')
  const promoEndDate = new Date('2026-12-31T23:59:59+01:00')
  if (currentDate > promoStartDate && currentDate <= promoEndDate) {
    discountPercent = 30 // 30% de réduction
    price = Math.round(tier.basePrice * (1 - discountPercent / 100))
    discounted = true
  }

  return { price, originalPrice, discounted, discountPercent }
}

/**
 * Valide si le montant total envoyé par le client est rigoureusement exact
 */
export function validateOrderAmount(tierId, quantity, clientTotal) {
  const tier = TIERS_CONFIG[tierId]
  if (!tier) return false
  
  const qty = Number(quantity)
  if (!Number.isInteger(qty) || qty < 1 || qty > tier.maxQty) return false

  const pricing = getTicketPricing(tierId)
  if (!pricing) return false

  const expectedTotal = pricing.price * qty
  return Number(clientTotal) === expectedTotal
}


// Infère le tierId à partir du montant total de la commande, si possible

export function inferTierIdFromAmount(amount, currentDate = new Date()) {
  const value = Number(amount)
  if (!Number.isFinite(value) || value <= 0) return null

  const matches = Object.values(TIERS_CONFIG).filter((tier) => {
    const pricing = getTicketPricing(tier.id, currentDate)
    return pricing?.price === value
  })

  return matches.length === 1 ? matches[0].id : null
}