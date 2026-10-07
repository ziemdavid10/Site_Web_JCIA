import express from 'express'
import { createPayment, getPaymentStatus, HttpError } from '../services/orders.js'
import { PAYMENT_ID_RE } from '../utils/validation.js'
import { limiters } from '../middleware/security.js'
import { handleTikoraWebhook } from './webhooks.js'
import { logger } from '../utils/logger.js'

/**
 * Contrat attendu par le frontend (src/services/payment.js) :
 *
 *   POST /payments       { orderId, amount, currency, method, operator, phone, customer,
 *                          tierId, quantity, attendees, publicListing, lang, description }
 *                        → 200 { paymentId, redirectUrl?, status, accessToken, amount, subtotal, fees, currency, expiresAt }
 *   GET  /payments/:id   → 200 { status: 'PENDING'|'SUCCESSFUL'|'FAILED', transactionId?, reason? }
 *
 * Erreurs : { error: <message lisible>, code: <code stable> }
 */
const router = express.Router()

export function sendError(res, error, context) {
  if (error instanceof HttpError) return res.status(error.status).json({ error: error.message, code: error.code })
  logger.error(context, { error })
  return res.status(500).json({ error: 'Erreur interne du serveur', code: 'INTERNAL_ERROR' })
}

router.post('/', limiters.createPayment, limiters.createPaymentPerPhone, async (req, res) => {
  try {
    return res.status(200).json(await createPayment(req.body))
  } catch (error) {
    return sendError(res, error, 'POST /payments')
  }
})

// Ancienne URL de notification : même traitement sûr que /webhooks/tikora
// (le corps n'est qu'un signal, le statut est relu chez TIKORA).
router.post('/callback', limiters.webhook, handleTikoraWebhook)

router.get('/:id', limiters.status, async (req, res) => {
  const paymentId = String(req.params.id || '')
  if (!PAYMENT_ID_RE.test(paymentId)) return res.status(404).json({ error: 'Paiement non trouvé', code: 'PAYMENT_NOT_FOUND' })
  try {
    const status = await getPaymentStatus(paymentId)
    if (!status) return res.status(404).json({ error: 'Paiement non trouvé', code: 'PAYMENT_NOT_FOUND' })
    return res.json(status)
  } catch (error) {
    return sendError(res, error, 'GET /payments/:id')
  }
})

export default router
