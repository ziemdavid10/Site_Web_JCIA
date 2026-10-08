import { CONFIG } from '../config/env.js'
import { tikora, TikoraError } from './tikoraClient.js'
import { resolveCategory } from './catalog.js'
import { toE164, toMsisdn } from '../utils/validation.js'

/**
 * Fournisseur de paiement : l'API Partenaire TIKORA, toujours. Le serveur ne
 * simule aucun paiement (les tests automatiques utilisent un faux TIKORA qui
 * imite l'API, voir tests/helpers/mock-tikora-server.js).
 *
 * Parcours TIKORA :
 *   1. POST /orders                 réserve les billets 15 min, calcule le total (frais inclus)
 *   2. POST /orders/{id}/payments   demande Mobile Money sur le téléphone du payeur
 *   3. webhook order.paid / payment.failed, ou GET /orders/{id}  → billets + QR codes
 */

export const PAYMENT_STATUSES = new Set(['PENDING', 'SUCCESSFUL', 'FAILED'])
const FAILED_ORDER_STATUSES = new Set(['failed', 'cancelled', 'expired', 'refunded'])
const REJECTED_PAYMENT_STATUSES = new Set(['REJECTED', 'FAILED', 'DECLINED', 'CANCELLED', 'ERROR'])

/**
 * Traduit une commande TIKORA (PartnerOrderResponse) dans le vocabulaire du site :
 *   paid                                   → SUCCESSFUL
 *   failed | cancelled | expired | refunded → FAILED
 *   payment.status = failed (commande encore payable) → FAILED (nouvel essai possible)
 *   pending | awaiting_payment              → PENDING
 */
export function normalizeTikoraOrder(data) {
  if (!data || typeof data !== 'object' || typeof data.id !== 'string' || typeof data.status !== 'string') {
    throw new TikoraError('Commande TIKORA illisible', { code: 'INVALID_RESPONSE' })
  }
  const payment = data.payment && typeof data.payment === 'object' ? data.payment : null
  let status = 'PENDING'
  let reason = null
  if (data.status === 'paid') status = 'SUCCESSFUL'
  else if (FAILED_ORDER_STATUSES.has(data.status)) {
    status = 'FAILED'
    reason = typeof payment?.failureCode === 'string' ? payment.failureCode : data.status.toUpperCase()
  } else if (payment?.status === 'failed' || payment?.status === 'cancelled') {
    status = 'FAILED'
    reason = typeof payment.failureCode === 'string' ? payment.failureCode : 'PAYMENT_FAILED'
  }

  const tickets = Array.isArray(data.tickets)
    ? data.tickets
        .filter((t) => t && typeof t.id === 'string' && typeof t.qrToken === 'string')
        .map((t) => ({
          id: t.id,
          code: typeof t.ticketCode === 'string' ? t.ticketCode : null,
          qrToken: t.qrToken,
          qrImageUrl: typeof t.qrCodeImageUrl === 'string' && t.qrCodeImageUrl.startsWith('https://') ? t.qrCodeImageUrl : null,
          holder: typeof t.holderFullName === 'string' ? t.holderFullName : null,
          category: typeof t.category === 'string' ? t.category : null,
          status: typeof t.status === 'string' ? t.status : 'valid',
        }))
    : []

  return {
    providerOrderId: data.id,
    orderNumber: typeof data.orderNumber === 'string' ? data.orderNumber : null,
    orderStatus: data.status,
    status,
    reason,
    transactionId: status === 'SUCCESSFUL' ? data.orderNumber || data.id : null,
    subtotal: Number(data.subtotal),
    fees: Number(data.buyerFee) || 0,
    total: Number(data.total),
    currency: data.currency || 'XAF',
    expiresAt: typeof data.expiresAt === 'string' ? data.expiresAt : null,
    confirmedAt: typeof payment?.confirmedAt === 'string' ? payment.confirmedAt : null,
    reference: typeof data.reference === 'string' ? data.reference : null,
    tickets,
  }
}

// ─── TIKORA (live) ───────────────────────────────────────────────────────────

const liveProvider = {
  name: 'tikora',

  /** Réserve les billets chez TIKORA et vérifie le montant calculé. */
  async createOrder({ orderId, tierId, quantity, unitPrice, customer, sequence = 1 }) {
    const resolved = await resolveCategory(tierId)
    if (resolved.error) throw new TikoraError(`Catégorie indisponible (${resolved.error})`, { code: resolved.error, status: 409 })

    const data = await tikora.createOrder(
      {
        eventId: CONFIG.payment.eventId,
        items: [{ ticketCategoryId: resolved.category.id, quantity }],
        buyer: { fullName: customer.name, email: customer.email, phone: toE164(customer.phone) },
        reference: orderId,
      },
      `jcia-${orderId}-order-${sequence}`,
    )
    const order = normalizeTikoraOrder(data)
    // Garde-fou : TIKORA doit facturer exactement le sous-total de la grille JCIA
    if (CONFIG.payment.priceCheck && order.subtotal !== unitPrice * quantity) {
      throw new TikoraError('Sous-total TIKORA différent du tarif JCIA', { code: 'PRICE_MISMATCH', status: 409 })
    }
    if (order.currency !== 'XAF' || !Number.isFinite(order.total) || order.total < order.subtotal) {
      throw new TikoraError('Montant TIKORA incohérent', { code: 'INVALID_RESPONSE' })
    }
    return order
  },

  /** Envoie la demande de paiement Mobile Money sur le téléphone du payeur. */
  async startPayment({ providerOrderId, orderId, phone, attempt }) {
    const data = await tikora.payOrder(providerOrderId, toMsisdn(phone), `jcia-${orderId}-pay-${attempt}`)
    const status = typeof data?.status === 'string' ? data.status.toUpperCase() : ''
    return {
      depositId: typeof data?.depositId === 'string' ? data.depositId : null,
      amount: Number(data?.amount),
      status: REJECTED_PAYMENT_STATUSES.has(status) ? 'FAILED' : 'PENDING',
      reason: REJECTED_PAYMENT_STATUSES.has(status) ? status : null,
    }
  },

  async fetchOrder(providerOrderId) {
    return normalizeTikoraOrder(await tikora.getOrder(providerOrderId))
  },
}

/** Unique fournisseur : TIKORA. Aucun paiement n'est jamais simulé par le serveur. */
export function getProvider() {
  return liveProvider
}

export { liveProvider }
