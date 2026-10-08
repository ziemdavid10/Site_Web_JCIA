import express from 'express'
import { getPublicCatalog } from '../services/catalog.js'
import { limiters } from '../middleware/security.js'
import { logger } from '../utils/logger.js'

/**
 * GET /tickets — tarifs, frais de service et places restantes.
 *
 * {
 *   currency: 'XAF', methods: ['momo'], operators: ['mtn','orange'],
 *   buyerFee: { type: 'percent', value: 2, minimum: 100 }, promotion: true,
 *   salesOpen: true,            // événement TIKORA validé et vente activée
 *   eventStatus: 'published',   // statut TIKORA (pending_review tant que TIKORA n'a pas validé)
 *   tiers: [{ id, price, originalPrice, discounted, discountPercent, maxQty, quota, available, onSale }]
 * }
 * Le site s'en sert pour afficher les frais réels, les places restantes, et
 * distinguer « complet » de « ouverture prochaine ». 503 si TIKORA est injoignable.
 */
const router = express.Router()

router.get('/', limiters.read, async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=30')
    return res.json(await getPublicCatalog())
  } catch (error) {
    logger.error('GET /tickets', { error })
    return res.status(503).json({ error: 'Billetterie momentanément indisponible', code: 'CATALOG_UNAVAILABLE' })
  }
})

export default router
