import express from 'express'
import { CONFIG } from '../config/env.js'
import { dbReady } from '../database/db.js'
import { getOrderRow, sendReceipt } from '../services/orders.js'
import { limiters } from '../middleware/security.js'
import { ORDER_ID_RE, validEmail } from '../utils/validation.js'
import { logger } from '../utils/logger.js'

/**
 * POST /orders/:id/receipt  { email, lang }  → { status: 'sent' }
 * (contrat du frontend : src/services/email.js)
 *
 * Le corps ne contient ni montant ni participants : le serveur construit le
 * message à partir de SA commande — un visiteur ne peut pas dicter le contenu
 * d'un e-mail parti de notre domaine. Envoi limité (IP + délai par commande).
 */
const router = express.Router()

router.post('/:id/receipt', limiters.receipt, async (req, res) => {
  await dbReady
  const orderId = String(req.params.id || '')
  const { email, lang } = req.body || {}

  if (!ORDER_ID_RE.test(orderId)) {
    return res.status(400).json({ error: 'Identifiant de commande invalide', code: 'INVALID_ORDER_ID' })
  }
  if (!validEmail(email)) {
    return res.status(400).json({ error: 'Email obligatoire et valide', code: 'INVALID_EMAIL' })
  }

  try {
    const order = await getOrderRow(orderId)
    if (!order) return res.status(404).json({ error: 'Commande introuvable', code: 'ORDER_NOT_FOUND' })

    if (order.status !== 'paid' && order.status !== 'free') {
      return res.status(400).json({ error: 'Commande non confirmée', code: 'ORDER_NOT_CONFIRMED' })
    }

    // Sécurité / RGPD : jamais d'envoi à une autre adresse que celle de la commande.
    if (!order.customer_email || order.customer_email.toLowerCase() !== email.trim().toLowerCase()) {
      return res.status(403).json({ error: 'Adresse e-mail différente de celle de la commande', code: 'EMAIL_MISMATCH' })
    }

    // Anti-spam : délai minimal entre deux envois pour une même commande
    const elapsed = Date.now() - Number(order.receipt_last_at || 0)
    if (elapsed < CONFIG.receipt.minIntervalMs) {
      res.set('Retry-After', String(Math.ceil((CONFIG.receipt.minIntervalMs - elapsed) / 1000)))
      return res.status(429).json({ error: 'Reçu déjà envoyé, réessayez dans un instant', code: 'RECEIPT_TOO_SOON' })
    }

    await sendReceipt(orderId, { lang: lang === 'en' ? 'en' : lang === 'fr' ? 'fr' : order.lang === 'en' ? 'en' : 'fr' })
    return res.json({ status: 'sent' })
  } catch (error) {
    logger.warn('receipt.failed', { orderId, error })
    return res.status(502).json({ error: "Échec de l'envoi du mail", code: 'MAIL_ERROR' })
  }
})

export default router
