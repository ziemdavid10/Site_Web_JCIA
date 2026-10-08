import { ATTENDEE_PROFILES } from '@/data/attendees'
import { CONFIG } from '@/data/config'
import { listOrders, isConfirmed } from './orders'
import { apiRequest } from './payment'
import { attendeeKey, localPhoto, publicPhotoUrl } from './photos'
import { cleanText } from '@/security/sanitize'

/**
 * Liste publique des participants « Ils y seront ».
 *
 * Elle fait foi sur le SERVEUR (GET /attendees) : inscrits confirmés ayant
 * donné leur consentement explicite. Les commandes de cet appareil sont mises
 * en tête (« c'est vous »). Aucun e-mail, téléphone ni numéro de billet
 * n'apparaît ici — uniquement ce que la personne accepte de montrer : nom,
 * organisation, ville, profil et photo.
 *
 * Un participant = un nom d'une commande confirmée (cmd-<commande>-<position>),
 * comme sur le serveur : une commande de 3 billets donne 3 fiches, chacune avec
 * sa propre photo (src/services/photos.js).
 */

/** Profil déduit du tarif choisi — même règle que le serveur (routes/attendees.js) */
function profileOfTier(tierId) {
  if (tierId === 'etudiant') return 'etudiant'
  if (tierId === 'en-ligne') return 'enLigne'
  return 'entreprise'
}

const PROFILE_IDS = ATTENDEE_PROFILES.map((p) => p.id)
const TIER_IDS = CONFIG.tickets.tiers.map((t) => t.id)

/** Participants issus des commandes locales ayant accepté d'être listés */
export function localAttendees() {
  return listOrders()
    .filter((o) => isConfirmed(o) && o.publicListing)
    .flatMap((o) =>
      o.attendees.map((name, i) => ({
        id: attendeeKey(o.id, i + 1),
        name: cleanText(name, 80),
        org: cleanText(o.customer.org, 120),
        city: '',
        profile: profileOfTier(o.tierId),
        tier: o.tierId,
        photo: localPhoto(o.id, i + 1)?.src ?? null,
        example: false,
        own: i === 0, // mis en avant : « c'est vous »
      })),
    )
    .filter((a) => a.name)
}

/** Fusion sans doublon (même identifiant) */
function withoutDuplicates(mine, others) {
  const ids = new Set(mine.map((a) => a.id))
  return [...mine, ...others.filter((a) => !ids.has(a.id))]
}

/** Liste publique servie par le serveur, nettoyée (liste blanche des champs). */
export async function fetchPublicAttendees() {
  const res = await apiRequest('/attendees', { timeoutMs: 8000 })
  if (!res.ok || !Array.isArray(res.data)) return null
  return res.data
    .slice(0, 2000)
    .map((a) => ({
      id: cleanText(a?.id, 40).replace(/[^\w-]/g, ''),
      name: cleanText(a?.name, 80),
      org: cleanText(a?.org, 120),
      city: cleanText(a?.city, 60),
      profile: PROFILE_IDS.includes(a?.profile) ? a.profile : 'entreprise',
      tier: TIER_IDS.includes(a?.tier) ? a.tier : undefined,
      photo: publicPhotoUrl(a?.photo),
      example: false,
    }))
    .filter((a) => a.id && a.name)
}

/** Fusionne la liste du serveur et les commandes de cet appareil (sans doublon). */
export function mergeAttendees(server) {
  const mine = localAttendees()
  if (!server) return mine
  // Les fiches de cet appareil en tête ; la photo du serveur prime si l'appareil n'en a pas
  const byId = new Map(server.map((a) => [a.id, a]))
  return withoutDuplicates(
    mine.map((a) => ({ ...a, photo: a.photo ?? byId.get(a.id)?.photo ?? null })),
    server,
  )
}
