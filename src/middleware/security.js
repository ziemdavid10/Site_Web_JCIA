import crypto from 'node:crypto'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { CONFIG } from '../config/env.js'

/**
 * Protections HTTP communes :
 *   • en-têtes de sécurité (helmet) adaptés à une API JSON ;
 *   • identifiant de requête (X-Request-Id) pour relier logs et incidents ;
 *   • limitation de débit par IP et par route (anti-abus, anti-énumération,
 *     protection du quota TIKORA et de l'envoi d'e-mails) ;
 *   • JSON obligatoire sur les requêtes qui modifient des données ;
 *   • réponses API jamais mises en cache par défaut.
 */

export const securityHeaders = helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // l'API est appelée depuis le site
  hsts: CONFIG.isProduction ? { maxAge: 63_072_000, includeSubDomains: true, preload: true } : false,
  referrerPolicy: { policy: 'no-referrer' },
})

export function requestId(req, res, next) {
  const incoming = req.get('x-request-id')
  req.id = incoming && /^[\w-]{8,64}$/.test(incoming) ? incoming : crypto.randomUUID()
  res.set('X-Request-Id', req.id)
  next()
}

export function noStore(req, res, next) {
  res.set('Cache-Control', 'no-store')
  next()
}

/** 415 si une requête POST/PUT/PATCH n'annonce pas du JSON. */
export function requireJson(req, res, next) {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return next()
  const length = Number(req.get('content-length') || 0)
  if (!length && !req.get('transfer-encoding')) return next() // corps vide : validé par la route
  if (!req.is('application/json')) {
    return res.status(415).json({ error: 'Content-Type application/json attendu', code: 'UNSUPPORTED_MEDIA_TYPE' })
  }
  return next()
}

function limiter(name, windowMs, limit, extra = {}) {
  if (!CONFIG.rateLimit.enabled) return (req, res, next) => next()
  return rateLimit({
    windowMs,
    limit: limit * CONFIG.rateLimit.multiplier,
    ...extra,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    identifier: name,
    handler: (req, res) =>
      res.status(429).json({ error: 'Trop de requêtes, réessayez dans un instant', code: 'RATE_LIMITED' }),
  })
}

export const limiters = {
  global: limiter('global', 60_000, 600),
  createPayment: limiter('create-payment', 10 * 60_000, 10),
  // Par numéro Mobile Money : empêche d'inonder un même téléphone de demandes de paiement
  createPaymentPerPhone: limiter('create-payment-phone', 10 * 60_000, 5, {
    keyGenerator: (req) => `phone:${String(req.body?.phone ?? '').replace(/\D/g, '').slice(-9)}`,
    skip: (req) => !/\d{9}/.test(String(req.body?.phone ?? '').replace(/\D/g, '')),
  }),
  status: limiter('status', 60_000, 120),
  receipt: limiter('receipt', 15 * 60_000, 5),
  webhook: limiter('webhook', 60_000, 300),
  read: limiter('read', 60_000, 120),
  // Photos des participants : envoi (recadrages successifs compris), lecture par le
  // titulaire, et affichage public (une page de participants charge beaucoup d'images,
  // souvent depuis la même IP partagée des opérateurs mobiles)
  // Rattachement d'un achat TIKORA (numéro + e-mail) : freine les essais au hasard
  claim: limiter('claim', 15 * 60_000, 10),
  photoUpload: limiter('photo-upload', 15 * 60_000, 20),
  photoOwner: limiter('photo-owner', 60_000, 60),
  photoPublic: limiter('photo-public', 60_000, 1500),
}
