import { CONFIG } from '@/data/config'
import { cleanText } from '@/security/sanitize'

/**
 * Service de paiement — Mobile Money (MTN MoMo / Orange Money) via le serveur
 * de billetterie JCIA, lui-même branché sur l'API Partenaire TIKORA.
 *
 * ─── MODE RÉEL (VITE_PAYMENT_API_URL défini) ─────────────────────────────────
 * Le navigateur ne parle JAMAIS à TIKORA : la clé partenaire reste sur le
 * serveur. Routes utilisées (voir backend/src/routes) :
 *
 *   GET  {API}/tickets            tarifs, frais TIKORA, places restantes, moyens acceptés
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
 *
 * ─── CARTES BANCAIRES ────────────────────────────────────────────────────────
 * TIKORA n'encaisse que Mobile Money : en mode réel, le moyen « carte » est
 * masqué (le serveur renvoie `methods: ['momo']`) et AUCUNE donnée de carte
 * n'est transmise. La carte reste simulable en mode démonstration uniquement.
 *
 * ─── MODE DÉMONSTRATION (VITE_PAYMENT_API_URL vide) ──────────────────────────
 * Paiement SIMULÉ, aucun débit. Numéro (ou carte) finissant par « 0000 » =
 * refus, pour tester l'écran d'échec.
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

export const API = secureApiUrl(CONFIG.payment.apiUrl)
export const PAYMENT_MODE = API ? 'live' : 'demo'

// Développement : indique dans la console à quel serveur parle le site
if (import.meta.env.DEV) {
  console.info(
    API
      ? `[JCIA] Paiement en mode réel → ${API}`
      : `[JCIA] Paiement en mode DÉMONSTRATION${CONFIG.payment.apiUrl ? ` (URL refusée : ${CONFIG.payment.apiUrl})` : ' — VITE_PAYMENT_API_URL absent (.env.development.local)'}`,
  )
}
/** Conservé pour compatibilité : la saisie de carte n'existe qu'en démonstration. */
export const CARD_FIELDS_MODE = 'form'

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
  if (!API) return { ok: false, status: 0, data: null }
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
const reasonOf = (res, fallback) => cleanText(res?.data?.code || res?.data?.reason || fallback, 40)

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
 * Catalogue servi par le backend (frais TIKORA, stock, moyens acceptés).
 * Mode démonstration : null (le site utilise sa configuration locale).
 */
export async function fetchCatalog() {
  if (!API) return null
  const res = await apiRequest('/tickets', { timeoutMs: 8000 })
  return res.ok && res.data && Array.isArray(res.data.tiers) ? res.data : null
}

/** Commande vue par le serveur (billets officiels inclus), ou null. */
export async function fetchServerOrder(orderId, token) {
  if (!API || !TOKEN_RE.test(token ?? '')) return null
  const res = await apiRequest(`/orders/${encodeURIComponent(orderId)}`, { token })
  return res.ok && res.data?.id === orderId ? res.data : null
}

/** Inscription gratuite enregistrée par le serveur. */
export async function registerFreeOrder(order) {
  if (!API) return { status: 'free', mode: 'demo' }
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
  if (!res.ok || !TOKEN_RE.test(res.data?.accessToken ?? '')) return { status: 'FAILED', reason: reasonOf(res, 'init'), mode: 'live' }
  return { status: 'free', accessToken: res.data.accessToken, mode: 'live' }
}

/**
 * Lance un paiement et suit son avancement.
 * @param {object}   params  { orderId, amount, currency, method, operator, phone, tierId, quantity, customer, attendees, publicListing, lang, description, card? }
 * @param {function} onStep  (step, info) — step : 'initiating' | 'awaiting' | 'confirming' ;
 *                           info (mode réel) : { amount, fees } réellement débités
 * @returns {Promise<{ status: 'SUCCESSFUL'|'FAILED'|'PENDING', transactionId?, reason?, mode, accessToken?, amount?, fees? }>}
 */
export async function processPayment(params, onStep = () => {}) {
  return PAYMENT_MODE === 'live' ? processLive(params, onStep) : processDemo(params, onStep)
}

/** Paiement simulé : reproduit les étapes et délais d'un vrai paiement mobile. */
async function processDemo({ orderId, method, operator, phone = '', card }, onStep) {
  onStep('initiating')
  await wait(1200)
  onStep('awaiting')
  await wait(2600)
  const tail = method === 'card' ? String(card?.number ?? '').replace(/\D/g, '') : String(phone)
  if (tail.endsWith('0000')) return { status: 'FAILED', reason: 'INSUFFICIENT_BALANCE', mode: 'demo' }
  onStep('confirming')
  await wait(900)
  return {
    status: 'SUCCESSFUL',
    transactionId: `DEMO-${(method === 'card' ? 'CARD' : operator?.toUpperCase?.()) ?? 'MM'}-${orderId.slice(-6)}-${Date.now().toString(36).toUpperCase()}`,
    mode: 'demo',
  }
}

/** Paiement réel via le serveur de billetterie (TIKORA). */
async function processLive(params, onStep) {
  onStep('initiating')
  if (params.method === 'card') return { status: 'FAILED', reason: 'CARD_NOT_SUPPORTED', mode: 'live' }

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
    return { status: 'FAILED', reason: reasonOf(created, 'init'), mode: 'live' }
  }
  const extra = {
    mode: 'live',
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
