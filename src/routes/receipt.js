import express from 'express'
import { get } from '../database/db.js'
import { mailerService } from '../services/mailer.js'

const router = express.Router()
const ORDER_ID_RE = /^JCIA27-[A-Z0-9]{6}$/

function validEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

router.post('/:id/receipt', async (req, res) => {
  const orderId = String(req.params.id || '')
  const { email, lang } = req.body || {}

  if (!ORDER_ID_RE.test(orderId)) {
    return res.status(400).json({ error: 'Identifiant de commande invalide' })
  }
  if (!validEmail(email)) {
    return res.status(400).json({ error: 'Email obligatoire et valide' })
  }

  try {
    const order = await get(`SELECT * FROM orders WHERE id = ?`, [orderId])
    if (!order) return res.status(404).json({ error: 'Commande introuvable' })

    if (order.status !== 'paid' && order.status !== 'free') {
      return res.status(400).json({ error: 'Commande non confirmée' })
    }

    // Le serveur ne doit jamais envoyer le reçu à une adresse différente de celle de la commande.
    if (order.customer_email && order.customer_email.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ error: 'Adresse e-mail différente de celle de la commande' })
    }

    await mailerService.sendReceiptEmail({
      email: order.customer_email || email,
      orderId,
      lang: lang === 'en' ? 'en' : (order.lang === 'en' ? 'en' : 'fr'),
      order,
    })

    return res.json({ status: 'sent' })
  } catch (error) {
    console.error(`POST /orders/${orderId}/receipt:`, error)
    return res.status(502).json({ error: "Échec de l'envoi du mail" })
  }
})

export default router
