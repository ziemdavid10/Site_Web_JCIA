import crypto from 'node:crypto'
import { CONFIG } from '../config/env.js'
import { tikora, TikoraError } from './tikoraClient.js'
import { resolveCategory } from './catalog.js'
import { estimateBuyerFee } from '../utils/pricing.js'
import { toE164, toMsisdn } from '../utils/validation.js'

/**
 * Fournisseur de paiement : TIKORA (mode live) ou simulation (mode demo).
 *
 * Les deux implémentations exposent le MÊME contrat, ce qui permet de tester
 * tout le parcours sans compte marchand et de basculer en live par simple
 * variable d'environnement (PAYMENT_PROVIDER_MODE=live).
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

// ─── Simulation (demo) ───────────────────────────────────────────────────────
// Même comportement que le mode démonstration du site : un numéro se
// terminant par « 0000 » est refusé (solde insuffisant), les autres sont payés.

const demoOrders = new Map()

function demoTickets(order) {
  return Array.from({ length: order.quantity }, (_, i) => {
    const id = crypto.randomUUID()
    return {
      id,
      code: `DEMO-${order.orderId.slice(-6)}-${i + 1}`,
      qrToken: `DEMO|${order.orderId}|${i + 1}|${crypto.randomBytes(6).toString('hex')}`,
      qrImageUrl: null,
      holder: order.attendees?.[i] ?? order.customer.name,
      category: order.tierId,
      status: 'valid',
    }
  })
}

const demoProvider = {
  name: 'demo',

  async createOrder({ orderId, tierId, quantity, unitPrice, customer, attendees }) {
    const subtotal = unitPrice * quantity
    const fees = estimateBuyerFee(subtotal)
    const record = {
      providerOrderId: `demo-${crypto.randomUUID()}`,
      orderId,
      tierId,
      quantity,
      customer,
      attendees,
      subtotal,
      fees,
      total: subtotal + fees,
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      orderStatus: 'awaiting_payment',
      payment: null,
      tickets: [],
    }
    demoOrders.set(record.providerOrderId, record)
    return demoProvider.snapshot(record)
  },

  async startPayment({ providerOrderId, phone }) {
    const record = demoOrders.get(providerOrderId)
    if (!record) throw new TikoraError('Commande démo introuvable', { code: 'ORDER_NOT_FOUND', status: 404 })
    record.payment = { phone: String(phone), status: 'pending', at: Date.now() }
    return { depositId: crypto.randomUUID(), amount: record.total, status: 'PENDING', reason: null }
  },

  async fetchOrder(providerOrderId) {
    const record = demoOrders.get(providerOrderId)
    if (!record) throw new TikoraError('Commande démo introuvable', { code: 'ORDER_NOT_FOUND', status: 404 })
    if (record.payment?.status === 'pending') {
      if (record.payment.phone.endsWith('0000')) record.payment = { ...record.payment, status: 'failed', failureCode: 'INSUFFICIENT_BALANCE' }
      else {
        record.orderStatus = 'paid'
        record.payment = { ...record.payment, status: 'confirmed', confirmedAt: new Date().toISOString() }
        record.tickets = demoTickets(record)
      }
    }
    return demoProvider.snapshot(record)
  },

  snapshot(record) {
    const paid = record.orderStatus === 'paid'
    const failed = record.payment?.status === 'failed'
    return {
      providerOrderId: record.providerOrderId,
      orderNumber: `DEMO-${record.orderId.slice(-6)}`,
      orderStatus: record.orderStatus,
      status: paid ? 'SUCCESSFUL' : failed ? 'FAILED' : 'PENDING',
      reason: failed ? record.payment.failureCode : null,
      transactionId: paid ? `TK-DEMO-${record.orderId.slice(-6)}` : null,
      subtotal: record.subtotal,
      fees: record.fees,
      total: record.total,
      currency: 'XAF',
      expiresAt: record.expiresAt,
      confirmedAt: record.payment?.confirmedAt ?? null,
      reference: record.orderId,
      tickets: record.tickets,
    }
  },
}

export function getProvider() {
  return CONFIG.payment.mode === 'live' ? liveProvider : demoProvider
}

export { liveProvider, demoProvider }
