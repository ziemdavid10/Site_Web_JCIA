import crypto from 'node:crypto'
import { CONFIG } from '../config/env.js'

/**
 * Jetons dérivés du secret serveur (APP_SECRET), sans stockage :
 *   • jeton d'accès à une commande (consultation des billets, renvoi du reçu) ;
 *   • jeton QR des billets gratuits (non falsifiable sans le secret).
 * Comparaisons en temps constant.
 */

function hmac(purpose, value) {
  return crypto.createHmac('sha256', CONFIG.appSecret).update(`${purpose}:${value}`).digest('base64url')
}

export function orderAccessToken(orderId) {
  return hmac('order-access', orderId)
}

export function safeEqual(a, b) {
  const x = Buffer.from(String(a ?? ''))
  const y = Buffer.from(String(b ?? ''))
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

export function verifyOrderAccessToken(orderId, token) {
  return typeof token === 'string' && token.length >= 20 && safeEqual(orderAccessToken(orderId), token)
}

export function freeTicketQrToken(orderId, index) {
  return `JCIA27F.${orderId}.${index}.${hmac('free-ticket', `${orderId}|${index}`).slice(0, 22)}`
}

/** Empreinte stable d'un corps brut (déduplication des webhooks) */
export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex')

/**
 * Vérifie la signature HMAC-SHA256 d'un webhook TIKORA.
 * Formats acceptés pour l'en-tête (le guide « Développeurs » TIKORA fixe le format exact) :
 *   « <hex> », « sha256=<hex> », « <base64> », « t=<unix>,v1=<hex> » (horodaté, tolérance 5 min).
 */
export function verifyWebhookSignature(rawBody, header, secret, now = Date.now()) {
  if (!secret || !header || !rawBody) return false
  const value = String(header).trim()
  const raw = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody))

  const parts = Object.fromEntries(
    value
      .split(',')
      .map((p) => p.split('=').map((s) => s.trim()))
      .filter((p) => p.length === 2),
  )
  if (parts.t && parts.v1) {
    const ts = Number(parts.t)
    if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > 300) return false
    const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.`).update(raw).digest('hex')
    return safeEqual(expected, parts.v1)
  }

  const digest = crypto.createHmac('sha256', secret).update(raw).digest()
  const candidate = value.replace(/^sha256=/i, '')
  return safeEqual(digest.toString('hex'), candidate.toLowerCase()) || safeEqual(digest.toString('base64'), candidate)
}
