import { CONFIG } from '@/data/config'
import { cleanText } from '@/security/sanitize'

/**
 * Service de paiement Mobile Money (MTN MoMo / Orange Money).
 *
 * ─── MODE DÉMONSTRATION (actuel) ─────────────────────────────────────────────
 * Sans VITE_PAYMENT_API_URL, le paiement est SIMULÉ : aucune somme n'est débitée.
 * Le parcours complet (demande → confirmation sur le téléphone → succès) est
 * reproduit pour tester l'interface.
 *
 * ─── MODE RÉEL (à brancher) ──────────────────────────────────────────────────
 * Définir VITE_PAYMENT_API_URL dans .env. Le backend (jamais le navigateur, qui
 * ne doit pas détenir les clés marchand) expose deux routes :
 *
 *   POST {API}/payments          → { paymentId }
 *        corps : { orderId, amount, currency, operator, phone, customer, description }
 *        le backend appelle l'API de l'agrégateur ou de l'opérateur
 *        (MTN MoMo Collection « requesttopay », Orange Money WebPay, ou un
 *         agrégateur local : Campay, Notch Pay, CinetPay, Monetbil…)
 *
 *   GET  {API}/payments/:id      → { status: 'PENDING' | 'SUCCESSFUL' | 'FAILED', transactionId, reason? }
 *
 * Le client interroge le statut toutes les 3 s jusqu'à confirmation ou échec
 * (l'utilisateur valide la transaction en saisissant son code secret sur son
 * téléphone). Le backend doit aussi vérifier le paiement via le webhook de
 * l'opérateur avant d'émettre le billet.
 */

/**
 * Sécurité : l'API de paiement doit être en HTTPS (sauf localhost en développement).
 * Une adresse non sûre est ignorée et le site reste en mode démonstration.
 */
function secureApiUrl(url) {
  try {
    const u = new URL(url)
    const local = ['localhost', '127.0.0.1'].includes(u.hostname) && import.meta.env.DEV
    return u.protocol === 'https:' || local ? u.href.replace(/\/$/, '') : ''
  } catch {
    return ''
  }
}

const API = secureApiUrl(CONFIG.payment.apiUrl)
export const PAYMENT_MODE = API ? 'live' : 'demo'

const PAYMENT_ID_RE = /^[\w-]{1,100}$/
const STATUSES = ['PENDING', 'SUCCESSFUL', 'FAILED']

/** Appel réseau avec délai maximal, sans cookies, réponse JSON vérifiée */
async function request(path, { method = 'GET', body, idempotencyKey } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)
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
        // Le serveur ne crée pas deux paiements pour la même commande (double clic, réseau lent)
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('application/json')) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Lance un paiement et suit son avancement.
 * @param {object}   params  { orderId, amount, currency, operator, phone, customer, description }
 * @param {function} onStep  rappel de progression : 'initiating' | 'awaiting' | 'confirming'
 * @returns {Promise<{ status: 'SUCCESSFUL'|'FAILED', transactionId?: string, reason?: string, mode: string }>}
 */
export async function processPayment(params, onStep = () => {}) {
  return PAYMENT_MODE === 'live' ? processLive(params, onStep) : processDemo(params, onStep)
}

/**
 * Paiement simulé : reproduit les étapes et délais d'un vrai paiement mobile.
 * Pour tester l'écran d'échec, utiliser un numéro se terminant par « 0000 ».
 */
async function processDemo({ orderId, operator, phone = '' }, onStep) {
  onStep('initiating')
  await wait(1200)
  onStep('awaiting') // « Validez le paiement sur votre téléphone »
  await wait(2600)
  if (String(phone).endsWith('0000')) return { status: 'FAILED', reason: 'declined', mode: 'demo' }
  onStep('confirming')
  await wait(900)
  return {
    status: 'SUCCESSFUL',
    transactionId: `DEMO-${operator?.toUpperCase?.() ?? 'MM'}-${orderId.slice(-6)}-${Date.now().toString(36).toUpperCase()}`,
    mode: 'demo',
  }
}

/** Paiement réel via le backend de billetterie */
async function processLive(params, onStep) {
  onStep('initiating')
  // On n'envoie que le strict nécessaire (minimisation des données)
  const created = await request('/payments', {
    method: 'POST',
    idempotencyKey: params.orderId,
    body: {
      orderId: params.orderId,
      amount: params.amount,
      currency: params.currency,
      operator: params.operator,
      phone: params.phone,
      customer: { name: params.customer?.name, email: params.customer?.email },
      description: params.description,
    },
  })
  const paymentId = created?.paymentId
  if (typeof paymentId !== 'string' || !PAYMENT_ID_RE.test(paymentId)) {
    return { status: 'FAILED', reason: 'init', mode: 'live' }
  }

  onStep('awaiting')
  const deadline = Date.now() + 3 * 60 * 1000 // 3 minutes pour valider sur le téléphone
  while (Date.now() < deadline) {
    await wait(3000)
    const data = await request(`/payments/${encodeURIComponent(paymentId)}`)
    if (!data || !STATUSES.includes(data.status)) continue
    if (data.status === 'SUCCESSFUL') {
      onStep('confirming')
      return { status: 'SUCCESSFUL', transactionId: cleanText(data.transactionId, 80), mode: 'live' }
    }
    if (data.status === 'FAILED') return { status: 'FAILED', reason: cleanText(data.reason, 40), mode: 'live' }
  }
  return { status: 'FAILED', reason: 'timeout', mode: 'live' }
}
