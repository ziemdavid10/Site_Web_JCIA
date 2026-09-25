/**
 * Partenaires des éditions précédentes et médias — logos (données sans langue).
 *
 * Les NOMS sont traduits dans les fichiers de langue (t.partners.past / t.partners.media),
 * sous la même clé `id`. Ici : le fichier logo de chacun.
 *
 * ➜ Pour afficher un logo officiel :
 *   1. obtenir le fichier auprès du partenaire (SVG de préférence, sinon PNG/WebP
 *      transparent, 400 px de large minimum) et son accord d'utilisation ;
 *   2. le déposer dans public/images/partners/ (ex. public/images/partners/crtv.svg) ;
 *   3. renseigner son nom de fichier ci-dessous (logo: 'crtv.svg').
 * Tant que `logo` vaut null (ou si le fichier est introuvable), un monogramme
 * aux couleurs des JCIA est affiché à la place, toujours accompagné du nom.
 *
 * Les fichiers .webp présents ont été préparés à partir du dossier officiel
 * « LOGOS – PHOTOS JCIA 2027 » fourni par l'organisateur (fond détouré,
 * hauteur normalisée à 160 px).
 */

export const PARTNER_LOGOS = {
  // --- Organisateur et label (mis en avant) ---------------------------------
  'iac-caipi': 'iac-caipi.webp',
  'road-to-geneva': 'road-to-geneva.webp',

  // --- Institutions et organisations internationales ------------------------
  'unesco-cameroun': 'unesco-cameroun.webp',
  'itu': 'itu.webp',
  'aica': 'aica.webp',
  'gaigi': 'gaigi.webp',
  'auf': 'auf.webp',
  'canada': 'canada.webp',
  'business-france': 'business-france.webp',

  // --- Universités et écoles ------------------------------------------------
  'mila': 'mila.webp',
  'bordeaux-montaigne': 'bordeaux-montaigne.webp',
  'enspy': 'enspy.webp',
  'essfar': 'essfar.webp',
  'iric': 'iric.webp',
  'numiatech': 'numiatech.webp',

  // --- Entreprises et établissements publics --------------------------------
  'atos': 'atos.webp',
  'huawei': 'huawei.webp',
  'campost': 'campost.webp',
  'pak': 'pak.webp',
  'servoo': 'servoo.webp',
  'gtek': null,

  // --- Médias (logos officiels à fournir) -----------------------------------
  'crtv': null,
  'canal-2-international': null,
  'vision-4': null,
  'equinoxe-tv': null,
  'info-tv': null,
  'cam-10': null,
  'africa-24': null,
  'bbc-afrique': null,
  'rfi': null,
  'canal-plus': null,
  'balafon-fm': null,
  'kalak-fm': null,
  'soleil-fm': null,
  'fm94': null,
  'cameroon-tribune': null,
  'ecomatin': null,
  'mutations': null,
  'le-jour': null,
}

/** Dossier public des logos */
export const PARTNER_LOGO_DIR = '/images/partners/'
