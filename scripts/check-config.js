/**
 * Vérifie la configuration (.env ou variables d'environnement) SANS démarrer
 * le serveur, et teste la clé TIKORA (GET /me, GET /events/{id}) en mode live :
 * statut de l'événement, et prix de CHAQUE catégorie (lancement et plein tarif)
 * comparé à la grille JCIA.
 *   npm run check:config
 */
import { CONFIG, validateConfig } from '../src/config/env.js'

const { errors, warnings } = validateConfig(CONFIG)
console.log(`Mode : ${CONFIG.payment.mode} · environnement : ${CONFIG.nodeEnv}`)
warnings.forEach((w) => console.log(`  ⚠ ${w}`))
errors.forEach((e) => console.log(`  ✗ ${e}`))

if (!errors.length && CONFIG.payment.mode === 'live') {
  const { tikora } = await import('../src/services/tikoraClient.js')
  const { getTicketPricing, PROMOTION } = await import('../src/utils/pricing.js')

  // Dates de référence : pendant la promotion, puis juste après
  const promoDate = new Date(PROMOTION.start.getTime() + 1000)
  const fullDate = new Date(PROMOTION.end.getTime() + 60_000)
  const PERIOD_LABEL = { promo: 'lancement', default: 'plein tarif' }

  try {
    const me = await tikora.me()
    console.log(`  ✓ Clé TIKORA valide — compte « ${me.name} » (${me.status})`)
    if (me.status !== 'active') errors.push('Compte partenaire TIKORA suspendu')

    const event = await tikora.getEvent(CONFIG.payment.eventId)
    console.log(`  ✓ Événement « ${event.title} » — statut ${event.status}, vente ${event.ticketsOnSale ? 'ouverte' : 'fermée'}`)
    if (event.status !== 'published') {
      console.log(`  ⚠ Événement au statut « ${event.status} » : la vente ne sera possible qu'une fois « published » (validation TIKORA)`)
      if (event.rejectionReason) console.log(`    Motif du refus : ${event.rejectionReason}`)
    }

    for (const tier of ['etudiant', 'standard', 'en-ligne', 'vip']) {
      const entry = CONFIG.payment.categoryMap[tier]
      // Format simple ("<id>") ou par période ({"promo":"<id>","default":"<id>"})
      const periods = typeof entry === 'string' ? { default: entry } : entry ?? {}
      for (const [period, categoryId] of Object.entries(periods)) {
        const label = typeof entry === 'string' ? '' : ` (${PERIOD_LABEL[period] ?? period})`
        const cat = (event.ticketCategories ?? []).find((c) => c.id === categoryId)
        if (!cat) {
          console.log(`  ✗ ${tier}${label} : catégorie ${categoryId} introuvable dans l'événement`)
          errors.push(`Catégorie TIKORA introuvable pour « ${tier} »${label}`)
          continue
        }
        // Format simple : prix attendu à la date du jour ; sinon selon la période
        const expected =
          typeof entry === 'string'
            ? getTicketPricing(tier).price
            : getTicketPricing(tier, period === 'promo' ? promoDate : fullDate).price
        const ok = Number(cat.price) === expected
        console.log(
          `  ${ok ? '✓' : '✗'} ${`${tier}${label}`.padEnd(24)} → « ${cat.name} » ${cat.price} XAF (attendu ${expected}) · ${cat.available} places · ${cat.onSale ? 'en vente' : 'hors vente'}`,
        )
        if (!ok) errors.push(`Prix TIKORA de « ${tier} »${label} différent de la grille JCIA`)
      }
    }
  } catch (error) {
    errors.push(`TIKORA injoignable ou clé refusée (${error.code ?? error.message})`)
  }
}

console.log(errors.length ? `\n✗ ${errors.length} erreur(s)` : '\n✓ Configuration valide')
process.exit(errors.length ? 1 : 0)
