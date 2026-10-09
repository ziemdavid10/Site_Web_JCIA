/**
 * Configuration indépendante de la langue : dates, liens, coordonnées.
 * Les textes traduisibles se trouvent dans src/i18n/locales/{fr,en}/.
 */
export const CONFIG = {
  siteUrl: 'https://www.jcia.cm',

  // Dates ISO avec fuseau du Cameroun (WAT, UTC+1)
  startDate: '2027-04-27T08:00:00+01:00',
  endDate: '2027-04-28T23:00:00+01:00',
  // Cameroon AI Awards : ouverture puis clôture des candidatures
  awardsStart: '2026-11-15T08:00:00+01:00',
  awardsDeadline: '2027-02-28T23:59:00+01:00',

  venue: {
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Hilton+Hotel+Yaound%C3%A9',
    // Carte intégrée (OpenStreetMap, sans clé API) — chargée seulement après consentement
    embedUrl:
      'https://www.openstreetmap.org/export/embed.html?bbox=11.5051%2C3.8595%2C11.5251%2C3.8745&layer=mapnik&marker=3.8670%2C11.5151',
  },

  links: {
    awards: 'https://docs.google.com/forms/d/1P9zgsLj3eXfalLEO1MZiaB6jsRMPiLvZvIp2ZKTdAFw/preview',
    iac: 'https://www.iacameroun.com',
    tdrPdf: '/documents/TDR-CAIA-2027.pdf',
    // Cagnotte de soutien (bouton « Donate » de la barre de navigation)
    donate: 'https://www.gofundme.com/f/iac-journees-camerounaises-de-lintelligence-artificielle',
    // Forum WhatsApp du Cameroon AI Network (section « Communauté »)
    community: 'https://chat.whatsapp.com/LvSIFIgfSthIciLZWVCJlF',
    partnershipPdf: '/documents/Dossier-Partenariat-JCIA-2027.pdf',
  },

  contact: {
    // Numéros du secrétariat : affichés en clair, cliquables pour appeler.
    phones: ['+237 699 089 937', '+237 677 238 022'],
    emails: ['contact@jciacm.com', 'jcia@iacameroun.com'],
    privacyEmail: 'contact@jciacm.com',
    websites: ['www.jcia.cm', 'www.iacameroun.com'],
    // Comptes officiels de l'IAC – CAIPI
    socials: [
      { name: 'LinkedIn', url: 'https://www.linkedin.com/company/iacameroun/', icon: 'linkedin' },
      { name: 'Facebook', url: 'https://www.facebook.com/iacameroun/', icon: 'facebook' },
      { name: 'YouTube', url: 'https://www.youtube.com/@iacameroun', icon: 'youtube' },
      { name: 'TikTok', url: 'https://www.tiktok.com/@iacameroun', icon: 'tiktok' },
      { name: 'WhatsApp', url: 'https://chat.whatsapp.com/LvSIFIgfSthIciLZWVCJlF', icon: 'chat' },
    ],
  },

  /**
   * ─── INTERRUPTEURS DE MISE EN PRODUCTION ───────────────────────────────────
   * Le site part en production avant que tout soit prêt : ces trois booléens
   * suffisent à rallumer chaque brique, sans toucher au reste du code.
   *
   *  payment            paiement en ligne. `false` : la billetterie reste
   *                     consultable (tarifs, quotas, places restantes) mais
   *                     aucune commande ne peut être passée (fermeture
   *                     volontaire). `true` : commandes via le serveur de
   *                     billetterie (VITE_PAYMENT_API_URL) et TIKORA.
   *  documentDownloads  téléchargement du TDR (appel à candidatures CAIA) et du
   *                     dossier de partenariat. `false` : boutons grisés, les
   *                     PDF n'étant pas encore définitifs.
   *  speakerDirectory   liste détaillée des intervenants par catégorie.
   *                     `false` : les catégories restent affichées mais ne sont
   *                     plus cliquables, en attendant la liste officielle.
   */
  features: {
    payment: true,
    documentDownloads: true,
    speakerDirectory: true,
  },

  /** Routes du site (identiques quelle que soit la langue) */
  routes: {
    home: '/',
    // Pages détaillées des sections
    about: '/a-propos',
    programme: '/programme',
    speakers: '/intervenants',
    attendees: '/participants',
    salon: '/salon',
    awards: '/awards',
    catalogue: '/catalogue',
    partners: '/partenaires',
    faq: '/faq',
    // Billetterie
    tickets: '/billetterie',
    checkout: '/billetterie/commande', // + /:tierId
    confirmation: '/billetterie/confirmation', // + /:orderId
    flyer: '/mon-flyer',
    // Légal & erreurs
    privacy: '/confidentialite',
    terms: '/conditions-utilisation',
    cookies: '/cookies',
    error: '/erreur',
  },

  /** Clés de stockage local (préférences et billets de l'utilisateur) */
  storage: {
    lang: 'jcia-lang',
    theme: 'jcia-theme',
    consent: 'jcia-consent',
    orders: 'jcia-orders',
    photos: 'jcia-photos',
  },

  /**
   * Billetterie — tarifs de base en francs CFA (XAF).
   * Les prix affichés et facturés passent par getTicketPrice(), afin que la
   * promotion soit appliquée de façon identique dans la page tarifs et au checkout.
   */
  tickets: {
    currency: 'XAF',
    tiers: [
      { id: 'gratuit', price: 0, quota: null, sold: 0, maxQty: 10, color: 'teal', icon: 'ticket', onsite: true },
      { id: 'etudiant', price: 5000, quota: 100, sold: 0, maxQty: 5, color: 'purple', icon: 'book', onsite: true },
      { id: 'standard', price: 10000, quota: 250, sold: 0, maxQty: 10, color: 'orange', icon: 'ticket', onsite: true },
      { id: 'en-ligne', price: 15000, quota: null, sold: 0, maxQty: 10, color: 'teal', icon: 'play', onsite: false },
      { id: 'vip', price: 25000, quota: 150, sold: 0, maxQty: 10, color: 'rust', icon: 'star', onsite: true },
    ],
  },

  /** Promotion de lancement, active du 1er octobre au 31 décembre 2026 inclus. */
  promotion: {
    discountPercent: 30,
    startDate: '2026-10-05T00:00:00+01:00',
    endDate: '2026-12-31T23:59:59+01:00',
  },

  /**
   * Paiement Mobile Money (MTN MoMo, Orange Money) via le serveur de billetterie
   * et TIKORA. VITE_PAYMENT_API_URL est OBLIGATOIRE : sans elle, la billetterie
   * s'affiche « momentanément indisponible » (aucun paiement n'est simulé).
   * TIKORA n'encaisse pas les cartes bancaires : aucune saisie de carte sur le site.
   */
  payment: {
    apiUrl: import.meta.env.VITE_PAYMENT_API_URL || '',
    /**
     * Billets PAYANTS : le participant s'inscrit d'abord sur le site (même formulaire
     * que le billet gratuit, avec sa photo), puis paie sur la page de l'événement
     * chez TIKORA (Mobile Money) AVEC LA MÊME ADRESSE E-MAIL. Le serveur JCIA retrouve
     * le paiement, confirme le billet et envoie l'e-mail de confirmation.
     */
    tikoraEventUrl: 'https://tikora.proditech.online/evenements/jcia-2027-journees-camerounaises-de-l-intelligence-artificielle',
    operators: [
      // Préfixes des numéros camerounais (9 chiffres commençant par 6), à ajuster si besoin
      { id: 'mtn', name: 'MTN Mobile Money', short: 'MoMo', color: '#ffcb05', text: '#1a1a1a', prefixes: ['67', '680', '681', '682', '683', '684', '650', '651', '652', '653', '654'] },
      { id: 'orange', name: 'Orange Money', short: 'OM', color: '#ff7900', text: '#ffffff', prefixes: ['69', '655', '656', '657', '658', '659', '640'] },
    ],
  },

  /**
   * Formulaire participant (Google Forms) : lien envoyé par e-mail à chaque
   * participant confirmé, quel que soit son billet, et rappelé sur la page de
   * confirmation. Même adresse que ATTENDEE_FORM_URL côté serveur.
   */
  attendeeFormUrl: 'https://docs.google.com/forms/d/1jpOGg8oab-88-x19JbFD2-s9IMjPXvjN2XXoOQH-7v8/previewResponse',

  /** Version de la politique de cookies : l'incrémenter redemande le consentement */
  consentVersion: 1,

  /** Codes d'erreur disposant d'une page dédiée */
  errorCodes: [400, 401, 403, 404, 408, 429, 500, 502, 503],
}
