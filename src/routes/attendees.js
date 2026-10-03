import express from 'express'
import { all } from '../database/db.js'

const router = express.Router()

function profileOfTier(tierId) {
  if (tierId === 'etudiant') return 'etudiant'
  if (tierId === 'standard' ) return 'standard'
  if (tierId === 'en-ligne' || tierId === 'enligne') return 'enLigne'
  return 'vip'
}

router.get('/', async (req, res) => {
  try {
    const rows = await all(`
      SELECT id, customer_name AS name, customer_org AS org, tier_id AS tierId,
             attendees_json AS attendeesJson
      FROM orders
      WHERE status IN ('paid', 'free') AND public_listing = 1
      ORDER BY datetime(created_at) DESC
    `)

    const attendees = []
    for (const row of rows) {
      let names = []
      try {
        names = Array.isArray(JSON.parse(row.attendeesJson || '[]'))
          ? JSON.parse(row.attendeesJson || '[]')
          : []
      } catch {
        names = []
      }

      const publicNames = names.length ? names : [row.name]
      publicNames.forEach((name, index) => {
        if (!name) return
        attendees.push({
          id: `cmd-${row.id}-${index + 1}`,
          name,
          org: row.org || '',
          city: '',
          profile: profileOfTier(row.tierId),
          example: false,
        })
      })
    }

    return res.json(attendees)
  } catch (error) {
    console.error('GET /attendees:', error)
    return res.status(500).json({ error: 'Erreur de récupération de la liste des participants' })
  }
})

export default router
