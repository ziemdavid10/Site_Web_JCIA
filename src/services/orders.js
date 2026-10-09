import { CONFIG } from '@/data/config'
import { getTicketPrice } from '@/utils/tickets'
import { storage } from '@/utils/storage'
import { ORDER_ID_RE, cleanText } from '@/security/sanitize'

/**
 * Commandes de billets.
 *
 * Copie locale (localStorage) des commandes passées sur cet appareil : elle
 * sert à l'affichage hors ligne. La commande fait foi sur le SERVEUR : la page
 * de confirmation la relit (GET /orders/:id + jeton d'accès) pour obtenir le
 * statut et les QR codes officiels émis par TIKORA. Les anciennes commandes
 * « de démonstration » (paiement simulé) sont ignorées.
 *
 * Structure d'une commande :
 * {
 *   id, createdAt, lang,
 *   tierId, quantity, unitPrice, total, currency,
 *   customer: { name, firstName, lastName, email, phone (WhatsApp), org, role },
 *   attendees: [ 'Nom 1', 'Nom 2', … ],
 *   publicListing: true | false,   // accord pour figurer dans la liste publique
 *   payment: { method: 'momo', operator, phone,
 *              status: 'free'|'registered'|'pending'|'paid'|'failed', transactionId, paidAt, mode: 'live',
 *              fees, amountPaid,
 *              via: 'tikora' (billet payé sur la page TIKORA), tikoraOrderNumber },
 *           'registered' = billet payant : inscription enregistrée, paiement TIKORA attendu
 *   accessToken: jeton remis par le serveur (consultation des billets),
 *   tickets: [{ code, qrToken, holder, status }]  billets officiels (mode réel),
 *   photos: [{ position, version }]  photos des participants connues du serveur
 *           (la photo elle-même est gardée à part : src/services/photos.js),
 * }
 */

const KEY = CONFIG.storage.orders
const MAX_ORDERS = 20 // limite la taille des données gardées sur l'appareil
const TIER_IDS = CONFIG.tickets.tiers.map((t) => t.id)
const STATUSES = ['free', 'registered', 'pending', 'paid', 'failed']
const OPERATORS = CONFIG.payment.operators.map((o) => o.id)
const TOKEN_RE = /^[\w-]{20,100}$/
const TICKET_STATUSES = ['valid', 'used', 'cancelled', 'expired']
const VERSION_RE = /^[\w-]{1,40}$/
const amountOrUndefined = (v) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Math.max(0, Math.round(Number(v))) : undefined)

/**
 * Sécurité : le stockage local peut être modifié à la main par n'importe qui.
 * Chaque commande relue est donc vérifiée (format, valeurs autorisées, cohérence
 * du montant) ; toute commande douteuse est ignorée. Les textes sont nettoyés.
 * ⚠️ Cela protège l'affichage, pas la vente : seul le serveur fait foi en production.
 */
function sanitizeOrder(o) {
  if (!o || typeof o !== 'object') return null
  if (!ORDER_ID_RE.test(o.id) || !TIER_IDS.includes(o.tierId)) return null
  const tier = CONFIG.tickets.tiers.find((t) => t.id === o.tierId)
  const quantity = Number(o.quantity)
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > tier.maxQty) return null
  const unitPrice = getTicketPrice(tier, o.createdAt)
  if (Number(o.total) !== unitPrice * quantity) return null // montant falsifié
  const p = o.payment ?? {}
  if (p.mode !== 'live') return null // ancienne commande de démonstration : ignorée
  if (!STATUSES.includes(p.status)) return null
  if (p.status === 'free' && unitPrice !== 0) return null
  if (p.operator && !OPERATORS.includes(p.operator)) return null
  const attendees = Array.isArray(o.attendees) ? o.attendees.slice(0, quantity).map((a) => cleanText(a, 80)) : []
  if (attendees.length !== quantity) return null
  const tickets = Array.isArray(o.tickets)
    ? o.tickets.slice(0, 50).map((t) => ({
        code: cleanText(t?.code, 60),
        qrToken: cleanText(t?.qrToken, 300),
        holder: cleanText(t?.holder, 80),
        status: TICKET_STATUSES.includes(t?.status) ? t.status : 'valid',
      })).filter((t) => t.qrToken)
    : []
  return {
    id: o.id,
    createdAt: cleanText(o.createdAt, 40),
    lang: o.lang === 'en' ? 'en' : 'fr',
    tierId: o.tierId,
    quantity,
    unitPrice,
    total: unitPrice * quantity,
    currency: CONFIG.tickets.currency,
    customer: {
      name: cleanText(o.customer?.name, 80),
      firstName: cleanText(o.customer?.firstName, 40),
      lastName: cleanText(o.customer?.lastName, 40),
      email: cleanText(o.customer?.email, 254),
      phone: cleanText(o.customer?.phone, 20).replace(/(?!^\+)[^\d]/g, ''), // numéro WhatsApp (+… si étranger)
      org: cleanText(o.customer?.org, 120),
      role: cleanText(o.customer?.role, 80),
    },
    attendees,
    // Consentement explicite pour apparaître dans la liste publique des participants
    publicListing: o.publicListing === true,
    accessToken: TOKEN_RE.test(String(o.accessToken ?? '')) ? o.accessToken : undefined,
    tickets,
    photos: Array.isArray(o.photos)
      ? o.photos
          .filter((p) => Number.isInteger(p?.position) && p.position >= 1 && p.position <= quantity && VERSION_RE.test(p?.version ?? ''))
          .map((p) => ({ position: p.position, version: p.version }))
      : [],
    payment: {
      status: p.status,
      method: 'momo',
      mode: 'live',
      operator: p.operator ?? undefined,
      phone: p.phone ? cleanText(p.phone, 20).replace(/\D/g, '') : undefined,
      transactionId: p.transactionId ? cleanText(p.transactionId, 80) : undefined,
      paidAt: p.paidAt ? cleanText(p.paidAt, 40) : undefined,
      reason: p.reason ? cleanText(p.reason, 40) : undefined,
      // Frais de service TIKORA et montant réellement débité (mode réel)
      fees: amountOrUndefined(p.fees),
      amountPaid: amountOrUndefined(p.amountPaid),
      // Billet payé sur la page TIKORA (inscription faite sur le site)
      via: p.via === 'tikora' ? 'tikora' : undefined,
      tikoraOrderNumber: /^[A-Z0-9][A-Z0-9-]{3,39}$/.test(p.tikoraOrderNumber ?? '') ? p.tikoraOrderNumber : undefined,
    },
  }
}

const SERVER_STATUS = { paid: 'paid', free: 'free', registered: 'registered', pending: 'pending', failed: 'failed', expired: 'failed', cancelled: 'failed' }

/**
 * Convertit la commande renvoyée par le serveur (GET /orders/:id) au format
 * local, puis l'enregistre sur l'appareil. Sert aussi à retrouver une
 * commande depuis le lien du reçu e-mail (autre appareil).
 */
export function saveServerOrder(server, accessToken) {
  if (!server || !ORDER_ID_RE.test(server.id ?? '')) return null
  if (server.payment?.mode === 'demo') return null // commande de l'ancien mode démonstration
  const created = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(server.createdAt ?? '')
    ? `${server.createdAt.replace(' ', 'T')}Z`
    : server.createdAt
  const status = SERVER_STATUS[server.status] ?? 'pending'
  // Données connues seulement de cet appareil (numéro complet, carte simulée) : conservées
  const local = getOrder(server.id)
  try {
    return saveOrder({
      id: server.id,
      createdAt: created,
      lang: server.lang,
      tierId: server.tierId,
      quantity: server.quantity,
      total: Number(server.unitPrice) * Number(server.quantity),
      customer: { ...server.customer, phone: local?.customer?.phone ?? '' },
      // (le numéro WhatsApp n'est pas renvoyé par le serveur : celui de l'appareil est conservé)
      attendees: server.attendees?.length === server.quantity ? server.attendees : Array.from({ length: server.quantity }, () => server.customer?.name ?? ''),
      publicListing: server.publicListing === true,
      accessToken,
      tickets: server.tickets,
      photos: server.photos,
      payment: {
        status,
        method: 'momo',
        operator: server.payment?.operator ?? local?.payment?.operator,
        phone: local?.payment?.phone,
        transactionId: server.payment?.transactionId,
        paidAt: server.payment?.paidAt,
        reason: server.payment?.reason,
        mode: 'live',
        fees: server.fees,
        amountPaid: server.total,
        via: server.payment?.mode === 'tikora_page' ? 'tikora' : undefined,
        tikoraOrderNumber: server.payment?.tikoraOrderNumber,
      },
    })
  } catch {
    return null
  }
}

export function listOrders() {
  const raw = storage.getJSON(KEY)
  return Array.isArray(raw) ? raw.map(sanitizeOrder).filter(Boolean) : []
}

export function getOrder(id) {
  if (!ORDER_ID_RE.test(id ?? '')) return null // identifiant venu de l'URL : format strict
  return listOrders().find((o) => o.id === id) ?? null
}

export function saveOrder(order) {
  const clean = sanitizeOrder(order)
  if (!clean) throw new Error('Commande invalide')
  const others = listOrders().filter((o) => o.id !== clean.id)
  storage.setJSON(KEY, [clean, ...others].slice(0, MAX_ORDERS))
  return clean
}

/** Commande confirmée = payée, ou billet gratuit validé */
export function isConfirmed(order) {
  return ['paid', 'free'].includes(order?.payment?.status)
}

/** Billet payant dont le paiement sur la page TIKORA est attendu. */
export function isAwaitingPayment(order) {
  return order?.payment?.status === 'registered'
}

/**
 * Le visuel « J'y serai » est ouvert à TOUS les participants confirmés : billet
 * payant validé ou inscription gratuite. Sa couleur dépend du tarif choisi.
 */
export function canGenerateFlyer(order) {
  return isConfirmed(order)
}

/** Dernière commande donnant droit au visuel (billet confirmé, gratuit ou payant) */
export function latestConfirmedOrder() {
  return listOrders().find(canGenerateFlyer) ?? null
}

/** Identifiant lisible : JCIA27-7K3F9Q */
export function newOrderId() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sans caractères ambigus (0/O, 1/I)
  const rand = crypto.getRandomValues(new Uint8Array(6))
  return `JCIA27-${[...rand].map((n) => alphabet[n % alphabet.length]).join('')}`
}

/** Met à jour, sur l'appareil, la version de la photo d'un participant (null = retirée). */
export function setOrderPhoto(orderId, position, version) {
  const order = getOrder(orderId)
  if (!order) return null
  const photos = order.photos.filter((p) => p.position !== position)
  if (version) photos.push({ position, version })
  return saveOrder({ ...order, photos: photos.sort((a, b) => a.position - b.position) })
}

