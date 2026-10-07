import express from 'express'
import { CONFIG } from '../config/env.js'
import { run } from '../database/db.js'
import { syncFromWebhook } from '../services/orders.js'
import { sha256, verifyWebhookSignature } from '../services/security.js'
import { limiters } from '../middleware/security.js'
import { logger } from '../utils/logger.js'

/**
 * Webhooks TIKORA : order.paid, payment.failed (… ).
 *
 * Principe de sécurité : le contenu d'un webhook n'est JAMAIS cru sur parole.
 *   1. signature HMAC vérifiée si TIKORA_WEBHOOK_SECRET est défini
 *      (obligatoire si TIKORA_WEBHOOK_REQUIRE_SIGNATURE=true) ;
 *   2. déduplication (même corps reçu deux fois → ignoré) ;
 *   3. on n'en extrait que l'identifiant de commande, puis l'état réel est relu
 *      chez TIKORA avec NOTRE clé (GET /orders/{id}).
 * Un faux webhook ne peut donc, au pire, que déclencher une relecture.
 */

const OUR_ID = /^JCIA27-[A-Z0-9]{6}$/
const str = (v) => (typeof v === 'string' && v.length > 0 && v.length <= 100 ? v : undefined)

/**
 * Formats tolérés (le guide TIKORA « Développeurs » fait foi) :
 *   { event: 'order.paid', data: { id | orderId, reference, … } }
 *   { event, data: { order: { id, reference } } }
 *   { orderId: 'JCIA27-…' }   (ancienne route /payments/callback)
 */
function extractIds(body) {
  const data = body?.data && typeof body.data === 'object' ? body.data : {}
  const order = data.order && typeof data.order === 'object' ? data.order : {}
  const candidates = [str(data.orderId), str(order.id), str(data.id), str(body?.orderId)]
  const references = [str(data.reference), str(order.reference), str(body?.reference), str(body?.orderId)]
  return {
    event: str(body?.event) ?? str(body?.type) ?? null,
    tikoraOrderId: candidates.find((v) => v && !OUR_ID.test(v)) ?? null,
    reference: references.find((v) => v && OUR_ID.test(v)) ?? null,
  }
}

export async function handleTikoraWebhook(req, res) {
  const { webhookSecret, webhookSignatureHeader, webhookRequireSignature } = CONFIG.payment
  const raw = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}))

  const signed = webhookSecret ? verifyWebhookSignature(raw, req.get(webhookSignatureHeader), webhookSecret) : false
  if ((webhookRequireSignature || (webhookSecret && req.get(webhookSignatureHeader))) && !signed) {
    logger.warn('webhook.bad_signature', { ip: req.ip })
    return res.status(401).json({ error: 'Signature invalide', code: 'INVALID_SIGNATURE' })
  }

  const ids = extractIds(req.body)
  if (!ids.tikoraOrderId && !ids.reference) return res.status(400).json({ error: 'Identifiant de commande absent', code: 'ORDER_ID_REQUIRED' })

  const key = sha256(raw)
  const inserted = await run('INSERT OR IGNORE INTO webhook_events (event_key, tikora_order_id) VALUES (?, ?)', [key, ids.tikoraOrderId])
  if (inserted.changes === 0) return res.json({ received: true, duplicate: true })

  try {
    const result = await syncFromWebhook(ids)
    await run('UPDATE webhook_events SET result = ? WHERE event_key = ?', [result, key])
    logger.info('webhook.processed', { event: ids.event, result, signed })
    // Réponse identique que la commande existe ou non (pas d'énumération)
    return res.json({ received: true })
  } catch (error) {
    // L'événement est oublié pour que la nouvelle tentative de TIKORA soit traitée
    await run('DELETE FROM webhook_events WHERE event_key = ?', [key])
    logger.error('webhook.failed', { error })
    return res.status(503).json({ error: 'Traitement momentanément impossible', code: 'RETRY_LATER' })
  }
}

const router = express.Router()
router.post('/tikora', limiters.webhook, handleTikoraWebhook)
export default router
