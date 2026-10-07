/**
 * Participants inscrits — « Ils y seront ».
 *
 * ⚠️ DONNÉES D'EXEMPLE. En production, cette liste vient du serveur de
 * billetterie (`GET /attendees`) et ne contient QUE les personnes ayant coché
 * « Afficher mon nom dans la liste publique des participants » au moment de la
 * commande (consentement explicite, Loi n° 2024/017 sur la protection des
 * données). Rien d'autre que le prénom, le nom, l'organisation, la ville et le
 * profil n'est publié : ni e-mail, ni téléphone, ni numéro de billet.
 *
 * Le site complète cette liste avec les commandes confirmées sur l'appareil
 * (démonstration) qui portent `publicListing: true` — voir
 * src/services/attendees.js.
 *
 * Champs :
 *   id       identifiant court et stable (utilisé dans l'URL : ?participant=id)
 *   name     nom affiché (tel que saisi par la personne)
 *   org      organisation ou établissement
 *   city     ville
 *   profile  clé de t.attendees.profiles (étudiant, entreprise, recherche…)
 *   photo    image importée, ou null (un avatar à initiales est alors dessiné)
 *   tier     billet choisi (clé de CONFIG.tickets.tiers), pour le badge
 *   example  true tant qu'il s'agit d'un jeu de démonstration
 *
 * Les textes de la fiche (fonction, phrase de motivation, centres d'intérêt)
 * sont traduits dans src/i18n/locales/{fr,en}/attendees.js, sous la même clé.
 */

/** Profils affichés comme filtres (ordre d'affichage) */
export const ATTENDEE_PROFILES = [
  { id: 'etudiant', icon: 'book', color: 'purple' },
  { id: 'entreprise', icon: 'building', color: 'orange' },
  { id: 'recherche', icon: 'flask', color: 'rust' },
  { id: 'startup', icon: 'rocket', color: 'teal' },
  { id: 'institution', icon: 'shield', color: 'purple' },
  { id: 'enLigne', icon: 'play', color: 'teal' },
]

export const ATTENDEES = [
  { id: 'lorem-ipsum-1', name: 'Lorem Ipsum', org: 'Lorem University', city: 'Yaoundé', profile: 'etudiant', photo: null, tier: 'etudiant', example: true },
]

/** Compteur affiché tant que la billetterie n'est pas branchée au serveur */
export const ATTENDEES_TOTAL = ATTENDEES.length
