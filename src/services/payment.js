import { CONFIG } from '@/data/config'
import { cleanText } from '@/security/sanitize'

/**
 * Service de paiement — Mobile Money (MTN MoMo / Orange Money) via le serveur
 * de billetterie JCIA, lui-même branché sur l'API Partenaire TIKORA.
 *
 * AUCUN PAIEMENT N'EST SIMULÉ : chaque commande passe par le serveur
 * (VITE_PAYMENT_API_URL), qui passe par TIKORA. Sans serveur joignable, la
 * billetterie s'affiche « momentanément indisponible » au lieu de faire semblant.
 *
 * Le navigateur ne parle JAMAIS à TIKORA : la clé partenaire reste sur le
 * serveur. Routes utilisées (voir backend/src/routes) :
 *
 *   GET  {API}/tickets            tarifs, frais TIKORA, places restantes, vente ouverte ou non
 *   POST {API}/payments           → { paymentId, status, accessToken, amount, subtotal, fees }
 *        corps : { orderId, amount, currency, method, operator, phone, tierId, quantity,
 *                  customer, attendees, publicListing, lang, description }
 *   GET  {API}/payments/:id       → { status: 'PENDING' | 'SUCCESSFUL' | 'FAILED', transactionId?, reason? }
 *   POST {API}/orders/free        inscription gratuite → { orderId, status: 'free', accessToken }
 *   GET  {API}/orders/:id         commande + billets officiels (en-tête X-Order-Token)
 *
 * Le serveur recalcule le prix, crée la commande TIKORA (réservation 15 min,
 * frais de service ajoutés par TIKORA) puis déclenche la demande de paiement
 * sur le téléphone du payeur. Le client interroge le statut toutes les 3 s.
 * TIKORA n'encaisse que Mobile Money : aucune donnée de carte n'existe sur le site.
 */

/** L'API doit être en HTTPS (sauf localhost en développement). */
function secureApiUrl(url) {
  try {
    const u = new URL(url)
    const local = ['localhost', '127.0.0.1'].includes(u.hostname) && import.meta.env.DEV
    return u.protocol === 'https:' || local ? u.href.replace(/\/$/, '') : ''
  } catch {
    return ''
  }
}

/** Adresse du serveur de billetterie ('' si VITE_PAYMENT_API_URL est absente ou refusée). */
export const API = secureApiUrl(CONFIG.payment.apiUrl)

// Configuration manquante : erreur visible dans la console (la billetterie s'affiche indisponible)
if (!API) {
  console.error(
    CONFIG.payment.apiUrl
      ? `[JCIA] VITE_PAYMENT_API_URL refusée (${CONFIG.payment.apiUrl}) : HTTPS obligatoire hors localhost. Billetterie indisponible.`
      : '[JCIA] VITE_PAYMENT_API_URL absente : le site ne peut pas joindre le serveur de billetterie. ' +
          'En local, créez .env.development.local avec VITE_PAYMENT_API_URL=http://localhost:5000',
  )
} else if (import.meta.env.DEV) {
  console.info(`[JCIA] Serveur de billetterie : ${API}`)
}

const PAYMENT_ID_RE = /^[\w-]{1,100}$/
const TOKEN_RE = /^[\w-]{20,100}$/
const STATUSES = ['PENDING', 'SUCCESSFUL', 'FAILED']
const POLL_EVERY_MS = 3000
const POLL_FOR_MS = 3 * 60 * 1000

/**
 * Appel réseau : délai maximal, sans cookies, réponse JSON vérifiée.
 * @returns {Promise<{ ok: boolean, status: number, data: any }>}
 */
export async function apiRequest(path, { method = 'GET', body, idempotencyKey, token, timeoutMs = 15_000 } = {}) {
  if (!API) return { ok: false, status: 0, data: null, unconfigured: true }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${API}${path}`, {
      method,
      signal: controller.signal,
      credentials: 'omit', // aucun cookie envoyé à l'API
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        ...(token ? { 'X-Order-Token': token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const json = (res.headers.get('content-type') ?? '').includes('application/json') ? await res.json().catch(() => null) : null
    return { ok: res.ok, status: res.status, data: json }
  } catch {
    return { ok: false, status: 0, data: null }
  } finally {
    clearTimeout(timer)
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Code d'erreur lisible renvoyé par le serveur (liste blanche côté affichage) */
const reasonOf = (res, fallback) => {
  if (res?.unconfigured) return 'UNCONFIGURED' // VITE_PAYMENT_API_URL absente
  if (res?.status === 0) return 'network' // serveur injoignable (éteint, hors ligne, CORS)
  return cleanText(res?.data?.code || res?.data?.reason || fallback, 40)
}

/**
 * Adresse de redirection renvoyée par le serveur : HTTPS et même origine que
 * l'API uniquement (une réponse altérée ne peut pas envoyer vers un site piégé).
 */
export function safeRedirectUrl(url) {
  if (!API || typeof url !== 'string') return ''
  try {
    const u = new URL(url, API)
    return u.protocol === 'https:' && u.origin === new URL(API).origin ? u.href : ''
  } catch {
    return ''
  }
}

/**
 * Catalogue servi par le serveur (frais TIKORA, stock, vente ouverte).
 * @returns {Promise<object|null>} null si le serveur est injoignable ou non configuré
 */
export async function fetchCatalog() {
  if (!API) return null
  const res = await apiRequest('/tickets', { timeoutMs: 8000 })
  return res.ok && res.data && Array.isArray(res.data.tiers) ? res.data : null
}

/** Commande vue par le serveur (billets officiels inclus), ou null. */
export async function fetchServerOrder(orderId, token) {
  if (!TOKEN_RE.test(token ?? '')) return null
  const res = await apiRequest(`/orders/${encodeURIComponent(orderId)}`, { token })
  return res.ok && res.data?.id === orderId ? res.data : null
}

/**
 * Billet payé sur la page TIKORA : vérification par le serveur (numéro de commande
 * TIKORA + e-mail utilisé sur TIKORA), qui renvoie la commande JCIA correspondante.
 * @returns {Promise<{ ok: true, orderId: string, accessToken: string, order: object } | { ok: false, reason: string }>}
 */
export async function claimTikoraOrder({ orderNumber, email, publicListing, lang }) {
  if (!API) return { ok: false, reason: 'unavailable' }
  const res = await apiRequest('/orders/tikora-claim', {
    method: 'POST',
    body: { orderNumber: cleanText(orderNumber, 40), email: cleanText(email, 254), publicListing: publicListing === true, lang },
    timeoutMs: 30_000,
  })
  if (res.ok && TOKEN_RE.test(res.data?.accessToken ?? '') && res.data?.order) return { ok: true, ...res.data }
  const reason =
    res.status === 0 ? 'network' : res.status === 429 ? 'rate' : { ORDER_NOT_FOUND: 'notFound', ORDER_NOT_PAID: 'notPaid', INVALID_CLAIM: 'invalid' }[res.data?.code] ?? 'server'
  return { ok: false, reason }
}

/** Inscription gratuite enregistrée par le serveur. */
export async function registerFreeOrder(order) {
  const res = await apiRequest('/orders/free', {
    method: 'POST',
    idempotencyKey: order.id,
    body: {
      orderId: order.id,
      tierId: order.tierId,
      quantity: order.quantity,
      customer: order.customer,
      attendees: order.attendees,
      publicListing: order.publicListing,
      lang: order.lang,
    },
  })
  if (!res.ok || !TOKEN_RE.test(res.data?.accessToken ?? '')) return { status: 'FAILED', reason: reasonOf(res, 'init') }
  return { status: 'free', accessToken: res.data.accessToken }
}

/**
 * Lance un paiement Mobile Money via le serveur (TIKORA) et suit son avancement.
 * @param {object}   params  { orderId, amount, currency, operator, phone, tierId, quantity, customer, attendees, publicListing, lang, description }
 * @param {function} onStep  (step, info) — step : 'initiating' | 'awaiting' | 'confirming' ;
 *                           info : { amount, fees } réellement débités
 * @returns {Promise<{ status: 'SUCCESSFUL'|'FAILED'|'PENDING', transactionId?, reason?, accessToken?, amount?, fees? }>}
 */
export async function processPayment(params, onStep = () => {}) {
  onStep('initiating')
  // Strict nécessaire (minimisation des données) — jamais de données de carte
  const created = await apiRequest('/payments', {
    method: 'POST',
    idempotencyKey: params.orderId,
    body: {
      orderId: params.orderId,
      amount: params.amount,
      currency: params.currency,
      method: 'momo',
      operator: params.operator,
      phone: params.phone,
      tierId: params.tierId,
      quantity: params.quantity,
      customer: {
        name: params.customer?.name,
        email: params.customer?.email,
        phone: params.customer?.phone,
        org: params.customer?.org,
      },
      attendees: params.attendees,
      publicListing: params.publicListing === true,
      lang: params.lang,
      description: params.description,
    },
  })
  const paymentId = created.data?.paymentId
  if (!created.ok || typeof paymentId !== 'string' || !PAYMENT_ID_RE.test(paymentId)) {
    return { status: 'FAILED', reason: reasonOf(created, 'init') }
  }
  const extra = {
    accessToken: TOKEN_RE.test(created.data.accessToken ?? '') ? created.data.accessToken : undefined,
    amount: Number.isFinite(created.data.amount) ? created.data.amount : undefined,
    fees: Number.isFinite(created.data.fees) ? created.data.fees : undefined,
  }

  if (created.data.redirectUrl) {
    const url = safeRedirectUrl(created.data.redirectUrl)
    if (!url) return { status: 'FAILED', reason: 'init', ...extra }
    window.location.assign(url)
    return { status: 'PENDING', ...extra }
  }
  if (created.data.status === 'FAILED') return { status: 'FAILED', reason: 'PAYMENT_NOT_APPROVED', ...extra }

  onStep('awaiting', { amount: extra.amount, fees: extra.fees })
  const deadline = Date.now() + POLL_FOR_MS
  while (Date.now() < deadline) {
    await wait(POLL_EVERY_MS)
    const res = await apiRequest(`/payments/${encodeURIComponent(paymentId)}`)
    if (!res.ok || !STATUSES.includes(res.data?.status)) continue
    if (res.data.status === 'SUCCESSFUL') {
      onStep('confirming')
      return { status: 'SUCCESSFUL', transactionId: cleanText(res.data.transactionId, 80), ...extra }
    }
    if (res.data.status === 'FAILED') return { status: 'FAILED', reason: cleanText(res.data.reason, 40), ...extra }
  }
  // Pas de réponse dans le délai : le paiement peut encore aboutir (le serveur
  // continue de le suivre et enverra l'e-mail) — on ne le déclare PAS échoué.
  return { status: 'PENDING', ...extra }
}
