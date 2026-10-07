import { CONFIG } from '../config/env.js'
import { tikora } from './tikoraClient.js'
import { TIERS_CONFIG, getTicketPricing, isPromotionActive, normalizeTierId } from '../utils/pricing.js'
import { logger } from '../utils/logger.js'

/**
 * Catalogue : relie les tarifs JCIA (etudiant, standard, en-ligne, vip) aux
 * catégories de billets de l'événement TIKORA, et expose au site les prix,
 * frais et places restantes.
 *
 * L'événement TIKORA est mis en cache (TIKORA_CATALOG_CACHE_MS, 60 s par
 * défaut) : la page billetterie ne déclenche donc pas un appel TIKORA par
 * visiteur, et une panne TIKORA passagère n'empêche pas l'affichage.
 */

const DEFAULT_BUYER_FEE = { type: 'percent', value: 2, minimum: 100 }
let cache = { at: 0, event: null, pending: null }

export function resetCatalogCache() {
  cache = { at: 0, event: null, pending: null }
}

/** Identifiant de catégorie TIKORA pour un tarif, selon la période (promo ou non). */
export function categoryIdFor(tierId, now = new Date()) {
  const id = normalizeTierId(tierId)
  const entry = id ? CONFIG.payment.categoryMap[id] : null
  if (!entry) return null
  if (typeof entry === 'string') return entry
  return (isPromotionActive(now) ? entry.promo : entry.default) ?? entry.default ?? null
}

export async function getEvent({ force = false } = {}) {
  const fresh = Date.now() - cache.at < CONFIG.payment.catalogCacheMs
  if (!force && cache.event && fresh) return cache.event
  if (cache.pending) return cache.pending
  cache.pending = tikora
    .getEvent(CONFIG.payment.eventId)
    .then((event) => {
      cache = { at: Date.now(), event, pending: null }
      return event
    })
    .catch((error) => {
      cache.pending = null
      if (cache.event) {
        logger.warn('catalog.stale', { code: error.code })
        return cache.event // dernière version connue plutôt qu'une page vide
      }
      throw error
    })
  return cache.pending
}

function buyerFeeOf(event) {
  const fee = event?.buyerFee
  if (fee && ['percent', 'fixed'].includes(fee.type) && Number.isFinite(Number(fee.value))) {
    return { type: fee.type, value: Number(fee.value), minimum: DEFAULT_BUYER_FEE.minimum }
  }
  return DEFAULT_BUYER_FEE
}

/** Catalogue public (sans aucun identifiant interne TIKORA). */
export async function getPublicCatalog(now = new Date()) {
  const base = {
    mode: CONFIG.payment.mode,
    currency: 'XAF',
    methods: ['momo'], // TIKORA n'encaisse que Mobile Money (MTN / Orange)
    operators: ['mtn', 'orange'],
    buyerFee: DEFAULT_BUYER_FEE,
    promotion: isPromotionActive(now),
  }
  const tiers = Object.values(TIERS_CONFIG).map((tier) => {
    const pricing = getTicketPricing(tier.id, now)
    return { id: tier.id, ...pricing, maxQty: tier.maxQty, quota: tier.quota, available: null, onSale: true }
  })

  if (CONFIG.payment.mode !== 'live') return { ...base, buyerFee: { ...DEFAULT_BUYER_FEE }, tiers }

  const event = await getEvent()
  const categories = new Map((event?.ticketCategories ?? []).map((c) => [c.id, c]))
  return {
    ...base,
    buyerFee: buyerFeeOf(event),
    ticketsOnSale: Boolean(event?.ticketsOnSale),
    tiers: tiers.map((tier) => {
      if (tier.id === 'gratuit') return tier // inscription gratuite : gérée par JCIA, hors TIKORA
      const category = categories.get(categoryIdFor(tier.id, now))
      if (!category) return { ...tier, onSale: false, available: 0 }
      return {
        ...tier,
        available: Number.isFinite(Number(category.available)) ? Number(category.available) : null,
        onSale: Boolean(category.onSale) && Boolean(event?.ticketsOnSale) && event?.status === 'published',
        // Signale une dérive de prix entre TIKORA et la grille JCIA (à corriger côté TIKORA)
        priceMismatch: Number(category.price) !== tier.price ? true : undefined,
      }
    }),
  }
}

/** Catégorie TIKORA vendable pour ce tarif ; lève une erreur métier sinon. */
export async function resolveCategory(tierId, now = new Date()) {
  const categoryId = categoryIdFor(tierId, now)
  if (!categoryId) return { error: 'TIER_NOT_MAPPED' }
  const event = await getEvent()
  if (event?.status && event.status !== 'published') return { error: 'EVENT_NOT_PUBLISHED' }
  const category = (event?.ticketCategories ?? []).find((c) => c.id === categoryId)
  if (!category) return { error: 'CATEGORY_NOT_FOUND' }
  const expected = getTicketPricing(tierId, now)?.price
  if (CONFIG.payment.priceCheck && Number(category.price) !== expected) {
    logger.error('catalog.price_mismatch', { tierId, expected, tikoraPrice: category.price })
    return { error: 'PRICE_MISMATCH' }
  }
  if (category.onSale === false) return { error: 'NOT_ON_SALE' }
  return { category }
}
