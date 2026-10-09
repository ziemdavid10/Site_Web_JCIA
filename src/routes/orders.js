import express from 'express'
import { dbReady } from '../database/db.js'
import { REGISTERED, createFreeOrder, createRegistration, getOrderRow, syncOrder, toPublicOrder } from '../services/orders.js'
import { verifyOrderAccessToken } from '../services/security.js'
import { limiters } from '../middleware/security.js'
import { ORDER_ID_RE } from '../utils/validation.js'
import { sendError } from './payments.js'
import { logger } from '../utils/logger.js'
import { claimWebOrder, linkRegistrationByNumber, refreshRegistration } from '../services/webOrders.js'

/**
 *   POST /orders/free   inscription au tarif gratuit (hors TIKORA)
 *                       → 201 { orderId, status: 'free', accessToken }
 *   POST /orders/register  inscription à un billet PAYANT, avant le paiement sur la
 *                       page TIKORA → 201 { orderId, status: 'registered', accessToken }
 *   POST /orders/:id/tikora-link  { orderNumber, email } (X-Order-Token)
 *                       rattache un paiement TIKORA à l'inscription → 200 commande
 *   GET  /orders/:id    commande + billets (QR officiels TIKORA)
 *                       en-tête obligatoire : X-Order-Token: <accessToken>
 *
 * Le jeton d'accès est remis au navigateur à la création de la commande et
 * figure dans le lien du reçu e-mail (fragment #t=…). Sans lui, la route
 * répond 404 — qu'elle existe ou non (aucune énumération possible).
 */
const router = express.Router()

router.post('/free', limiters.createPayment, async (req, res) => {
  try {
    return res.status(201).json(await createFreeOrder(req.body))
  } catch (error) {
    return sendError(res, error, 'POST /orders/free')
  }
})

router.post('/register', limiters.createPayment, async (req, res) => {
  try {
    return res.status(201).json(await createRegistration(req.body))
  } catch (error) {
    return sendError(res, error, 'POST /orders/register')
  }
})

/**
 * POST /orders/tikora-claim  { orderNumber: 'ORD-…', email, publicListing, lang }
 * Billet payé sur la page TIKORA : vérifié chez TIKORA, puis rattaché à une
 * commande JCIA → 200 { orderId, accessToken, order }.
 */
router.post('/tikora-claim', limiters.claim, async (req, res) => {
  try {
    const { orderNumber, email, publicListing, lang } = req.body ?? {}
    return res.json(await claimWebOrder({ orderNumber, email, publicListing: publicListing === true, lang }))
  } catch (error) {
    if (error.name === 'TikoraError') {
      logger.warn('claim.tikora_error', { code: error.code })
      return res.status(502).json({ error: 'TIKORA ne répond pas, réessayez dans un instant', code: 'PROVIDER_ERROR' })
    }
    return sendError(res, error, 'POST /orders/tikora-claim')
  }
})

/**
 * POST /orders/:id/tikora-link  { orderNumber: 'ORD-…', email }
 * Le participant a payé sur TIKORA mais le paiement n'a pas été retrouvé
 * automatiquement (autre adresse e-mail, par exemple) : vérifié chez TIKORA.
 */
router.post('/:id/tikora-link', limiters.claim, async (req, res) => {
  const orderId = String(req.params.id || '')
  if (!ORDER_ID_RE.test(orderId) || !verifyOrderAccessToken(orderId, req.get('x-order-token') || '')) {
    return res.status(404).json({ error: 'Commande introuvable', code: 'ORDER_NOT_FOUND' })
  }
  try {
    const { orderNumber, email } = req.body ?? {}
    return res.json(await linkRegistrationByNumber({ orderId, orderNumber, email }))
  } catch (error) {
    if (error.name === 'TikoraError') {
      logger.warn('link.tikora_error', { code: error.code })
      return res.status(502).json({ error: 'TIKORA ne répond pas, réessayez dans un instant', code: 'PROVIDER_ERROR' })
    }
    return sendError(res, error, 'POST /orders/:id/tikora-link')
  }
})

router.get('/:id', limiters.status, async (req, res) => {
  await dbReady
  const orderId = String(req.params.id || '')
  const token = req.get('x-order-token') || ''
  const notFound = () => res.status(404).json({ error: 'Commande introuvable', code: 'ORDER_NOT_FOUND' })
  if (!ORDER_ID_RE.test(orderId) || !verifyOrderAccessToken(orderId, token)) return notFound()

  try {
    let order = await getOrderRow(orderId)
    if (!order) return notFound()
    // Billet payant en attente du paiement TIKORA : recherche du paiement (limitée dans le temps)
    if (order.status === REGISTERED) order = (await refreshRegistration(order)) ?? order
    if (order.status === 'pending') {
      order = await syncOrder(order).catch((error) => {
        logger.warn('order.sync.failed', { orderId, code: error.code })
        return order
      })
    }
    return res.json(await toPublicOrder(order))
  } catch (error) {
    return sendError(res, error, 'GET /orders/:id')
  }
})

export default router
