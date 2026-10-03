import express from 'express'
import { get, run, dbReady } from '../database/db.js'
import { initiateMerchantPayment, checkMerchantPaymentStatus } from '../services/paymentApi.js'
import { inferTierIdFromAmount, validateOrderAmount } from '../utils/pricing.js'

const router = express.Router()
const ORDER_ID_RE = /^JCIA27-[A-Z0-9]{6}$/
const METHODS = new Set(['momo', 'card'])
const OPERATORS = new Set(['mtn', 'orange'])
const CURRENCIES = new Set(['XAF'])

function validEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function normalizePaymentResponse(payment) {
  return {
    paymentId: payment.payment_id,
    ...(payment.redirect_url ? { redirectUrl: payment.redirect_url } : {}),
  }
}

router.post('/', async (req, res) => {
  await dbReady

  const {
    orderId, amount, currency = 'XAF', method, operator, phone,
    customer, card, description, tierId, quantity = 1,
    publicListing = false, attendees = [], lang = 'fr',
  } = req.body || {}

  if (!ORDER_ID_RE.test(String(orderId || ''))) {
    return res.status(400).json({ error: 'Identifiant de commande invalide' })
  }

  const numericAmount = Number(amount)
  if (!Number.isFinite(numericAmount) || numericAmount < 0) {
    return res.status(400).json({ error: 'Montant invalide' })
  }
  if (!CURRENCIES.has(String(currency).toUpperCase())) {
    return res.status(400).json({ error: 'Devise non supportée' })
  }
  if (!METHODS.has(method)) {
    return res.status(400).json({ error: 'Méthode de paiement invalide' })
  }
  if (method === 'momo' && !OPERATORS.has(operator)) {
    return res.status(400).json({ error: 'Opérateur Mobile Money invalide' })
  }
  if (!validEmail(customer?.email)) {
    return res.status(400).json({ error: 'Adresse e-mail invalide' })
  }

  // Si le frontend envoie tierId/quantity, le serveur devient la source de vérité du prix.
  if (tierId != null && quantity != null && !validateOrderAmount(tierId, quantity, numericAmount)) {
    return res.status(400).json({ error: 'Montant de la commande incohérent ou invalide' })
  }

  try {
    // Idempotence : une reprise réseau ne crée pas un second paiement pour la même commande.
    const existing = await get(`SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1`, [orderId])
    if (existing) return res.json(normalizePaymentResponse(existing))

    const paymentData = await initiateMerchantPayment({
      orderId,
      amount: numericAmount,
      currency: String(currency).toUpperCase(),
      method,
      operator: operator || null,
      phone: phone || null,
      customer: {
        name: customer?.name || '',
        email: customer.email,
        org: customer?.org || '',
      },
      card: method === 'card' ? card : undefined,
      description: description || `Billetterie JCIA - ${orderId}`,
    })

    await run(
      `INSERT INTO payments (payment_id, order_id, amount, currency, method, operator, redirect_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [paymentData.paymentId, orderId, numericAmount, String(currency).toUpperCase(), method, operator || null, paymentData.redirectUrl || null]
    )

    const inferredTier = tierId || inferTierIdFromAmount(numericAmount)
    const normalizedAttendees = Array.isArray(attendees)
      ? attendees.filter((name) => typeof name === 'string').map((name) => name.trim()).filter(Boolean).slice(0, 50)
      : []

    await run(
      `INSERT OR REPLACE INTO orders
       (id, customer_name, customer_email, customer_phone, customer_org, tier_id, quantity,
        total, status, public_listing, attendees_json, lang, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        orderId,
        customer?.name || '',
        customer.email,
        phone || customer?.phone || '',
        customer?.org || '',
        inferredTier || '',
        Number.isInteger(Number(quantity)) ? Number(quantity) : 1,
        numericAmount,
        publicListing === true ? 1 : 0,
        JSON.stringify(normalizedAttendees),
        lang === 'en' ? 'en' : 'fr',
      ]
    )

    return res.status(200).json({
      paymentId: paymentData.paymentId,
      ...(paymentData.redirectUrl ? { redirectUrl: paymentData.redirectUrl } : {}),
    })
  } catch (error) {
    console.error('POST /payments:', error)
    return res.status(502).json({ error: 'Erreur lors de l’initialisation du paiement' })
  }
})

router.get('/:id', async (req, res) => {
  await dbReady
  const paymentId = String(req.params.id || '')

  try {
    const row = await get(`SELECT * FROM payments WHERE payment_id = ?`, [paymentId])
    if (!row) return res.status(404).json({ error: 'Paiement non trouvé' })

    if (row.status === 'PENDING') {
      try {
        const liveStatus = await checkMerchantPaymentStatus(paymentId)
        if (liveStatus.status !== 'PENDING') {
          await run(
            `UPDATE payments SET status = ?, transaction_id = ?, reason = ? WHERE payment_id = ?`,
            [liveStatus.status, liveStatus.transactionId || null, liveStatus.reason || null, paymentId]
          )
          if (liveStatus.status === 'SUCCESSFUL') {
            await run(`UPDATE orders SET status = 'paid' WHERE id = ?`, [row.order_id])
          } else if (liveStatus.status === 'FAILED') {
            await run(`UPDATE orders SET status = 'failed' WHERE id = ?`, [row.order_id])
          }
          return res.json(liveStatus)
        }
      } catch (error) {
        console.error(`GET /payments/${paymentId}:`, error)
        return res.status(502).json({ error: 'Impossible de vérifier le paiement auprès du fournisseur' })
      }
    }

    return res.json({
      status: row.status,
      transactionId: row.transaction_id || undefined,
      reason: row.reason || undefined,
    })
  } catch (error) {
    console.error(`GET /payments/${paymentId}:`, error)
    return res.status(500).json({ error: 'Erreur de lecture du paiement' })
  }
})

export default router
