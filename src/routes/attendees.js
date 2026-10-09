import express from 'express'
import { all, dbReady } from '../database/db.js'
import { limiters } from '../middleware/security.js'
import { normalizeTierId } from '../utils/pricing.js'
import { cleanText } from '../utils/validation.js'
import { logger } from '../utils/logger.js'
import { attendeeId, attendeeNames, publicPhotoPath, publicPhotoVersions } from '../services/photos.js'

/**
 * GET /attendees — liste publique « Ils y seront ».
 *
 * Uniquement : commandes confirmées (payées ou gratuites) ET consentement
 * explicite (public_listing = 1). Champs publiés : nom, organisation, rôle, profil,
 * tarif et, si la personne en a ajouté une, sa photo (chemin /attendees/<id>/photo).
 * Jamais d'e-mail, de téléphone ni de numéro de billet.
 *
 * `profile` utilise les identifiants du frontend (src/data/attendees.js :
 * etudiant, entreprise, recherche, startup, institution, enLigne).
 */
const router = express.Router()

export function profileOfTier(tierId) {
  const id = normalizeTierId(tierId)
  if (id === 'etudiant') return 'etudiant'
  if (id === 'en-ligne') return 'enLigne'
  return 'entreprise'
}

router.get('/', limiters.read, async (req, res) => {
  try {
    await dbReady
    const [rows, photos] = await Promise.all([
      all(`
        SELECT id, customer_name, customer_org AS org, customer_role AS role, tier_id AS tierId, attendees_json
        FROM orders
        WHERE status IN ('paid', 'free') AND public_listing = 1
          -- commandes de l'ancien mode démonstration (paiements simulés) : jamais publiées
          AND COALESCE(payment_mode, 'live') <> 'demo'
        ORDER BY datetime(created_at) DESC
        LIMIT 2000
      `),
      publicPhotoVersions(),
    ])

    const attendees = []
    for (const row of rows) {
      attendeeNames(row).forEach((name, index) => {
        const clean = cleanText(name, 80)
        if (!clean) return
        const position = index + 1
        const version = photos.get(`${row.id}|${position}`)
        attendees.push({
          id: attendeeId(row.id, position),
          name: clean,
          org: cleanText(row.org, 120),
          // Rôle dans l'organisation : saisi par la personne qui s'inscrit (1er participant)
          role: position === 1 ? cleanText(row.role, 80) : '',
          city: '',
          profile: profileOfTier(row.tierId),
          tier: normalizeTierId(row.tierId) ?? 'standard',
          // Chemin relatif à l'API (le site le préfixe par VITE_PAYMENT_API_URL)
          photo: version ? publicPhotoPath(row.id, position, version) : null,
          example: false,
        })
      })
    }

    res.set('Cache-Control', 'public, max-age=30')
    return res.json(attendees)
  } catch (error) {
    logger.error('GET /attendees', { error })
    return res.status(500).json({ error: 'Erreur de récupération de la liste des participants', code: 'INTERNAL_ERROR' })
  }
})

export default router
