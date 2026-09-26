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
 *   id       identifiant court et stable
 *   name     nom affiché (tel que saisi par la personne)
 *   org      organisation ou établissement
 *   city     ville
 *   profile  clé de t.attendees.profiles (étudiant, entreprise, recherche…)
 *   example  true tant qu'il s'agit d'un jeu de démonstration
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
  { id: 'lorem-ipsum-1', name: 'Lorem Ipsum', org: 'Lorem University', city: 'Yaoundé', profile: 'etudiant', example: true },
  { id: 'dolor-sit-2', name: 'Dolor Sit', org: 'Amet Consulting', city: 'Douala', profile: 'entreprise', example: true },
  { id: 'consectetur-3', name: 'Consectetur Adipiscing', org: 'Laboratoire Elit', city: 'Buea', profile: 'recherche', example: true },
  { id: 'sed-do-4', name: 'Sed Do Eiusmod', org: 'Tempor Labs', city: 'Yaoundé', profile: 'startup', example: true },
  { id: 'incididunt-5', name: 'Incididunt Ut', org: 'Labore Institute', city: 'Garoua', profile: 'institution', example: true },
  { id: 'magna-6', name: 'Magna Aliqua', org: 'Ut Enim SARL', city: 'Bafoussam', profile: 'entreprise', example: true },
  { id: 'veniam-7', name: 'Ad Minim Veniam', org: 'Quis Nostrud School', city: 'Dschang', profile: 'etudiant', example: true },
  { id: 'exercitation-8', name: 'Exercitation Ullamco', org: 'Laboris Nisi', city: 'Kribi', profile: 'startup', example: true },
  { id: 'aliquip-9', name: 'Aliquip Ex Ea', org: 'Commodo Research', city: 'Ngaoundéré', profile: 'recherche', example: true },
  { id: 'duis-aute-10', name: 'Duis Aute Irure', org: 'Dolor Agency', city: 'Paris (diaspora)', profile: 'enLigne', example: true },
  { id: 'reprehenderit-11', name: 'Reprehenderit In', org: 'Voluptate Velit', city: 'Bamenda', profile: 'entreprise', example: true },
  { id: 'esse-cillum-12', name: 'Esse Cillum', org: 'Fugiat Nulla', city: 'Yaoundé', profile: 'etudiant', example: true },
  { id: 'pariatur-13', name: 'Excepteur Sint', org: 'Occaecat Cupidatat', city: 'Montréal (diaspora)', profile: 'enLigne', example: true },
  { id: 'proident-14', name: 'Non Proident', org: 'Sunt In Culpa', city: 'Douala', profile: 'institution', example: true },
  { id: 'officia-15', name: 'Officia Deserunt', org: 'Mollit Anim', city: 'Limbe', profile: 'startup', example: true },
  { id: 'laborum-16', name: 'Id Est Laborum', org: 'Perspiciatis Unde', city: 'Yaoundé', profile: 'recherche', example: true },
]

/** Compteur affiché tant que la billetterie n'est pas branchée au serveur */
export const ATTENDEES_TOTAL = ATTENDEES.length
