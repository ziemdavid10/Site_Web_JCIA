import crypto from 'node:crypto'
import { CONFIG } from '../config/env.js'
import { all, get, run, dbReady } from '../database/db.js'
import { tikora } from './tikoraClient.js'
import { mailerService } from './mailer.js'
import { logger } from '../utils/logger.js'
import { HttpError } from '../utils/errors.js'
import { getTicketPricing } from '../utils/pricing.js'
import { orderAccessToken } from './security.js'
import { REGISTERED, getOrderRow, markRegistrationPaid, toPublicOrder } from './orders.js'

/**
 * Achats faits sur la PAGE TIKORA de l'événement (le site renvoie les acheteurs
 * des billets payants vers https://tikora.proditech.online/evenements/…).
 *
 * TIKORA n'offre ni retour vers notre site ni notification dédiée : le serveur
 * relit régulièrement les commandes du compte partenaire (GET /orders), et
 * réagit aussi aux webhooks « order.paid ». Pour chaque commande PAYÉE de
 * l'événement JCIA, il envoie UNE fois à l'acheteur l'e-mail contenant le lien
 * du formulaire participant (ATTENDEE_FORM_URL).
 *
 *   • le statut « payé » vient uniquement de TIKORA, relu avec notre clé ;
 *   • commandes passées par notre site (référence JCIA27-…) : ignorées, elles ont
 *     déjà leur propre récapitulatif ;
 *   • commandes antérieures à TIKORA_WEB_SYNC_SINCE : ignorées ;
 *   • envoi enregistré en base : jamais deux fois, nouvelle tentative si le SMTP échoue
 *     (5 au plus).
 */

const MAX_ATTEMPTS = 5
const OUR_REFERENCE = /^JCIA27-[A-Z0-9]{6}$/
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i
let running = null
let lastSyncAt = 0

/** La commande TIKORA concerne-t-elle un achat à traiter ? */
export function isWebOrderToNotify(o) {
  if (!o || typeof o !== 'object') return false
  if (o.eventId !== CONFIG.payment.eventId || o.status !== 'paid') return false
  if (o.livemode === false) return false // commande de test TIKORA
  if (typeof o.reference === 'string' && OUR_REFERENCE.test(o.reference)) return false
  const created = Date.parse(o.createdAt ?? '')
  if (CONFIG.webOrders.since && Number.isFinite(created) && created < CONFIG.webOrders.since) return false
  return EMAIL_RE.test(String(o.buyer?.email ?? '').trim())
}

/** Enregistre la commande et envoie le formulaire si ce n'est pas déjà fait. */
export async function processWebOrder(o) {
  if (!isWebOrderToNotify(o)) return 'ignored'
  await dbReady
  const email = String(o.buyer.email).trim()
  await run(
    `INSERT OR IGNORE INTO tikora_web_orders (tikora_order_id, order_number, buyer_name, buyer_email, total, tikora_created_at, seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [o.id, o.orderNumber ?? null, String(o.buyer?.fullName ?? '').slice(0, 120), email, Number(o.total) || 0, o.createdAt ?? null, new Date().toISOString()],
  )
  // Inscription(s) faite(s) sur le site avec la même adresse : le paiement leur est
  // rattaché et l'e-mail de confirmation (lien du formulaire inclus) part pour chacune.
  // L'e-mail générique ci-dessous n'est alors pas nécessaire.
  const linked = await linkRegistrations(o)
  if (await linkedCount(o.id)) {
    await run('UPDATE tikora_web_orders SET form_sent_at = COALESCE(form_sent_at, ?), sending_at = NULL WHERE tikora_order_id = ?', [new Date().toISOString(), o.id])
    return linked ? 'linked' : 'already_done'
  }
  // Réservation atomique de l'envoi : sondage et webhook simultanés n'envoient qu'un e-mail.
  // Une réservation de plus de 10 min (arrêt brutal pendant l'envoi) peut être reprise.
  const now = Date.now()
  const claim = await run(
    `UPDATE tikora_web_orders SET form_attempts = form_attempts + 1, sending_at = ?
     WHERE tikora_order_id = ? AND form_sent_at IS NULL AND form_attempts < ?
       AND (sending_at IS NULL OR sending_at < ?)`,
    [now, o.id, MAX_ATTEMPTS, now - 10 * 60_000],
  )
  if (claim.changes === 0) return 'already_done'
  try {
    await mailerService.sendAttendeeFormEmail({ email, name: o.buyer?.fullName, orderNumber: o.orderNumber ?? o.id, total: o.total })
    await run('UPDATE tikora_web_orders SET form_sent_at = ?, last_error = NULL, sending_at = NULL WHERE tikora_order_id = ?', [new Date().toISOString(), o.id])
    logger.info('web_order.form_sent', { orderNumber: o.orderNumber })
    return 'sent'
  } catch (error) {
    await run('UPDATE tikora_web_orders SET last_error = ?, sending_at = NULL WHERE tikora_order_id = ?', [String(error.message ?? 'erreur').slice(0, 200), o.id])
    logger.warn('web_order.form_failed', { orderNumber: o.orderNumber, error })
    return 'failed'
  }
}

/**
 * Parcourt les commandes du compte partenaire et traite celles qui sont payées.
 * @returns {Promise<{ scanned: number, sent: number, failed: number }>}
 */
export function syncWebOrders() {
  // Un seul parcours à la fois (minuterie + webhooks + participants qui attendent sur le site)
  running ??= (async () => {
    lastSyncAt = Date.now()
    const stats = { scanned: 0, sent: 0, failed: 0, linked: 0 }
    for (let page = 1; page <= CONFIG.webOrders.maxPages; page += 1) {
      const res = await tikora.listOrders({ page, limit: 100 })
      const items = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : []
      for (const o of items) {
        stats.scanned += 1
        const result = await processWebOrder(o)
        if (result === 'sent') stats.sent += 1
        if (result === 'failed') stats.failed += 1
        if (result === 'linked') stats.linked += 1
      }
      const totalPages = Number(res?.meta?.totalPages) || 1
      if (items.length < 100 || page >= totalPages) break
    }
    if (stats.sent || stats.failed || stats.linked) logger.info('web_orders.synced', stats)
    return stats
  })().finally(() => {
    running = null
  })
  return running
}

/** Webhook pour une commande inconnue de notre site : relue chez TIKORA, puis traitée. */
export async function handleWebOrderWebhook(tikoraOrderId) {
  let order
  try {
    order = await tikora.getOrder(tikoraOrderId)
  } catch (error) {
    // Identifiant inconnu de TIKORA (faux webhook) : rien à faire, même réponse au client
    if (error.status === 404) return 'not_found'
    throw error
  }
  return processWebOrder(order)
}

/** Inscriptions payantes en attente du paiement TIKORA (outil d'administration). */
export async function pendingRegistrations() {
  await dbReady
  return all(
    `SELECT id, customer_name, customer_email, tier_id, created_at FROM orders WHERE status = ? ORDER BY datetime(created_at) DESC`,
    [REGISTERED],
  )
}

/** État des envois (outil d'administration). */
export async function webOrdersReport() {
  await dbReady
  return all(
    `SELECT order_number, buyer_name, buyer_email, total, tikora_created_at, form_sent_at, form_attempts, last_error
     FROM tikora_web_orders ORDER BY COALESCE(tikora_created_at, seen_at) DESC`,
  )
}

/** Remet une commande en file d'envoi (adresse corrigée chez TIKORA, SMTP réparé…). */
export async function resetWebOrder(orderNumber) {
  await dbReady
  const row = await get('SELECT tikora_order_id FROM tikora_web_orders WHERE order_number = ?', [orderNumber])
  if (!row) return false
  await run('UPDATE tikora_web_orders SET form_sent_at = NULL, form_attempts = 0, last_error = NULL, sending_at = NULL WHERE tikora_order_id = ?', [row.tikora_order_id])
  return true
}

// ─── Rattachement d'un achat TIKORA à notre site (visuel, photo, liste) ────────

const ORDER_NUMBER_RE = /^[A-Z0-9][A-Z0-9-]{3,39}$/
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const notFound = () => new HttpError(404, 'Commande introuvable, ou adresse e-mail différente de celle utilisée sur TIKORA', 'ORDER_NOT_FOUND')

function newOrderId() {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return `JCIA27-${[...bytes].map((n) => ALPHABET[n % ALPHABET.length]).join('')}`
}

/** Tarif JCIA d'une catégorie TIKORA (TIKORA_CATEGORY_MAP, format simple ou par période). */
export function tierOfCategory(categoryId) {
  for (const [tier, entry] of Object.entries(CONFIG.payment.categoryMap)) {
    const ids = typeof entry === 'string' ? [entry] : entry && typeof entry === 'object' ? Object.values(entry) : []
    if (ids.includes(categoryId)) return tier
  }
  return null
}

/** Commande TIKORA par numéro (ORD-…) : table locale, sinon parcours des commandes du compte. */
async function findTikoraOrder(orderNumber) {
  const row = await get('SELECT tikora_order_id FROM tikora_web_orders WHERE order_number = ?', [orderNumber])
  if (row) return tikora.getOrder(row.tikora_order_id)
  for (let page = 1; page <= CONFIG.webOrders.maxPages; page += 1) {
    const res = await tikora.listOrders({ page, limit: 100 })
    const items = Array.isArray(res?.items) ? res.items : []
    const hit = items.find((o) => String(o.orderNumber).toUpperCase() === orderNumber)
    if (hit) return hit
    if (items.length < 100 || page >= (Number(res?.meta?.totalPages) || 1)) break
  }
  return null
}

/**
 * Billet payé sur la page TIKORA : la personne donne son numéro de commande et
 * l'adresse e-mail utilisée sur TIKORA. Le serveur VÉRIFIE chez TIKORA (commande
 * de notre événement, payée, même e-mail), puis crée — ou retrouve — la commande
 * JCIA correspondante : visuel « J'y serai », photo et liste des participants
 * fonctionnent alors comme pour un billet gratuit. Un participant par rattachement
 * (l'acheteur, nom tel qu'enregistré chez TIKORA).
 *
 * @returns {Promise<{ orderId: string, accessToken: string, order: object }>}
 */
export async function claimWebOrder({ orderNumber, email, publicListing, lang }) {
  const number = String(orderNumber ?? '').trim().toUpperCase()
  const mail = String(email ?? '').trim().toLowerCase()
  if (!ORDER_NUMBER_RE.test(number) || !EMAIL_RE.test(mail)) throw new HttpError(400, 'Numéro de commande ou e-mail invalide', 'INVALID_CLAIM')
  await dbReady

  const o = await findTikoraOrder(number)
  // Même réponse si la commande n'existe pas ou si l'e-mail diffère (pas d'énumération)
  if (!o || o.eventId !== CONFIG.payment.eventId || String(o.buyer?.email ?? '').trim().toLowerCase() !== mail) throw notFound()
  if (o.status !== 'paid') throw new HttpError(409, 'Cette commande n’est pas encore payée', 'ORDER_NOT_PAID')
  if (o.livemode === false) throw notFound()
  const tier = tierOfCategory(o.items?.[0]?.ticketCategoryId)
  if (!tier) throw new HttpError(422, 'Billet non reconnu', 'UNKNOWN_TICKET')

  await run(
    `INSERT OR IGNORE INTO tikora_web_orders (tikora_order_id, order_number, buyer_name, buyer_email, total, tikora_created_at, seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [o.id, o.orderNumber, String(o.buyer?.fullName ?? '').slice(0, 120), String(o.buyer.email).trim(), Number(o.total) || 0, o.createdAt ?? null, new Date().toISOString()],
  )
  // Commande JCIA déjà liée à cet achat pour cette adresse (inscription du site confirmée,
  // ou rattachement précédent depuis un autre appareil) : on la renvoie.
  const mine = await get(
    'SELECT id FROM orders WHERE tikora_order_id = ? AND lower(customer_email) = ? ORDER BY datetime(created_at) LIMIT 1',
    [o.id, mail],
  )
  let orderId = mine?.id

  if (orderId) {
    // Le choix de figurer dans la liste peut être mis à jour
    if (typeof publicListing === 'boolean') await run('UPDATE orders SET public_listing = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [publicListing ? 1 : 0, orderId])
  } else {
    if ((await linkedCount(o.id)) >= ticketCount(o)) {
      throw new HttpError(409, 'Tous les billets de cette commande TIKORA sont déjà attribués', 'ORDER_ALREADY_USED')
    }
    orderId = newOrderId()
    const name = String(o.buyer?.fullName ?? '').trim().slice(0, 80) || 'Participant'
    const unitPrice = getTicketPricing(tier).price
    await run(
      `INSERT INTO orders (id, customer_name, customer_email, customer_phone, customer_org, tier_id, quantity, unit_price, subtotal,
         total, fees, currency, status, public_listing, attendees_json, lang, payment_mode, tikora_order_id, tikora_order_number,
         paid_at, created_at, updated_at)
       VALUES (?, ?, ?, '', '', ?, 1, ?, ?, ?, ?, 'XAF', 'paid', ?, ?, ?, 'tikora_page', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [orderId, name, String(o.buyer.email).trim(), tier, unitPrice, unitPrice, unitPrice, 0,
        publicListing ? 1 : 0, JSON.stringify([name]), lang === 'en' ? 'en' : 'fr', o.id, o.orderNumber, o.payment?.confirmedAt ?? new Date().toISOString()],
    )
    await run('UPDATE tikora_web_orders SET jcia_order_id = COALESCE(jcia_order_id, ?) WHERE tikora_order_id = ?', [orderId, o.id])
    logger.info('web_order.claimed', { orderNumber: o.orderNumber, orderId })
  }
  return { orderId, accessToken: orderAccessToken(orderId), order: await toPublicOrder(await getOrderRow(orderId)) }
}

// ─── Inscriptions du site ↔ paiements faits sur la page TIKORA ────────────────

const lower = (v) => String(v ?? '').trim().toLowerCase()

/** Nombre de billets de la commande TIKORA (une inscription du site par billet au plus). */
export function ticketCount(o) {
  const n = (Array.isArray(o?.items) ? o.items : []).reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0)
  return Math.max(1, n)
}

/** Commandes JCIA déjà rattachées à une commande TIKORA. */
async function linkedCount(tikoraOrderId) {
  const row = await get('SELECT COUNT(*) AS n FROM orders WHERE tikora_order_id = ?', [tikoraOrderId])
  return Number(row?.n) || 0
}

/** Tarif JCIA du billet acheté chez TIKORA (première ligne de la commande). */
const tierOfOrder = (o) => tierOfCategory(o?.items?.[0]?.ticketCategoryId)

/**
 * Rattache automatiquement un paiement TIKORA aux inscriptions faites sur le site
 * avec la MÊME adresse e-mail (les plus anciennes d'abord, celles du même tarif en
 * priorité), dans la limite du nombre de billets achetés.
 * @returns {Promise<number>} inscriptions confirmées
 */
export async function linkRegistrations(o) {
  if (!isWebOrderToNotify(o)) return 0
  const tier = tierOfOrder(o)
  if (!tier) {
    logger.warn('web_order.unknown_category', { orderNumber: o.orderNumber })
    return 0
  }
  const remaining = ticketCount(o) - (await linkedCount(o.id))
  if (remaining <= 0) return 0
  const candidates = await all(
    `SELECT id FROM orders WHERE status = ? AND lower(customer_email) = ?
     ORDER BY CASE WHEN tier_id = ? THEN 0 ELSE 1 END, datetime(created_at) ASC LIMIT ?`,
    [REGISTERED, lower(o.buyer?.email), tier, remaining],
  )
  let linked = 0
  for (const { id } of candidates) {
    if (await markRegistrationPaid(id, { id: o.id, orderNumber: o.orderNumber, confirmedAt: o.payment?.confirmedAt }, tier)) linked += 1
  }
  return linked
}

/**
 * Participant qui attend sur la page du site après avoir payé : le serveur relit
 * les commandes TIKORA (au plus une fois toutes les TIKORA_LOOKUP_MIN_INTERVAL_MS,
 * tous participants confondus — un parcours confirme toutes les inscriptions).
 */
export async function refreshRegistration(order) {
  if (order?.status !== REGISTERED) return order
  if (Date.now() - lastSyncAt >= CONFIG.webOrders.lookupMinIntervalMs) {
    const sync = syncWebOrders().catch((error) => logger.warn('registration.lookup_failed', { code: error.code }))
    await Promise.race([sync, new Promise((resolve) => setTimeout(resolve, 10_000).unref?.())])
  }
  return getOrderRow(order.id)
}

/**
 * Rattachement MANUEL : le participant indique le numéro de sa commande TIKORA
 * (ORD-…) et l'adresse e-mail utilisée sur TIKORA (utile s'il en a utilisé une
 * autre que celle de son inscription). Vérifié chez TIKORA.
 * @returns {Promise<object>} commande au format public (payée)
 */
export async function linkRegistrationByNumber({ orderId, orderNumber, email, admin = false }) {
  const number = String(orderNumber ?? '').trim().toUpperCase()
  const mail = lower(email)
  // admin : rattachement fait par l'équipe (npm run tikora -- link), sans contrôle de l'e-mail
  if (!ORDER_NUMBER_RE.test(number) || (!admin && !EMAIL_RE.test(mail))) throw new HttpError(400, 'Numéro de commande ou e-mail invalide', 'INVALID_CLAIM')
  await dbReady
  const order = await getOrderRow(orderId)
  if (!order) throw new HttpError(404, 'Commande introuvable', 'ORDER_NOT_FOUND')
  if (order.status === 'paid') return toPublicOrder(order) // déjà confirmée (automatiquement, entre-temps)
  if (order.status !== REGISTERED) throw new HttpError(409, 'Cette inscription ne peut pas être rattachée', 'ORDER_CONFLICT')

  const o = await findTikoraOrder(number)
  if (!o || o.eventId !== CONFIG.payment.eventId || o.livemode === false || (!admin && lower(o.buyer?.email) !== mail)) throw notFound()
  if (typeof o.reference === 'string' && OUR_REFERENCE.test(o.reference)) throw notFound()
  if (o.status !== 'paid') throw new HttpError(409, 'Cette commande n’est pas encore payée', 'ORDER_NOT_PAID')
  const tier = tierOfOrder(o)
  if (!tier) throw new HttpError(422, 'Billet non reconnu', 'UNKNOWN_TICKET')
  await run(
    `INSERT OR IGNORE INTO tikora_web_orders (tikora_order_id, order_number, buyer_name, buyer_email, total, tikora_created_at, seen_at, form_sent_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [o.id, o.orderNumber, String(o.buyer?.fullName ?? '').slice(0, 120), String(o.buyer.email).trim(), Number(o.total) || 0, o.createdAt ?? null,
      new Date().toISOString(), new Date().toISOString()],
  )
  if ((await linkedCount(o.id)) >= ticketCount(o)) {
    throw new HttpError(409, 'Tous les billets de cette commande TIKORA sont déjà attribués', 'ORDER_ALREADY_USED')
  }
  await markRegistrationPaid(orderId, { id: o.id, orderNumber: o.orderNumber, confirmedAt: o.payment?.confirmedAt }, tier)
  return toPublicOrder(await getOrderRow(orderId))
}
