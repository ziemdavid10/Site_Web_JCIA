import { CONFIG } from '../config/env.js'
import { all, get, run, dbReady } from '../database/db.js'
import { tikora, TikoraError } from './tikoraClient.js'
import { getProvider } from './paymentApi.js'
import { REGISTERED, getOrderRow, markRegistrationPaid, withOrderLock } from './orders.js'
import { HttpError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'

/**
 * Billet payant réglé par CARTE BANCAIRE ou PAYPAL (Stripe Checkout de TIKORA).
 *
 *   1. le participant s'est inscrit sur le site (commande « registered ») ;
 *   2. le serveur réserve chez TIKORA le billet EXACT choisi (POST /orders, référence
 *      = notre numéro JCIA27-…), puis demande la page de paiement hébergée
 *      (POST /orders/{id}/checkout) → le navigateur y est redirigé ;
 *   3. après le paiement, Stripe renvoie le participant sur la page de confirmation
 *      du site ; le statut « payé » vient UNIQUEMENT de TIKORA (GET /orders/{id},
 *      webhook order.paid, relectures périodiques) — jamais du navigateur.
 *
 * Le Mobile Money reste réglé sur la page TIKORA de l'événement (même adresse e-mail).
 */

export const CHECKOUT_METHODS = new Set(['card', 'paypal'])
const PAYABLE = new Set(['pending', 'awaiting_payment'])
const lastCheck = new Map() // anti-rafale : une relecture TIKORA par commande toutes les 4 s au plus

/** Adresse du site pour le retour depuis Stripe : origine autorisée de la requête, sinon PUBLIC_SITE_URL. HTTPS obligatoire chez TIKORA (mode réel). */
export function returnBase(origin) {
  const clean = String(origin ?? '').replace(/\/$/, '')
  const allowed = CONFIG.allowedOrigins.includes(clean) || CONFIG.allowedOrigins.includes('*')
  if (clean && allowed && clean.startsWith('https://')) return clean
  return CONFIG.publicSiteUrl.startsWith('https://') ? CONFIG.publicSiteUrl : null
}

/**
 * Ouvre une page de paiement carte / PayPal pour une inscription payante.
 * @returns {Promise<{ checkoutUrl: string, method: string, expiresAt?: string, amount?: number, chargedAmount?: number, chargedCurrency?: string }>}
 */
export async function startCardCheckout(orderId, { method, lang, origin } = {}) {
  if (!CHECKOUT_METHODS.has(method)) throw new HttpError(400, 'Moyen de paiement invalide (card ou paypal)', 'INVALID_METHOD')
  await dbReady
  return withOrderLock(orderId, async () => {
    let order = await getOrderRow(orderId)
    if (!order) throw new HttpError(404, 'Commande introuvable', 'ORDER_NOT_FOUND')
    if (order.status === 'paid') throw new HttpError(409, 'Ce billet est déjà payé', 'ORDER_ALREADY_PAID')
    if (order.status !== REGISTERED) throw new HttpError(409, 'Cette inscription ne peut pas être payée ici', 'ORDER_CONFLICT')

    const provider = getProvider()
    try {
      // 1. Réservation TIKORA du billet choisi (réutilisée tant qu'elle est payable)
      let reuse = Boolean(order.tikora_order_id) && Date.parse(order.tikora_expires_at ?? '') - Date.now() > 2 * 60_000
      if (reuse) {
        const snap = await provider.fetchOrder(order.tikora_order_id).catch(() => null)
        if (snap?.status === 'SUCCESSFUL') {
          await markRegistrationPaid(orderId, { id: snap.providerOrderId, orderNumber: snap.orderNumber, confirmedAt: snap.confirmedAt }, order.tier_id)
          throw new HttpError(409, 'Ce billet est déjà payé', 'ORDER_ALREADY_PAID')
        }
        reuse = Boolean(snap && PAYABLE.has(snap.orderStatus))
      }
      if (!reuse) {
        const sequence = Number(order.tikora_order_seq || 0) + 1
        const snap = await provider.createOrder({
          orderId,
          tierId: order.tier_id,
          quantity: 1,
          unitPrice: Number(order.unit_price),
          customer: { name: order.customer_name, email: order.customer_email, phone: order.customer_phone },
          sequence,
        })
        await run(
          `UPDATE orders SET tikora_order_id = ?, tikora_order_number = ?, tikora_expires_at = ?, tikora_order_seq = ?,
             fees = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [snap.providerOrderId, snap.orderNumber, snap.expiresAt, sequence, snap.fees, orderId],
        )
        order = await getOrderRow(orderId)
      }

      // 2. Page de paiement hébergée (même session si redemandée dans les 10 minutes)
      const base = returnBase(origin)
      const page = `/billetterie/confirmation/${encodeURIComponent(orderId)}`
      const body = {
        method,
        locale: lang === 'en' ? 'en' : 'fr',
        ...(base ? { successUrl: `${base}${page}?paiement=ok`, cancelUrl: `${base}${page}?paiement=annule` } : {}),
      }
      const slot = Math.floor(Date.now() / 600_000)
      const data = await tikora.checkoutOrder(order.tikora_order_id, body, `jcia-${orderId}-co-${method}-${order.tikora_order_seq}-${slot}`)
      const checkoutUrl = String(data?.checkoutUrl ?? '')
      if (!/^https:\/\//.test(checkoutUrl)) throw new TikoraError('Page de paiement absente', { code: 'INVALID_RESPONSE' })
      logger.info('checkout.created', { orderId, method, livemode: data?.livemode })
      return {
        checkoutUrl,
        method,
        expiresAt: data?.expiresAt,
        amount: Number(data?.amount) || undefined,
        chargedAmount: Number(data?.chargedAmount) || undefined,
        chargedCurrency: typeof data?.chargedCurrency === 'string' ? data.chargedCurrency : undefined,
      }
    } catch (error) {
      if (error instanceof HttpError) throw error
      if (error instanceof TikoraError) {
        logger.warn('checkout.failed', { orderId, method, code: error.code, status: error.status })
        const unavailable = ['STRIPE_UNAVAILABLE', 'PAYPAL_UNAVAILABLE', 'STRIPE_AMOUNT_TOO_SMALL']
        if (unavailable.includes(error.code)) throw new HttpError(409, 'Ce moyen de paiement est momentanément indisponible', 'METHOD_UNAVAILABLE')
        if (['PRICE_MISMATCH', 'CATEGORY_NOT_FOUND', 'NOT_ON_SALE', 'EVENT_NOT_PUBLISHED', 'TIER_NOT_MAPPED'].includes(error.code) || error.status === 400) {
          throw new HttpError(409, 'Billets indisponibles pour ce tarif (stock épuisé ou vente fermée)', 'TICKETS_UNAVAILABLE')
        }
        throw new HttpError(502, 'Le service de paiement ne répond pas, réessayez dans un instant', 'PROVIDER_ERROR')
      }
      throw error
    }
  })
}

/**
 * Inscription payante avec une commande TIKORA créée par notre serveur (carte /
 * PayPal) : relit la commande chez TIKORA et confirme l'inscription si elle est payée.
 * @returns {Promise<'paid'|'pending'|'skipped'>}
 */
export async function checkRegistrationPayment(order, { force = false } = {}) {
  if (order?.status !== REGISTERED || !order.tikora_order_id) return 'skipped'
  const last = lastCheck.get(order.id) ?? 0
  if (!force && Date.now() - last < 4_000) return 'pending'
  lastCheck.set(order.id, Date.now())
  const snap = await getProvider().fetchOrder(order.tikora_order_id)
  if (snap.status !== 'SUCCESSFUL' || (snap.reference && snap.reference !== order.id)) return 'pending'
  await markRegistrationPaid(order.id, { id: snap.providerOrderId, orderNumber: snap.orderNumber, confirmedAt: snap.confirmedAt }, order.tier_id)
  lastCheck.delete(order.id)
  return 'paid'
}

/** Webhook : commande TIKORA rattachée à une inscription du site (par identifiant TIKORA ou référence). */
export async function checkRegistrationByIds({ tikoraOrderId, reference }) {
  await dbReady
  const order =
    (tikoraOrderId && (await get('SELECT * FROM orders WHERE tikora_order_id = ? AND status = ?', [tikoraOrderId, REGISTERED]))) ||
    (reference && (await get('SELECT * FROM orders WHERE id = ? AND status = ?', [reference, REGISTERED])))
  return order ? checkRegistrationPayment(order, { force: true }) : 'skipped'
}

/** Commande TIKORA « payée » portant notre référence JCIA27-… (relecture GET /orders). */
export async function applyOwnPaidOrder(o) {
  if (o?.status !== 'paid' || typeof o.reference !== 'string') return false
  const order = await get('SELECT * FROM orders WHERE id = ? AND status = ? AND tikora_order_id = ?', [o.reference, REGISTERED, o.id])
  if (!order) return false
  return markRegistrationPaid(order.id, { id: o.id, orderNumber: o.orderNumber, confirmedAt: o.payment?.confirmedAt }, order.tier_id)
}

/** Rattrapage périodique (webhook perdu, navigateur fermé après le paiement). */
export async function reconcileRegistrations({ maxAgeHours = 24, limit = 50 } = {}) {
  await dbReady
  const rows = await all(
    `SELECT * FROM orders WHERE status = ? AND tikora_order_id IS NOT NULL AND datetime(updated_at) > datetime('now', ?) LIMIT ?`,
    [REGISTERED, `-${Number(maxAgeHours)} hours`, limit],
  )
  let paid = 0
  for (const order of rows) {
    try {
      if ((await checkRegistrationPayment(order, { force: true })) === 'paid') paid += 1
    } catch (error) {
      logger.warn('registration.reconcile_failed', { orderId: order.id, code: error.code })
    }
  }
  return paid
}
