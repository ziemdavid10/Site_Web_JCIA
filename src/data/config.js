/**
 * Configuration indépendante de la langue : dates, liens, coordonnées.
 * Les textes traduisibles se trouvent dans src/i18n/locales/{fr,en}/.
 */
export const CONFIG = {
  siteUrl: 'https://www.jcia.cm',

  // Dates ISO avec fuseau du Cameroun (WAT, UTC+1)
  startDate: '2027-04-27T08:00:00+01:00',
  endDate: '2027-04-28T23:00:00+01:00',
  awardsDeadline: '2027-02-28T23:59:00+01:00',

  venue: {
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Hilton+Hotel+Yaound%C3%A9',
    // Carte intégrée (OpenStreetMap, sans clé API) — chargée seulement après consentement
    embedUrl:
      'https://www.openstreetmap.org/export/embed.html?bbox=11.5051%2C3.8595%2C11.5251%2C3.8745&layer=mapnik&marker=3.8670%2C11.5151',
  },

  links: {
    awards: 'https://awards.jcia.cm',
    iac: 'https://www.iacameroun.com',
    tdrPdf: '/documents/TDR-CAIA-2027.pdf',
    partnershipPdf: '/documents/Dossier-Partenariat-JCIA-2027.pdf',
  },

  contact: {
    phones: ['+237 222 306 079', '+237 699 089 937', '+237 677 238 022'],
    emails: ['contact@jcia.cm', 'jcia@iacameroun.com'],
    privacyEmail: 'contact@jcia.cm',
    websites: ['www.jcia.cm', 'www.iacameroun.com'],
    // ⚠️ À remplacer par les URL des comptes officiels JCIA / IAC
    socials: [
      { name: 'LinkedIn', url: 'https://www.linkedin.com/', icon: 'linkedin' },
      { name: 'Facebook', url: 'https://www.facebook.com/', icon: 'facebook' },
      { name: 'X', url: 'https://x.com/', icon: 'x' },
      { name: 'Instagram', url: 'https://www.instagram.com/', icon: 'instagram' },
      { name: 'YouTube', url: 'https://www.youtube.com/', icon: 'youtube' },
      { name: 'TikTok', url: 'https://www.tiktok.com/', icon: 'tiktok' },
    ],
  },

  /** Routes du site (identiques quelle que soit la langue) */
  routes: {
    home: '/',
    // Pages détaillées des sections
    about: '/a-propos',
    programme: '/programme',
    speakers: '/intervenants',
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
  },

  /**
   * Billetterie — tarifs en francs CFA (XAF).
   * ⚠️ Montants INDICATIFS à valider par le Comité d'Organisation.
   * Les libellés et avantages de chaque billet sont dans les fichiers de langue
   * (t.tickets.tiers[id]) ; ici uniquement les données « techniques ».
   *
   *  id        identifiant (utilisé dans l'URL /billetterie/commande/:id)
   *  price     prix unitaire (0 = gratuit, aucun paiement)
   *  maxQty    quantité maximale par commande
   *  color     accent visuel de la carte
   *  featured  mis en avant (« le plus choisi »)
   *  onsite    donne accès au Hilton (false = streaming uniquement)
   */
  tickets: {
    currency: 'XAF',
    tiers: [
      { id: 'en-ligne', price: 0, maxQty: 1, color: 'teal', icon: 'play', onsite: false },
      { id: 'etudiant', price: 5000, maxQty: 1, color: 'purple', icon: 'book', onsite: true },
      { id: 'standard', price: 15000, maxQty: 10, color: 'orange', icon: 'ticket', onsite: true, featured: true },
      { id: 'professionnel', price: 50000, maxQty: 10, color: 'rust', icon: 'star', onsite: true },
    ],
  },

  /**
   * Paiement Mobile Money.
   * Tant que VITE_PAYMENT_API_URL n'est pas défini, le site fonctionne en
   * MODE DÉMONSTRATION (paiement simulé, aucun débit) — voir src/services/payment.js.
   */
  payment: {
    apiUrl: import.meta.env.VITE_PAYMENT_API_URL || '',
    operators: [
      // Préfixes des numéros camerounais (9 chiffres commençant par 6), à ajuster si besoin
      { id: 'mtn', name: 'MTN Mobile Money', short: 'MoMo', color: '#ffcb05', text: '#1a1a1a', prefixes: ['67', '680', '681', '682', '683', '684', '650', '651', '652', '653', '654'] },
      { id: 'orange', name: 'Orange Money', short: 'OM', color: '#ff7900', text: '#ffffff', prefixes: ['69', '655', '656', '657', '658', '659', '640'] },
    ],
  },

  /** Version de la politique de cookies : l'incrémenter redemande le consentement */
  consentVersion: 1,

  /** Codes d'erreur disposant d'une page dédiée */
  errorCodes: [400, 401, 403, 404, 408, 429, 500, 502, 503],
}
