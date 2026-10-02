import express from 'express'
import db from '../database/db.js'
import { sendReceiptEmail } from '../services/mailer.js'

const router = express.Router()

// POST /orders/:id/receipt
router.post('/:id/receipt', (req, res) => {
  const orderId = req.params.id
  const { email, lang } = req.body

  if (!email) {
    return res.status(400).json({ error: 'Email obligatoire' })
  }

  // Vérifier si la commande est payée
  db.get(`SELECT * FROM orders WHERE id = ?`, [orderId], async (err, order) => {
    if (err || !order) {
      return res.status(404).json({ error: 'Commande introuvable' })
    }

    if (order.status !== 'paid' && order.status !== 'free') {
      return res.status(400).json({ error: 'Commande non confirmée' })
    }

    try {
      await sendReceiptEmail({ email, orderId, lang })
      return res.json({ status: 'sent' })
    } catch (error) {
      return res.status(500).json({ error: "Échec de l'envoi du mail" })
    }
  })
})

export default router