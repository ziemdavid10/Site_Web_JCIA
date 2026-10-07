import express from 'express'
import { getPublicCatalog } from '../services/catalog.js'
import { limiters } from '../middleware/security.js'
import { logger } from '../utils/logger.js'

/**
 * GET /tickets — tarifs, frais de service et places restantes.
 *
 * {
 *   mode: 'live' | 'demo', currency: 'XAF', methods: ['momo'], operators: ['mtn','orange'],
 *   buyerFee: { type: 'percent', value: 2, minimum: 100 }, promotion: true,
 *   tiers: [{ id, price, originalPrice, discounted, discountPercent, maxQty, quota, available, onSale }]
 * }
 * Le site s'en sert pour afficher les frais réels et masquer un tarif épuisé.
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
