import crypto from 'node:crypto'
import { CONFIG } from '../config/env.js'
import { all, get, run, dbReady } from '../database/db.js'
import { getProvider } from './paymentApi.js'
import { TikoraError } from './tikoraClient.js'
import { mailerService } from './mailer.js'
import { freeTicketQrToken, orderAccessToken } from './security.js'
import { TIERS_CONFIG, getTicketPricing, inferTierIdFromAmount, isValidQuantity, normalizeTierId } from '../utils/pricing.js'
import {
  ORDER_ID_RE,
  cleanText,
  isPlainObject,
  isValidCmPhone,
  isValidNamePart,
  isValidPersonName,
  normalizePhone,
  normalizeWhatsapp,
  validEmail,
} from '../utils/validation.js'
import { logger, maskPhone } from '../utils/logger.js'
import { HttpError } from '../utils/errors.js'
import { photoSummaries } from './photos.js'

/**
 * Cœur métier de la billetterie : commandes, paiements, billets.
 *
 * Règles de sécurité appliquées ici :
 *   • le serveur recalcule le prix (le montant envoyé par le navigateur n'est
 *     qu'un contrôle de cohérence) ;
 *   • un identifiant de commande est lié à son acheteur (e-mail, tarif,
 *     quantité) : impossible de « reprendre » la commande d'un autre ;
 *   • aucune donnée de carte n'est acceptée (TIKORA n'encaisse que Mobile
 *     Money ; PCI-DSS) ;
 *   • le statut « payé » ne vient QUE de TIKORA (GET /orders/{id}), jamais du
 *     navigateur ni du contenu d'un webhook ;
 *   • les transitions sont conditionnelles (UPDATE … WHERE status = …) : un
 *     reçu n'est envoyé qu'une fois, même si webhook et sondage arrivent
 *     simultanément.
 */

export { HttpError }

const METHODS = new Set(['momo', 'card'])
const OPERATORS = new Set(['mtn', 'orange'])
const CURRENCIES = new Set(['XAF'])
const PAYABLE_PROVIDER_STATUSES = new Set(['pending', 'awaiting_payment'])

// ─── Verrou par commande (double clic, onglets multiples) ───────────────────
const locks = new Map()
async function withOrderLock(orderId, fn) {
  const previous = locks.get(orderId) ?? Promise.resolve()
  let release
  const current = new Promise((resolve) => {
    release = resolve
  })
  const chained = previous.then(() => current)
  locks.set(orderId, chained)
  await previous
  try {
    return await fn()
  } finally {
    release()
    if (locks.get(orderId) === chained) locks.delete(orderId)
  }
}

// ─── Validation d'une demande de commande ────────────────────────────────────

function parseAttendees(raw, buyerName, quantity) {
  const list = Array.isArray(raw)
    ? raw.filter((name) => typeof name === 'string').map((name) => cleanText(name, 80)).filter(Boolean).slice(0, 50)
    : []
  if (!list.length) return Array.from({ length: quantity }, () => buyerName)
  if (list.length !== quantity) throw new HttpError(400, 'La liste des participants ne correspond pas à la quantité', 'ATTENDEES_MISMATCH')
  if (!list.every(isValidPersonName)) throw new HttpError(400, 'Nom de participant invalide', 'ATTENDEE_INVALID')
  return list
}

/**
 * Fiche participant envoyée par le formulaire d'inscription (tous tarifs) :
 * prénom, nom, numéro WhatsApp, organisation / établissement, rôle.
 * `strict` : tous les champs sont obligatoires (inscription aux billets payants) ;
 * sinon ils restent facultatifs (anciens clients, API de paiement direct).
 */
function parseProfile(customer, { strict }) {
  const firstName = cleanText(customer?.firstName, 40)
  const lastName = cleanText(customer?.lastName, 40)
  const hasParts = Boolean(firstName || lastName)
  if ((strict || hasParts) && (!isValidNamePart(firstName) || !isValidNamePart(lastName))) {
    throw new HttpError(400, 'Prénom ou nom invalide', 'INVALID_NAME')
  }
  const whatsappRaw = customer?.whatsapp ?? customer?.phone
  const whatsapp = normalizeWhatsapp(whatsappRaw)
  if (strict && !whatsapp) throw new HttpError(400, 'Numéro WhatsApp invalide', 'INVALID_PHONE')
  const org = cleanText(customer?.org, 120)
  const role = cleanText(customer?.role, 80)
  if (strict && org.length < 2) throw new HttpError(400, 'Organisation ou établissement manquant', 'INVALID_ORG')
  if (strict && role.length < 2) throw new HttpError(400, 'Rôle dans l’organisation manquant', 'INVALID_ROLE')
  return { firstName: hasParts ? firstName : '', lastName: hasParts ? lastName : '', whatsapp, org, role }
}

/**
 * Valide et normalise le corps de POST /payments (contrat du frontend,
 * src/services/payment.js), de POST /orders/free et de POST /orders/register.
 *
 * @param {object} body
 * @param {{ free?: boolean, register?: boolean }} mode
 *        free     : tarif gratuit ;
 *        register : billet payant, inscription AVANT le paiement sur la page TIKORA
 *                   (un participant par inscription, fiche complète obligatoire).
 */
export function parseOrderRequest(body, { free = false, register = false } = {}) {
  if (!isPlainObject(body)) throw new HttpError(400, 'Corps de requête invalide', 'INVALID_BODY')
  const direct = !free && !register // paiement Mobile Money lancé par notre serveur (API TIKORA)
  const {
    orderId, amount, currency = 'XAF', method = direct ? body.method : undefined, operator, phone,
    customer, tierId, quantity = 1, publicListing = false, attendees, lang = 'fr', card,
  } = body

  if (!ORDER_ID_RE.test(String(orderId || ''))) throw new HttpError(400, 'Identifiant de commande invalide', 'INVALID_ORDER_ID')

  if (direct) {
    // Un montant doit être explicitement fourni (contrôle de cohérence)
    if (amount === undefined || amount === null || amount === '') throw new HttpError(400, 'Montant obligatoire', 'AMOUNT_REQUIRED')
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount < 0) throw new HttpError(400, 'Montant invalide', 'INVALID_AMOUNT')
    if (!CURRENCIES.has(String(currency).toUpperCase())) throw new HttpError(400, 'Devise non supportée', 'INVALID_CURRENCY')
    if (!METHODS.has(method)) throw new HttpError(400, 'Méthode de paiement invalide', 'INVALID_METHOD')
    // TIKORA n'encaisse que Mobile Money ; et aucune donnée de carte ne doit transiter ici (PCI-DSS)
    if (method === 'card' || card !== undefined) {
      throw new HttpError(400, 'Le paiement par carte n’est pas disponible : utilisez MTN MoMo ou Orange Money', 'CARD_NOT_SUPPORTED')
    }
    if (!OPERATORS.has(operator)) throw new HttpError(400, 'Opérateur Mobile Money invalide', 'INVALID_OPERATOR')
  }

  if (!validEmail(customer?.email)) throw new HttpError(400, 'Adresse e-mail invalide', 'INVALID_EMAIL')
  const profile = parseProfile(customer, { strict: register })
  const name = profile.firstName ? cleanText(`${profile.firstName} ${profile.lastName}`, 80) : cleanText(customer?.name, 80)
  if (!isValidPersonName(name)) throw new HttpError(400, 'Nom invalide', 'INVALID_NAME')

  // Tarif : le nouveau frontend envoie tierId + quantity ; l'ancien n'envoyait que le montant
  let tier = tierId != null ? normalizeTierId(tierId) : free ? 'gratuit' : inferTierIdFromAmount(amount)
  if (!tier) throw new HttpError(400, 'Tarif inconnu ou montant incohérent', 'INVALID_TIER')
  if (free && tier !== 'gratuit') throw new HttpError(400, 'Seul le tarif gratuit est accepté ici', 'INVALID_TIER')
  if (!free && tier === 'gratuit') throw new HttpError(400, 'Le tarif gratuit ne passe pas par le paiement', 'INVALID_TIER')
  if (register && Number(quantity) !== 1) throw new HttpError(400, 'Une inscription = un participant', 'INVALID_QUANTITY')
  if (!isValidQuantity(tier, quantity)) throw new HttpError(400, 'Quantité invalide', 'INVALID_QUANTITY')
  const qty = Number(quantity)
  const unitPrice = getTicketPricing(tier).price
  if (direct && Number(amount) !== unitPrice * qty) {
    throw new HttpError(400, 'Montant de la commande incohérent ou invalide', 'AMOUNT_MISMATCH')
  }

  const payPhone = normalizePhone(phone || customer?.phone)
  if (direct && !isValidCmPhone(payPhone)) throw new HttpError(400, 'Numéro Mobile Money invalide', 'INVALID_PHONE')
  const buyerPhone = profile.whatsapp || normalizePhone(customer?.phone || phone)

  return {
    orderId,
    tierId: tier,
    quantity: qty,
    unitPrice,
    subtotal: unitPrice * qty,
    method: 'momo',
    operator: direct ? operator : null,
    payPhone: direct ? payPhone : null,
    customer: {
      name,
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: customer.email.trim(),
      phone: buyerPhone && (buyerPhone.startsWith('+') || isValidCmPhone(buyerPhone)) ? buyerPhone : payPhone || '',
      org: profile.org,
      role: profile.role,
    },
    attendees: register ? [name] : parseAttendees(attendees, name, qty),
    // Consentement EXPLICITE pour la liste publique (jamais présumé)
    publicListing: publicListing === true,
    lang: lang === 'en' ? 'en' : 'fr',
  }
}

const sameBuyer = (row, req) =>
  String(row.customer_email || '').toLowerCase() === req.customer.email.toLowerCase() &&
  normalizeTierId(row.tier_id) === req.tierId &&
  Number(row.quantity) === req.quantity

function mapProviderError(error) {
  if (error instanceof HttpError) return error
  if (error instanceof TikoraError) {
    // Événement pas encore validé par TIKORA : la vente n'est pas ouverte (≠ billets épuisés)
    if (error.code === 'EVENT_NOT_PUBLISHED') {
      return new HttpError(409, 'La vente en ligne n’est pas encore ouverte', 'SALES_NOT_OPEN')
    }
    const unavailable = ['PRICE_MISMATCH', 'TIER_NOT_MAPPED', 'CATEGORY_NOT_FOUND', 'NOT_ON_SALE', 'EVENT_NOT_FOUND', 'CATEGORY_NOT_SELLABLE']
    if (unavailable.includes(error.code) || error.status === 400) {
      return new HttpError(409, 'Billets indisponibles pour ce tarif (stock épuisé ou vente fermée)', 'TICKETS_UNAVAILABLE')
    }
    if (error.status === 429) return new HttpError(503, 'Service de paiement momentanément saturé, réessayez', 'PROVIDER_BUSY')
    if ([401, 403].includes(error.status)) logger.error('tikora.auth', { code: error.code, status: error.status })
  }
  return new HttpError(502, 'Erreur lors de l’initialisation du paiement', 'PROVIDER_ERROR')
}

// ─── Lecture ─────────────────────────────────────────────────────────────────

export const getOrderRow = (id) => get('SELECT * FROM orders WHERE id = ?', [id])
export const getPaymentRow = (id) => get('SELECT * FROM payments WHERE payment_id = ?', [id])
const latestPayment = (orderId) =>
  get('SELECT * FROM payments WHERE order_id = ? ORDER BY attempt DESC, created_at DESC LIMIT 1', [orderId])

function paymentResponse(payment, order) {
  return {
    paymentId: payment.payment_id,
    ...(payment.redirect_url ? { redirectUrl: payment.redirect_url } : {}),
    status: payment.status,
    accessToken: orderAccessToken(order.id),
    amount: Number(order.total ?? payment.amount),
    subtotal: Number(order.subtotal ?? order.total),
    fees: Number(order.fees ?? 0),
    currency: order.currency || 'XAF',
    ...(order.tikora_expires_at ? { expiresAt: order.tikora_expires_at } : {}),
  }
}

// ─── Création d'un paiement ──────────────────────────────────────────────────

export async function createPayment(body) {
  await dbReady
  const req = parseOrderRequest(body)

  return withOrderLock(req.orderId, async () => {
    let order = await getOrderRow(req.orderId)
    const previous = order ? await latestPayment(req.orderId) : null

    if (order) {
      if (!sameBuyer(order, req)) throw new HttpError(409, 'Cette commande existe déjà avec d’autres informations', 'ORDER_CONFLICT')
      if (order.status === 'free') throw new HttpError(409, 'Commande gratuite déjà enregistrée', 'ORDER_CONFLICT')
      // Idempotence : double clic / reprise réseau → même paiement, aucun second débit
      if (previous && (previous.status === 'PENDING' || previous.status === 'SUCCESSFUL')) {
        return paymentResponse(previous, order)
      }
      if (order.status === 'paid' && previous) return paymentResponse(previous, order)
      await run(
        `UPDATE orders SET customer_name = ?, customer_phone = ?, customer_org = ?, attendees_json = ?, public_listing = ?, lang = ?,
           first_name = ?, last_name = ?, customer_role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [req.customer.name, req.customer.phone, req.customer.org, JSON.stringify(req.attendees), req.publicListing ? 1 : 0, req.lang,
          req.customer.firstName, req.customer.lastName, req.customer.role, req.orderId],
      )
    } else {
      await run(
        `INSERT INTO orders (id, customer_name, customer_email, customer_phone, customer_org, tier_id, quantity,
           unit_price, subtotal, total, fees, currency, status, public_listing, attendees_json, lang, payment_mode,
           first_name, last_name, customer_role, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'XAF', 'pending', ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          req.orderId, req.customer.name, req.customer.email, req.customer.phone, req.customer.org, req.tierId, req.quantity,
          req.unitPrice, req.subtotal, req.subtotal, req.publicListing ? 1 : 0, JSON.stringify(req.attendees), req.lang, CONFIG.payment.mode,
          req.customer.firstName, req.customer.lastName, req.customer.role,
        ],
      )
    }
    order = await getOrderRow(req.orderId)

    const provider = getProvider()
    const attempt = (previous?.attempt ?? 0) + 1
    try {
      // 1. Réservation TIKORA (réutilisée tant qu'elle est payable et non expirée)
      let reuse = Boolean(order.tikora_order_id) && Date.parse(order.tikora_expires_at ?? '') - Date.now() > 60_000
      if (reuse) {
        const snap = await provider.fetchOrder(order.tikora_order_id).catch(() => null)
        reuse = Boolean(snap && PAYABLE_PROVIDER_STATUSES.has(snap.orderStatus))
        if (snap?.status === 'SUCCESSFUL') {
          await applySnapshot(order, snap)
          const paidPayment = await latestPayment(req.orderId)
          if (paidPayment) return paymentResponse(paidPayment, await getOrderRow(req.orderId))
        }
      }
      if (!reuse) {
        const sequence = Number(order.tikora_order_seq || 0) + 1
        const snap = await provider.createOrder({ ...req, sequence })
        await run(
          `UPDATE orders SET tikora_order_id = ?, tikora_order_number = ?, tikora_expires_at = ?, tikora_order_seq = ?,
             subtotal = ?, fees = ?, total = ?, status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [snap.providerOrderId, snap.orderNumber, snap.expiresAt, sequence, snap.subtotal, snap.fees, snap.total, req.orderId],
        )
        order = await getOrderRow(req.orderId)
      }

      // 2. Demande de paiement Mobile Money
      const started = await provider.startPayment({
        providerOrderId: order.tikora_order_id,
        orderId: req.orderId,
        phone: req.payPhone,
        attempt,
      })

      const paymentId = `PAY-${crypto.randomUUID()}`
      await run(
        `INSERT INTO payments (payment_id, order_id, attempt, amount, currency, method, operator, phone_masked, status, reason,
           tikora_deposit_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'XAF', 'momo', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [paymentId, req.orderId, attempt, Number(order.total), req.operator, maskPhone(req.payPhone), started.status, started.reason, started.depositId],
      )
      if (started.status === 'FAILED') await run(`UPDATE orders SET status = 'failed' WHERE id = ? AND status = 'pending'`, [req.orderId])
      logger.info('payment.created', { orderId: req.orderId, attempt, mode: CONFIG.payment.mode, status: started.status })
      return paymentResponse(await getPaymentRow(paymentId), order)
    } catch (error) {
      throw mapProviderError(error)
    }
  })
}

// ─── Synchronisation avec TIKORA ─────────────────────────────────────────────

async function storeTickets(orderId, tickets) {
  for (const t of tickets) {
    await run(
      `INSERT INTO tickets (id, order_id, ticket_code, qr_token, qr_image_url, holder_name, category, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET status = excluded.status, qr_image_url = excluded.qr_image_url`,
      [t.id, orderId, t.code, t.qrToken, t.qrImageUrl, cleanText(t.holder, 80), cleanText(t.category, 80), t.status],
    )
  }
}

/**
 * Applique l'état TIKORA à la commande locale (idempotent, transitions
 * conditionnelles). Renvoie le statut du dernier paiement.
 */
export async function applySnapshot(order, snap) {
  if (snap.status === 'SUCCESSFUL') {
    // Le DERNIER essai est marqué payé — y compris s'il avait été vu « refusé » :
    // une confirmation tardive de l'opérateur l'emporte (l'argent est encaissé).
    await run(
      `UPDATE payments SET status = 'SUCCESSFUL', transaction_id = ?, reason = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE payment_id = (SELECT payment_id FROM payments WHERE order_id = ? ORDER BY attempt DESC LIMIT 1)
         AND status != 'SUCCESSFUL'`,
      [snap.transactionId, order.id],
    )
    const changed = await run(
      `UPDATE orders SET status = 'paid', paid_at = ?, fees = ?, total = ?, tikora_order_number = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status != 'paid'`,
      [snap.confirmedAt || new Date().toISOString(), snap.fees, snap.total, snap.orderNumber, order.id],
    )
    if (snap.tickets.length) await storeTickets(order.id, snap.tickets)
    if (changed.changes === 1) {
      logger.info('order.paid', { orderId: order.id })
      dispatchReceipt(order.id).catch(() => {})
    }
    return 'SUCCESSFUL'
  }

  if (snap.status === 'FAILED') {
    // Après un refus, TIKORA laisse la commande payable : un nouvel essai (nouvelle
    // Idempotency-Key) remplace alors le paiement échoué. La demande de paiement
    // est synchrone (201) : l'état relu ensuite concerne bien le dernier essai.
    await run(
      `UPDATE payments SET status = 'FAILED', reason = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ? AND status = 'PENDING'`,
      [snap.reason, order.id],
    )
    const latest = await latestPayment(order.id)
    if (latest?.status === 'FAILED') {
      await run(`UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'`, [
        snap.orderStatus === 'expired' ? 'expired' : 'failed',
        order.id,
      ])
    }
    return latest?.status ?? 'FAILED'
  }
  return 'PENDING'
}

/** Rafraîchit une commande auprès de TIKORA (limité à un appel toutes les TIKORA_STATUS_CACHE_MS). */
export async function syncOrder(order, { force = false } = {}) {
  if (!order?.tikora_order_id || !['pending', 'failed'].includes(order.status)) return order
  const pending = await get(`SELECT * FROM payments WHERE order_id = ? AND status = 'PENDING' LIMIT 1`, [order.id])
  if (!pending && !force) return order
  if (!force && pending && Date.now() - Number(pending.last_checked_at || 0) < CONFIG.payment.statusCacheMs) return order
  await run('UPDATE payments SET last_checked_at = ? WHERE order_id = ? AND status = ?', [Date.now(), order.id, 'PENDING'])
  const snap = await getProvider().fetchOrder(order.tikora_order_id)
  await applySnapshot(order, snap)
  return getOrderRow(order.id)
}

/** Statut d'un paiement au format attendu par le frontend : { status, transactionId?, reason? } */
export async function getPaymentStatus(paymentId) {
  await dbReady
  let payment = await getPaymentRow(paymentId)
  if (!payment) return null
  if (payment.status === 'PENDING') {
    const order = await getOrderRow(payment.order_id)
    try {
      await syncOrder(order)
    } catch (error) {
      if (error instanceof TikoraError) throw new HttpError(502, 'Impossible de vérifier le paiement auprès du fournisseur', 'PROVIDER_ERROR')
      throw error
    }
    payment = await getPaymentRow(paymentId)
  }
  return {
    status: payment.status,
    ...(payment.transaction_id ? { transactionId: payment.transaction_id } : {}),
    ...(payment.reason ? { reason: payment.reason } : {}),
  }
}

/** Resynchronise depuis un webhook : le contenu du webhook n'est qu'un signal. */
export async function syncFromWebhook({ tikoraOrderId, reference }) {
  await dbReady
  let order = null
  if (tikoraOrderId) order = await get('SELECT * FROM orders WHERE tikora_order_id = ?', [tikoraOrderId])
  if (!order && reference && ORDER_ID_RE.test(reference)) order = await getOrderRow(reference)
  if (!order) return 'unknown_order'
  if (!order.tikora_order_id) return 'no_provider_order'
  const updated = await syncOrder(order, { force: true })
  return updated?.status ?? 'unknown'
}

/** Rattrapage périodique des paiements restés en attente (navigateur fermé, webhook perdu). */
export async function reconcilePending({ maxAgeMinutes = 30, limit = 50 } = {}) {
  await dbReady
  const rows = await all(
    `SELECT DISTINCT o.* FROM orders o JOIN payments p ON p.order_id = o.id
     WHERE p.status = 'PENDING' AND o.tikora_order_id IS NOT NULL
       AND p.created_at > datetime('now', ?) LIMIT ?`,
    [`-${Number(maxAgeMinutes)} minutes`, limit],
  )
  let synced = 0
  for (const order of rows) {
    try {
      await syncOrder(order, { force: true })
      synced += 1
    } catch (error) {
      logger.warn('reconcile.failed', { orderId: order.id, code: error.code })
    }
  }
  // Paiements trop anciens : la réservation TIKORA (15 min) a expiré
  await run(
    `UPDATE payments SET status = 'FAILED', reason = 'timeout', updated_at = CURRENT_TIMESTAMP
     WHERE status = 'PENDING' AND created_at <= datetime('now', ?)`,
    [`-${Number(maxAgeMinutes)} minutes`],
  )
  return synced
}

// ─── Commandes gratuites ─────────────────────────────────────────────────────

export async function createFreeOrder(body) {
  await dbReady
  const req = parseOrderRequest(body, { free: true })
  return withOrderLock(req.orderId, async () => {
    const existing = await getOrderRow(req.orderId)
    if (existing) {
      if (existing.status === 'free' && sameBuyer(existing, req)) return { orderId: existing.id, status: 'free', accessToken: orderAccessToken(existing.id) }
      throw new HttpError(409, 'Cette commande existe déjà', 'ORDER_CONFLICT')
    }
    // Anti-abus : nombre de places gratuites par adresse e-mail
    const used = await get(`SELECT COALESCE(SUM(quantity), 0) AS n FROM orders WHERE status = 'free' AND lower(customer_email) = lower(?)`, [req.customer.email])
    if (Number(used?.n) + req.quantity > CONFIG.freeOrders.maxSeatsPerEmail) {
      throw new HttpError(429, 'Nombre maximal de places gratuites atteint pour cette adresse', 'FREE_LIMIT_REACHED')
    }
    await run(
      `INSERT INTO orders (id, customer_name, customer_email, customer_phone, customer_org, tier_id, quantity, unit_price, subtotal,
         total, fees, currency, status, public_listing, attendees_json, lang, payment_mode, paid_at,
         first_name, last_name, customer_role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'gratuit', ?, 0, 0, 0, 0, 'XAF', 'free', ?, ?, ?, 'free', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [req.orderId, req.customer.name, req.customer.email, req.customer.phone, req.customer.org, req.quantity,
        req.publicListing ? 1 : 0, JSON.stringify(req.attendees), req.lang, new Date().toISOString(),
        req.customer.firstName, req.customer.lastName, req.customer.role],
    )
    await storeTickets(
      req.orderId,
      req.attendees.map((holder, i) => ({
        id: `${req.orderId}-${i + 1}`,
        code: `${req.orderId}-${i + 1}`,
        qrToken: freeTicketQrToken(req.orderId, i + 1),
        qrImageUrl: null,
        holder,
        category: 'gratuit',
        status: 'valid',
      })),
    )
    logger.info('order.free', { orderId: req.orderId, quantity: req.quantity })
    dispatchReceipt(req.orderId).catch(() => {})
    return { orderId: req.orderId, status: 'free', accessToken: orderAccessToken(req.orderId) }
  })
}

// ─── Billets payants : inscription AVANT le paiement sur la page TIKORA ─────

/** Statut d'une inscription payante dont le paiement TIKORA n'est pas encore rattaché. */
export const REGISTERED = 'registered'
/** payment_mode des billets payés sur la page TIKORA de l'événement. */
export const TIKORA_PAGE = 'tikora_page'

/**
 * Inscription à un billet payant : même formulaire que le billet gratuit (fiche
 * participant + photo). La commande attend ensuite le paiement, fait sur la page
 * TIKORA de l'événement avec la même adresse e-mail ; le serveur l'y retrouve
 * (services/webOrders.js) et la confirme. Elle n'apparaît dans la liste publique
 * qu'une fois payée.
 *
 * @returns {Promise<{ orderId: string, status: 'registered'|'paid', accessToken: string }>}
 */
export async function createRegistration(body) {
  await dbReady
  const req = parseOrderRequest(body, { register: true })
  return withOrderLock(req.orderId, async () => {
    const existing = await getOrderRow(req.orderId)
    if (existing) {
      // Double clic, reprise réseau : même inscription
      if (sameBuyer(existing, req) && [REGISTERED, 'paid'].includes(existing.status)) {
        return { orderId: existing.id, status: existing.status, accessToken: orderAccessToken(existing.id) }
      }
      throw new HttpError(409, 'Cette commande existe déjà', 'ORDER_CONFLICT')
    }
    const pending = await get(`SELECT COUNT(*) AS n FROM orders WHERE status = ? AND lower(customer_email) = lower(?)`, [REGISTERED, req.customer.email])
    if (Number(pending?.n) >= CONFIG.webOrders.maxPendingPerEmail) {
      throw new HttpError(429, 'Trop d’inscriptions en attente de paiement pour cette adresse', 'REGISTRATION_LIMIT')
    }
    await run(
      `INSERT INTO orders (id, customer_name, customer_email, customer_phone, customer_org, tier_id, quantity, unit_price, subtotal,
         total, fees, currency, status, public_listing, attendees_json, lang, payment_mode, first_name, last_name, customer_role,
         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 0, 'XAF', ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [req.orderId, req.customer.name, req.customer.email, req.customer.phone, req.customer.org, req.tierId, req.unitPrice, req.unitPrice,
        req.unitPrice, REGISTERED, req.publicListing ? 1 : 0, JSON.stringify(req.attendees), req.lang, TIKORA_PAGE,
        req.customer.firstName, req.customer.lastName, req.customer.role],
    )
    logger.info('order.registered', { orderId: req.orderId, tierId: req.tierId })
    dispatchRegistrationMail(req.orderId).catch(() => {})
    return { orderId: req.orderId, status: REGISTERED, accessToken: orderAccessToken(req.orderId) }
  })
}

/**
 * Paiement TIKORA retrouvé pour une inscription : la commande devient « payée »
 * (transition conditionnelle : une seule fois), puis l'e-mail de confirmation part.
 * Le tarif retenu est celui du billet réellement acheté chez TIKORA.
 *
 * @param {string} orderId
 * @param {{ id: string, orderNumber?: string, confirmedAt?: string }} tikoraOrder
 * @param {string} tierId  tarif JCIA de la catégorie TIKORA achetée
 * @returns {Promise<boolean>} true si la commande vient d'être confirmée
 */
export async function markRegistrationPaid(orderId, tikoraOrder, tierId) {
  const unitPrice = getTicketPricing(tierId).price
  const changed = await run(
    `UPDATE orders SET status = 'paid', paid_at = ?, tikora_order_id = ?, tikora_order_number = ?, tier_id = ?,
       unit_price = ?, subtotal = ?, total = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND status = ?`,
    [tikoraOrder.confirmedAt || new Date().toISOString(), tikoraOrder.id, tikoraOrder.orderNumber ?? null, tierId,
      unitPrice, unitPrice, unitPrice, orderId, REGISTERED],
  )
  if (changed.changes !== 1) return false
  logger.info('order.registration_paid', { orderId, orderNumber: tikoraOrder.orderNumber })
  dispatchReceipt(orderId).catch(() => {})
  return true
}

/** E-mail « finalisez votre inscription : paiement sur TIKORA » — une seule fois. */
export async function dispatchRegistrationMail(orderId) {
  const claim = await run(`UPDATE orders SET registration_mail_at = ? WHERE id = ? AND registration_mail_at IS NULL`, [new Date().toISOString(), orderId])
  if (claim.changes !== 1) return false
  try {
    const order = await getOrderRow(orderId)
    const view = await toPublicOrder(order)
    await mailerService.sendRegistrationEmail({ email: order.customer_email, lang: view.lang, order: view, accessToken: orderAccessToken(orderId) })
    return true
  } catch (error) {
    await run('UPDATE orders SET registration_mail_at = NULL WHERE id = ?', [orderId])
    logger.warn('registration.mail.failed', { orderId, error })
    return false
  }
}

// ─── Vue publique d'une commande (propriétaire muni du jeton) ────────────────

function parseJsonArray(text) {
  try {
    const v = JSON.parse(text || '[]')
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export async function toPublicOrder(order) {
  const [tickets, payment, photos] = await Promise.all([
    all('SELECT * FROM tickets WHERE order_id = ? ORDER BY created_at, id', [order.id]),
    latestPayment(order.id),
    photoSummaries(order.id),
  ])
  const free = order.status === 'free'
  return {
    id: order.id,
    status: order.status,
    tierId: normalizeTierId(order.tier_id) ?? order.tier_id,
    quantity: Number(order.quantity),
    unitPrice: Number(order.unit_price ?? 0),
    subtotal: Number(order.subtotal ?? 0),
    fees: Number(order.fees ?? 0),
    total: Number(order.total ?? 0),
    currency: order.currency || 'XAF',
    lang: order.lang === 'en' ? 'en' : 'fr',
    createdAt: order.created_at,
    customer: {
      name: order.customer_name,
      firstName: order.first_name || '',
      lastName: order.last_name || '',
      email: order.customer_email,
      org: order.customer_org || '',
      role: order.customer_role || '',
    },
    attendees: parseJsonArray(order.attendees_json),
    publicListing: order.public_listing === 1,
    free,
    payment: free
      ? { status: 'free', mode: order.payment_mode }
      : {
          status: order.status,
          method: 'momo',
          operator: payment?.operator ?? undefined,
          phoneMasked: payment?.phone_masked ?? undefined,
          transactionId: payment?.transaction_id ?? undefined,
          paidAt: order.paid_at ?? undefined,
          mode: order.payment_mode,
          reason: payment?.status === 'FAILED' ? payment.reason : undefined,
          // Billet payé sur la page TIKORA : numéro de la commande TIKORA (billets QR envoyés par TIKORA)
          tikoraOrderNumber: order.payment_mode === TIKORA_PAGE ? order.tikora_order_number ?? undefined : undefined,
        },
    tickets: tickets.map((t) => ({
      code: t.ticket_code,
      qrToken: t.qr_token,
      qrImageUrl: t.qr_image_url,
      holder: t.holder_name,
      status: t.status,
    })),
    // Photos des participants (position 1 = premier nom) : la version change à chaque nouvelle photo
    photos: photos.map((p) => ({ position: Number(p.position), version: p.version })),
  }
}

// ─── Reçu ────────────────────────────────────────────────────────────────────

export async function sendReceipt(orderId, { lang } = {}) {
  const order = await getOrderRow(orderId)
  const view = await toPublicOrder(order)
  await mailerService.sendReceiptEmail({
    email: order.customer_email,
    orderId,
    lang: lang ?? view.lang,
    order: view,
    tickets: view.tickets,
    accessToken: orderAccessToken(orderId),
  })
  await run(
    `UPDATE orders SET receipt_sent_at = COALESCE(receipt_sent_at, ?), receipt_count = COALESCE(receipt_count, 0) + 1, receipt_last_at = ? WHERE id = ?`,
    [new Date().toISOString(), Date.now(), orderId],
  )
}

/** Envoi automatique après paiement / inscription gratuite — une seule fois. */
export async function dispatchReceipt(orderId) {
  const claim = await run(`UPDATE orders SET receipt_sent_at = ? WHERE id = ? AND receipt_sent_at IS NULL`, [new Date().toISOString(), orderId])
  if (claim.changes !== 1) return false
  try {
    await sendReceipt(orderId)
    return true
  } catch (error) {
    await run('UPDATE orders SET receipt_sent_at = NULL WHERE id = ?', [orderId])
    logger.warn('receipt.auto.failed', { orderId, error })
    return false
  }
}

export { TIERS_CONFIG }
