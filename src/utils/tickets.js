/**
 * Disponibilité des billets.
 *
 * ⚠️ Les quotas affichés viennent de src/data/config.js : ils servent à informer
 * le visiteur. En production, la disponibilité réelle doit être fournie et
 * vérifiée par le serveur de billetterie au moment du paiement (le navigateur
 * peut être modifié par n'importe qui).
 */

/** Billets encore disponibles pour ce tarif */
export function remainingSeats(tier) {
  if (!tier || typeof tier.quota !== 'number') return Infinity
  return Math.max(0, tier.quota - (tier.sold ?? 0))
}

/** Le tarif est-il complet ? */
export function isSoldOut(tier) {
  return remainingSeats(tier) === 0
}

/** Quantité maximale commandable : le plus petit du plafond par commande et du stock */
export function maxQuantity(tier) {
  return Math.max(1, Math.min(tier?.maxQty ?? 1, remainingSeats(tier)))
}

/** Le quota est-il presque épuisé ? (moins de 15 % des places) */
export function isLowStock(tier) {
  const left = remainingSeats(tier)
  return Number.isFinite(left) && tier.quota > 0 && left > 0 && left / tier.quota <= 0.15
}

/** Nombre formaté selon la langue : 3 000 */
export function formatSeats(n, locale = 'fr-FR') {
  return new Intl.NumberFormat(locale).format(n)
}
