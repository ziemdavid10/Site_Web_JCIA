/**
 * Participants inscrits — « Ils y seront ».
 *
 * La liste vient du serveur de billetterie (`GET /attendees`) et ne contient
 * QUE les personnes ayant coché « Afficher mon nom dans la liste publique des
 * participants » au moment de la commande (consentement explicite, Loi
 * n° 2024/017 sur la protection des données). Rien d'autre que le nom,
 * l'organisation, la ville, le profil et la photo n'est publié : ni e-mail, ni
 * téléphone, ni numéro de billet. Voir src/services/attendees.js.
 *
 * Ce fichier ne contient que les profils (filtres). Champs d'un participant :
 *   id       identifiant court et stable (utilisé dans l'URL : ?participant=id)
 *   name     nom affiché (tel que saisi par la personne)
 *   org      organisation ou établissement
 *   city     ville
 *   profile  clé de t.attendees.profiles (étudiant, entreprise, recherche…)
 *   photo    URL de la photo (servie par l'API), ou null (avatar à initiales)
 *   tier     billet choisi (clé de CONFIG.tickets.tiers), pour le badge
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
