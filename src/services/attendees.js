import { ATTENDEES } from '@/data/attendees'
import { listOrders, isConfirmed } from './orders'
import { cleanText } from '@/security/sanitize'

/**
 * Liste publique des participants.
 *
 * Deux sources, dans cet ordre :
 *   1. les commandes confirmées sur CET appareil dont l'acheteur a coché
 *      « Afficher mon nom dans la liste publique » (démonstration locale) ;
 *   2. la liste d'exemple (src/data/attendees.js).
 *
 * ⚠️ En production, seule une liste servie par le serveur de billetterie fait
 * foi : elle ne contient que les inscrits ayant donné leur consentement, et le
 * serveur reste seul juge de ce qui est publié. Aucun e-mail, téléphone ni
 * numéro de billet n'apparaît ici — uniquement ce que la personne accepte de
 * montrer : nom, organisation, ville et profil.
 */

/** Profil déduit du tarif choisi (sert au filtre de la liste) */
function profileOfTier(tierId) {
  if (tierId === 'etudiant') return 'etudiant'
  if (tierId === 'en-ligne') return 'enLigne'
  if (tierId === 'vip') return 'entreprise'
  return 'entreprise'
}

/** Participants issus des commandes locales ayant accepté d'être listés */
export function localAttendees() {
  return listOrders()
    .filter((o) => isConfirmed(o) && o.publicListing)
    .map((o) => ({
      id: `cmd-${o.id}`,
      name: cleanText(o.customer.name, 80),
      org: cleanText(o.customer.org, 120),
      city: '',
      profile: profileOfTier(o.tierId),
      example: false,
      own: true, // mis en avant : « c'est vous »
    }))
    .filter((a) => a.name)
}

/** Liste complète, participants de cet appareil en tête */
export function allAttendees() {
  const mine = localAttendees()
  const ids = new Set(mine.map((a) => a.name.toLowerCase()))
  return [...mine, ...ATTENDEES.filter((a) => !ids.has(a.name.toLowerCase()))]
}
