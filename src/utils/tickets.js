import { CONFIG } from '@/data/config'

/** La promotion est-elle active à cet instant ? */
export function isPromotionActive(now = new Date()) {
  const start = Date.parse(CONFIG.promotion.startDate)
  const end = Date.parse(CONFIG.promotion.endDate)
  const time = now instanceof Date ? now.getTime() : new Date(now).getTime()
  return Number.isFinite(time) && time >= start && time <= end
}

/** Prix catalogue ou prix promotionnel effectivement facturé. */
export function getTicketPrice(tier, now = new Date()) {
  if (!tier || tier.price === 0) return 0
  if (!isPromotionActive(now)) return tier.price
  return Math.round(tier.price * (1 - CONFIG.promotion.discountPercent / 100))
}

/** Informations utiles pour afficher prix catalogue, remise et prix final. */
export function getTicketPricing(tier, now = new Date()) {
  const originalPrice = tier?.price ?? 0
  const price = getTicketPrice(tier, now)
  return { originalPrice, price, discounted: price < originalPrice, discountPercent: CONFIG.promotion.discountPercent }
}

/** Quota illimité : null dans la configuration. */
export function isUnlimitedQuota(tier) {
  return tier?.quota == null
}

export function remainingSeats(tier) {
  if (!tier || isUnlimitedQuota(tier)) return Infinity
  return Math.max(0, tier.quota - (tier.sold ?? 0))
}

export function isSoldOut(tier) {
  return !isUnlimitedQuota(tier) && remainingSeats(tier) === 0
}

export function maxQuantity(tier) {
  return Math.max(1, Math.min(tier?.maxQty ?? 1, remainingSeats(tier)))
}

export function isLowStock(tier) {
  const left = remainingSeats(tier)
  return !isUnlimitedQuota(tier) && Number.isFinite(left) && tier.quota > 0 && left > 0 && left / tier.quota <= 0.15
}

export function formatSeats(n, locale = 'fr-FR') {
  return new Intl.NumberFormat(locale).format(n)
}
