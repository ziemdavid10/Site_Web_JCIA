import { CONFIG } from '../config/env.js'
import { logger } from '../utils/logger.js'

/**
 * Client HTTP de l'API Partenaire TIKORA (https://tikoraapi.totiokamdem.uk/docs/partner).
 *
 *   Base     : {TIKORA_API_URL} = https://tikoraapi.totiokamdem.uk/api/v1/partner
 *   Auth     : Authorization: Bearer tk_live_…   (depuis le serveur UNIQUEMENT)
 *   POST     : en-tête Idempotency-Key obligatoire (8–100 caractères)
 *   Réponses : { success: true, statusCode, data, timestamp }
 *              { success: false, statusCode, message, code }
 *
 * Fiabilité : délai maximal par appel, nouvelles tentatives avec attente
 * exponentielle sur les erreurs transitoires (réseau, 5xx, 429, 409
 * REQUEST_IN_PROGRESS). Les POST sont rejoués avec la MÊME Idempotency-Key :
 * TIKORA renvoie alors la réponse initiale, sans second débit.
 */

export class TikoraError extends Error {
  constructor(message, { status = 0, code = 'TIKORA_ERROR', retryable = false, retryAfterMs = 0 } = {}) {
    super(message)
    this.name = 'TikoraError'
    this.status = status
    this.code = code
    this.retryable = retryable
    this.retryAfterMs = retryAfterMs
  }
}

const IDEMPOTENCY_RE = /^[A-Za-z0-9._:-]{8,100}$/
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function retryAfter(header) {
  const seconds = Number(header)
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 5_000)
  return 0
}

async function once(method, path, { body, idempotencyKey } = {}) {
  const { apiUrl, apiKey, timeoutMs } = CONFIG.payment
  if (!apiUrl || !apiKey) throw new TikoraError('TIKORA_API_URL et TIKORA_API_KEY sont requis', { code: 'NOT_CONFIGURED' })

  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'User-Agent': 'jcia-billetterie/2.0',
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET') {
    if (!IDEMPOTENCY_RE.test(idempotencyKey ?? '')) throw new TikoraError('Idempotency-Key invalide', { code: 'IDEMPOTENCY_KEY_INVALID' })
    headers['Idempotency-Key'] = idempotencyKey
  }

  // Délai maximal de l'appel COMPLET (en-têtes + corps), tenu par NOTRE minuterie :
  //  • AbortSignal.timeout() peut être collecté par le ramasse-miettes avant de se
  //    déclencher (undici n'en garde qu'une référence faible) ;
  //  • une fois les en-têtes reçus, l'annulation transmise à fetch() n'interrompt pas
  //    toujours la lecture du corps (même raison).
  // Sans ces précautions, un TIKORA qui cesse de répondre en cours de réponse bloquait
  // la requête — et le verrou de la commande — indéfiniment.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new DOMException('Délai dépassé', 'TimeoutError')), timeoutMs)
  const timedOut = new Promise((resolve, reject) => {
    controller.signal.addEventListener('abort', () => reject(controller.signal.reason), { once: true })
  })
  timedOut.catch(() => {}) // observé ci-dessous ; évite un rejet « non géré » si l'appel a déjà échoué
  const isTimeout = (error) => controller.signal.aborted || error?.name === 'TimeoutError' || error?.name === 'AbortError'

  let response
  let text
  try {
    try {
      response = await Promise.race([
        fetch(`${apiUrl}${path}`, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: controller.signal,
          redirect: 'error', // une redirection inattendue ne doit pas emporter la clé ailleurs
        }),
        timedOut,
      ])
    } catch (error) {
      const timeout = isTimeout(error)
      throw new TikoraError(timeout ? 'Délai dépassé' : 'Réseau indisponible', {
        code: timeout ? 'TIMEOUT' : 'NETWORK_ERROR',
        retryable: true,
      })
    }

    // Un serveur qui envoie les en-têtes puis se bloque doit produire une erreur
    // TIMEOUT propre (et retentée), pas une attente sans fin.
    try {
      text = await Promise.race([response.text(), timedOut])
    } catch (error) {
      const timeout = isTimeout(error)
      response.body?.cancel(error).catch(() => {}) // libère la connexion
      throw new TikoraError(timeout ? 'Délai dépassé pendant la lecture de la réponse' : 'Réponse interrompue', {
        status: response.status,
        code: timeout ? 'TIMEOUT' : 'NETWORK_ERROR',
        retryable: true,
      })
    }
  } finally {
    clearTimeout(timer)
  }
  let json
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }

  if (!json || typeof json !== 'object') {
    const type = (response.headers.get('content-type') || '').split(';')[0]
    const looksLikePage = /html/i.test(type) || /^\s*</.test(text)
    throw new TikoraError(
      looksLikePage
        ? `Réponse HTML au lieu de JSON (HTTP ${response.status}) : TIKORA_API_URL pointe vers une page web, pas vers l'API (attendu : …/api/v1/partner)`
        : `Réponse non JSON (HTTP ${response.status}${type ? `, ${type}` : ''})`,
      { status: response.status, code: 'INVALID_RESPONSE', retryable: response.status >= 500 },
    )
  }

  if (!response.ok || json.success === false) {
    const status = Number(json.statusCode) || response.status
    const code = typeof json.code === 'string' && json.code ? json.code : `HTTP_${status}`
    throw new TikoraError(typeof json.message === 'string' ? json.message : `HTTP ${status}`, {
      status,
      code,
      retryable: status >= 500 || status === 429 || code === 'REQUEST_IN_PROGRESS' || status === 409,
      retryAfterMs: retryAfter(response.headers.get('retry-after')),
    })
  }

  // Enveloppe standard ; on tolère une réponse « nue » par robustesse
  return Object.hasOwn(json, 'data') ? json.data : json
}

/**
 * @param {'GET'|'POST'|'PUT'} method
 * @param {string} path  chemin relatif à la base partenaire (ex. /orders)
 * @param {{ body?: object, idempotencyKey?: string, retries?: number }} options
 */
export async function tikoraRequest(method, path, { body, idempotencyKey, retries = 2 } = {}) {
  let attempt = 0
  for (;;) {
    try {
      return await once(method, path, { body, idempotencyKey })
    } catch (error) {
      if (!(error instanceof TikoraError) || !error.retryable || attempt >= retries) {
        logger.warn('tikora.request.failed', { method, path: path.replace(/[0-9a-f-]{20,}/gi, ':id'), code: error.code, status: error.status })
        throw error
      }
      attempt += 1
      const wait = error.retryAfterMs || Math.min(300 * 2 ** (attempt - 1), 2_000)
      await sleep(wait + Math.floor(Math.random() * 100))
    }
  }
}

export const tikora = {
  me: () => tikoraRequest('GET', '/me'),
  commissions: () => tikoraRequest('GET', '/commissions'),
  getEvent: (eventId) => tikoraRequest('GET', `/events/${encodeURIComponent(eventId)}`),
  listEvents: () => tikoraRequest('GET', '/events'),
  eventCategories: () => tikoraRequest('GET', '/event-categories'),
  createEvent: (body, idempotencyKey) => tikoraRequest('POST', '/events', { body, idempotencyKey, retries: 1 }),
  createOrder: (body, idempotencyKey) => tikoraRequest('POST', '/orders', { body, idempotencyKey }),
  getOrder: (orderId) => tikoraRequest('GET', `/orders/${encodeURIComponent(orderId)}`),
  listOrders: ({ reference, page = 1, limit = 20 } = {}) => {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (reference) q.set('reference', reference)
    return tikoraRequest('GET', `/orders?${q}`)
  },
  payOrder: (orderId, phoneNumber, idempotencyKey) =>
    tikoraRequest('POST', `/orders/${encodeURIComponent(orderId)}/payments`, { body: { phoneNumber }, idempotencyKey }),
}
