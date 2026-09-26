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
    awards: 'https://awards.jcia.cm',
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
   *                     aucune commande ne peut être passée. À repasser à
   *                     `true` le jour où l'API de paiement (Mobile Money et
   *                     cartes) est branchée — voir VITE_PAYMENT_API_URL.
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
  /**
   * Billetterie.
   *
   * Chaque tarif a :
   *   price   prix unitaire en FCFA (à faire valider par le Comité d'Organisation) ;
   *   quota   nombre de billets mis en vente pour ce tarif ;
   *   sold    billets déjà vendus — 0 ici ; en production, cette valeur vient du
   *           serveur de billetterie (GET /tickets/availability) : le navigateur
   *           ne doit jamais faire foi sur les stocks ;
   *   maxQty  nombre maximum de billets par commande.
   *
   * Quatre tarifs validés par l'organisateur : trois sur place (Hilton) et un
   * « En ligne » qui donne accès à la retransmission des travaux.
   * Il n'y a plus d'option gratuite : le flyer « J'y serai » est donc ouvert à
   * tous les billets confirmés.
   */
  tickets: {
    currency: 'XAF',
    tiers: [
      { id: 'etudiant', price: 2500, quota: 1500, sold: 0, maxQty: 5, color: 'purple', icon: 'book', onsite: true },
      { id: 'standard', price: 5000, quota: 3000, sold: 0, maxQty: 10, color: 'orange', icon: 'ticket', onsite: true },
      { id: 'en-ligne', price: 15000, quota: 5000, sold: 0, maxQty: 5, color: 'teal', icon: 'play', onsite: false },
      { id: 'professionnel', price: 25000, quota: 500, sold: 0, maxQty: 10, color: 'rust', icon: 'star', onsite: true },
    ],
  },

  /**
   * Paiement Mobile Money.
   * Tant que VITE_PAYMENT_API_URL n'est pas défini, le site fonctionne en
   * MODE DÉMONSTRATION (paiement simulé, aucun débit) — voir src/services/payment.js.
   */
  payment: {
    apiUrl: import.meta.env.VITE_PAYMENT_API_URL || '',
    /**
     * Cartes bancaires acceptées.
     * ⚠️ Le site n'affiche JAMAIS de formulaire de carte : le paiement se
     * déroule sur la page sécurisée (3-D Secure) de la banque, vers laquelle
     * le serveur de billetterie redirige. Aucun numéro de carte ne transite
     * donc par ce site — c'est l'exigence PCI-DSS et cela évite toute
     * responsabilité de stockage.
     * Les logos officiels Visa / Mastercard doivent être obtenus auprès des
     * réseaux (kits de marque) et déposés dans public/images/ ; en attendant,
     * une pastille typographique est affichée, comme pour les opérateurs.
     */
    cards: [
      { id: 'visa', name: 'Visa', short: 'VISA', color: '#1a1f71', text: '#ffffff' },
      { id: 'mastercard', name: 'Mastercard', short: 'MC', color: '#c8102e', text: '#ffffff' },
    ],
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
