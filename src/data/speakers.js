/**
 * Intervenants des JCIA 2027 — données sans langue.
 *
 * Les textes traduits (fonction, thème, propos, biographie) sont dans
 * src/i18n/locales/{fr,en}/speakers.js, sous la même clé `id`.
 *
 * ⚠️ PROFILS D'EXEMPLE : tant que la liste officielle n'est pas publiée, les
 * fiches ci-dessous (noms fictifs, `example: true`) montrent la mise en page.
 * Elles portent un badge « Exemple » sur le site. Pour publier la vraie liste :
 *   1. remplacer ces objets par les intervenants confirmés (example: false) ;
 *   2. déposer leurs photos (carrées, 600×600, WebP) dans src/assets/images/speakers/
 *      et les importer ici (`photo: import`) ;
 *   3. renseigner leurs textes dans les deux fichiers de langue.
 *
 * Champs :
 *   id        identifiant unique (utilisé dans l'URL : /intervenants?intervenant=id)
 *   name      nom affiché
 *   category  une des catégories de SPEAKER_CATEGORIES
 *   org       organisation (nom propre, non traduit)
 *   photo     image importée, ou null (un avatar à initiales est alors dessiné)
 *   session   { day: '27' | '28', time: 'HH:MM', format: clé de t.speakers.formats }
 *   links     { linkedin?, x?, website? } — adresses https uniquement
 */

/** Catégories (ordre d'affichage) : clé → icône et couleur d'accent */
export const SPEAKER_CATEGORIES = [
  { id: 'gouvernement', icon: 'building', color: 'orange' },
  { id: 'diplomatie', icon: 'globe', color: 'teal' },
  { id: 'onu', icon: 'shield', color: 'purple' },
  { id: 'recherche', icon: 'flask', color: 'rust' },
  { id: 'industrie', icon: 'chip', color: 'teal' },
  { id: 'investisseurs', icon: 'coins', color: 'orange' },
  { id: 'startups', icon: 'rocket', color: 'rust' },
  { id: 'diaspora', icon: 'users', color: 'purple' },
]

export const SPEAKERS = [
  { id: 'lorem-ipsum1', name: 'Pr lorem-ipsum', category: 'gouvernement', org: 'Administration publique', photo: null, example: true, session: { day: '27', time: '12:00', format: 'keynote' }, links: {} },
  { id: 'lorem-ipsum2', name: 'lorem-ipsum', category: 'gouvernement', org: 'Administration publique', photo: null, example: true, session: { day: '28', time: '09:00', format: 'masterclass' }, links: {} },
  { id: 'lorem-ipsum3', name: 'lorem-ipsum', category: 'diplomatie', org: 'Corps diplomatique', photo: null, example: true, session: { day: '27', time: '12:00', format: 'panel' }, links: {} },
  { id: 'lorem-ipsum4', name: 'lorem-ipsum', category: 'diplomatie', org: 'Corps diplomatique', photo: null, example: true, session: { day: '28', time: '11:00', format: 'talk' }, links: {} },
  { id: 'lorem-ipsum5', name: 'Dr lorem-ipsum', category: 'onu', org: 'Système des Nations Unies', photo: null, example: true, session: { day: '27', time: '13:00', format: 'keynote' }, links: {} },
  { id: 'lorem-ipsum6', name: 'lorem-ipsum', category: 'onu', org: 'Système des Nations Unies', photo: null, example: true, session: { day: '28', time: '15:00', format: 'panel' }, links: {} },
  { id: 'lorem-ipsum7', name: 'Pr lorem-ipsum', category: 'recherche', org: 'Université camerounaise', photo: null, example: true, session: { day: '27', time: '12:00', format: 'panel' }, links: {} },
  { id: 'lorem-ipsum8', name: 'Dr lorem-ipsum', category: 'recherche', org: 'Laboratoire de recherche', photo: null, example: true, session: { day: '28', time: '09:00', format: 'masterclass' }, links: {} },
  { id: 'lorem-ipsum9', name: 'lorem-ipsum', category: 'industrie', org: 'Opérateur télécom', photo: null, example: true, session: { day: '27', time: '13:00', format: 'panel' }, links: {} },
  { id: 'lorem-ipsum10', name: 'lorem-ipsum', category: 'industrie', org: 'Groupe bancaire', photo: null, example: true, session: { day: '28', time: '09:00', format: 'masterclass' }, links: {} },
  { id: 'lorem-ipsum11', name: 'lorem-ipsum', category: 'investisseurs', org: 'Fonds d’amorçage', photo: null, example: true, session: { day: '27', time: '13:00', format: 'keynote' }, links: {} },
  { id: 'lorem-ipsum12', name: 'lorem-ipsum', category: 'investisseurs', org: 'Réseau de business angels', photo: null, example: true, session: { day: '28', time: '13:30', format: 'pitch' }, links: {} },
  { id: 'lorem-ipsum13', name: 'lorem-ipsum', category: 'startups', org: 'Startup agritech', photo: null, example: true, session: { day: '28', time: '09:00', format: 'masterclass' }, links: {} },
  { id: 'lorem-ipsum14', name: 'lorem-ipsum', category: 'startups', org: 'Startup healthtech', photo: null, example: true, session: { day: '28', time: '13:30', format: 'pitch' }, links: {} },
  { id: 'lorem-ipsum15', name: 'lorem-ipsum', category: 'diaspora', org: 'Diaspora — Europe', photo: null, example: true, session: { day: '28', time: '15:00', format: 'panel' }, links: {} },
  { id: 'lorem-ipsum16', name: 'lorem-ipsum', category: 'diaspora', org: 'Diaspora — Amérique du Nord', photo: null, example: true, session: { day: '28', time: '16:15', format: 'talk' }, links: {} },
]
