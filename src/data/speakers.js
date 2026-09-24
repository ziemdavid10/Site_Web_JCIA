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
  { id: 'estelle-ngo-bassong', name: 'Pr Estelle Ngo Bassong', category: 'gouvernement', org: 'Administration publique', photo: null, example: true, session: { day: '27', time: '12:00', format: 'keynote' }, links: {} },
  { id: 'rodrigue-tchakounte', name: 'Rodrigue Tchakounté', category: 'gouvernement', org: 'Administration publique', photo: null, example: true, session: { day: '28', time: '09:00', format: 'masterclass' }, links: {} },
  { id: 'clara-eyenga', name: 'Clara Eyenga', category: 'diplomatie', org: 'Corps diplomatique', photo: null, example: true, session: { day: '27', time: '12:00', format: 'panel' }, links: {} },
  { id: 'jonas-fomekong', name: 'Jonas Fomekong', category: 'diplomatie', org: 'Corps diplomatique', photo: null, example: true, session: { day: '28', time: '11:00', format: 'talk' }, links: {} },
  { id: 'mariam-abdoulaye', name: 'Dr Mariam Abdoulaye', category: 'onu', org: 'Système des Nations Unies', photo: null, example: true, session: { day: '27', time: '13:00', format: 'keynote' }, links: {} },
  { id: 'samuel-tabi', name: 'Samuel Kouamé Tabi', category: 'onu', org: 'Système des Nations Unies', photo: null, example: true, session: { day: '28', time: '15:00', format: 'panel' }, links: {} },
  { id: 'herve-nkoulou', name: 'Pr Hervé Nkoulou Atangana', category: 'recherche', org: 'Université camerounaise', photo: null, example: true, session: { day: '27', time: '12:00', format: 'panel' }, links: {} },
  { id: 'nadege-fouda', name: 'Dr Nadège Fouda Mvondo', category: 'recherche', org: 'Laboratoire de recherche', photo: null, example: true, session: { day: '28', time: '09:00', format: 'masterclass' }, links: {} },
  { id: 'patricia-ewane', name: 'Patricia Ewane Din', category: 'industrie', org: 'Opérateur télécom', photo: null, example: true, session: { day: '27', time: '13:00', format: 'panel' }, links: {} },
  { id: 'arnaud-kengne', name: 'Arnaud Kengne Tsafack', category: 'industrie', org: 'Groupe bancaire', photo: null, example: true, session: { day: '28', time: '09:00', format: 'masterclass' }, links: {} },
  { id: 'solange-mbia', name: 'Solange Mbia Owona', category: 'investisseurs', org: 'Fonds d’amorçage', photo: null, example: true, session: { day: '27', time: '13:00', format: 'keynote' }, links: {} },
  { id: 'cedric-nana', name: 'Cédric Nana Djomo', category: 'investisseurs', org: 'Réseau de business angels', photo: null, example: true, session: { day: '28', time: '13:30', format: 'pitch' }, links: {} },
  { id: 'grace-ateba', name: 'Grâce Ateba Ndzie', category: 'startups', org: 'Startup agritech', photo: null, example: true, session: { day: '28', time: '09:00', format: 'masterclass' }, links: {} },
  { id: 'yannick-essomba', name: 'Yannick Essomba', category: 'startups', org: 'Startup healthtech', photo: null, example: true, session: { day: '28', time: '13:30', format: 'pitch' }, links: {} },
  { id: 'linda-tchouta', name: 'Dr Linda Tchouta Kamga', category: 'diaspora', org: 'Diaspora — Europe', photo: null, example: true, session: { day: '28', time: '15:00', format: 'panel' }, links: {} },
  { id: 'boris-manga', name: 'Boris Manga Onana', category: 'diaspora', org: 'Diaspora — Amérique du Nord', photo: null, example: true, session: { day: '28', time: '16:15', format: 'talk' }, links: {} },
]
