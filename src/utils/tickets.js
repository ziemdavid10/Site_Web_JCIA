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

/**
 * Places restantes. `tier.available` (stock réel renvoyé par le serveur de
 * billetterie / TIKORA) prime sur le quota théorique de la configuration.
 */
export function remainingSeats(tier) {
  if (!tier) return Infinity
  const fromQuota = isUnlimitedQuota(tier) ? Infinity : Math.max(0, tier.quota - (tier.sold ?? 0))
  return Number.isFinite(tier.available) ? Math.max(0, Math.min(tier.available, fromQuota)) : fromQuota
}

/**
 * Plus aucune place (stock réel épuisé). Une vente pas encore ouverte n'est PAS
 * « complète » : voir tierAvailability() dans src/hooks/useTicketCatalog.js.
 */
export function isSoldOut(tier) {
  if (!tier) return false
  return Number.isFinite(remainingSeats(tier)) && remainingSeats(tier) === 0
}

/**
 * Frais de service TIKORA (pourcentage du sous-total, plancher 100 FCFA).
 * Estimation affichée avant paiement ; le montant exact est confirmé par le
 * serveur au lancement du paiement.
 */
export function estimateFees(subtotal, buyerFee) {
  if (!subtotal || !buyerFee) return 0
  const fee = buyerFee.type === 'fixed' ? buyerFee.value : Math.round((subtotal * buyerFee.value) / 100)
  return Math.max(buyerFee.minimum ?? 100, fee)
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
