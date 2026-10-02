import express from 'express'
import db from '../database/db.js'
import { initiateMerchantPayment, checkMerchantPaymentStatus } from '../services/paymentApi.js'

const router = express.Router()

// POST /payments
router.post('/', async (req, res) => {
  const { orderId, amount, currency, method, operator, phone, customer, card } = req.body

  if (!orderId || !amount) {
    return res.status(400).json({ error: 'Données manquantes' })
  }

  try {
    // 1. Appeler l'API marchand pour initier le paiement
    const paymentData = await initiateMerchantPayment({ orderId, amount, currency, method, operator, phone, card })

    // 2. Sauvegarder la transaction en base de données
    db.run(
      `INSERT INTO payments (payment_id, order_id, amount, currency, method, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [paymentData.paymentId, orderId, amount, currency || 'XAF', method, 'PENDING']
    )

    // 3. Sauvegarder la commande
    db.run(
      `INSERT OR REPLACE INTO orders (id, customer_name, customer_email, customer_phone, total, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [orderId, customer?.name, customer?.email, phone, amount, 'pending']
    )

    return res.json({
      paymentId: paymentData.paymentId,
      redirectUrl: paymentData.redirectUrl,
    })
  } catch (err) {
    return res.status(500).json({ error: 'Erreur lors de l’initialisation du paiement' })
  }
})

// GET /payments/:id
router.get('/:id', (req, res) => {
  const paymentId = req.params.id

  db.get(`SELECT * FROM payments WHERE payment_id = ?`, [paymentId], async (err, row) => {
    if (err || !row) {
      return res.status(404).json({ error: 'Paiement non trouvé' })
    }

    if (row.status === 'PENDING') {
      // Vérifier auprès du fournisseur de paiement
      const liveStatus = await checkMerchantPaymentStatus(paymentId)
      
      if (liveStatus.status !== 'PENDING') {
        db.run(
          `UPDATE payments SET status = ?, transaction_id = ?, reason = ? WHERE payment_id = ?`,
          [liveStatus.status, liveStatus.transactionId, liveStatus.reason, paymentId]
        )
        if (liveStatus.status === 'SUCCESSFUL') {
          db.run(`UPDATE orders SET status = 'paid' WHERE id = ?`, [row.order_id])
        }
        return res.json(liveStatus)
      }
    }

    return res.json({
      status: row.status,
      transactionId: row.transaction_id,
      reason: row.reason,
    })
  })
})

export default router