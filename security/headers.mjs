/**
 * En-têtes de sécurité HTTP du site JCIA 2027 — SOURCE UNIQUE.
 *
 * Utilisé par vite.config.js au moment du build pour :
 *   • injecter la Content-Security-Policy dans index.html (balise <meta>, filet de sécurité) ;
 *   • générer dist/_headers (Netlify, Cloudflare Pages) ;
 *   • compléter dist/.htaccess (Apache).
 * vercel.json et l'exemple Nginx du README reprennent les mêmes valeurs.
 *
 * Content-Security-Policy (CSP) = la liste des sources autorisées. Tout le reste
 * est bloqué par le navigateur, ce qui neutralise la plupart des injections de
 * script (XSS) même si une faille apparaissait un jour dans le code.
 */

/** Carte OpenStreetMap intégrée (chargée seulement après consentement) */
const MAP_ORIGIN = 'https://www.openstreetmap.org'

/**
 * @param {{ paymentApiUrl?: string }} options  URL de l'API de paiement (VITE_PAYMENT_API_URL)
 * @returns {string} la politique CSP
 */
export function buildCsp({ paymentApiUrl = '' } = {}) {
  let paymentOrigin = ''
  try {
    const u = new URL(paymentApiUrl)
    if (u.protocol === 'https:') paymentOrigin = u.origin
  } catch {
    /* pas d'API configurée (mode démonstration) */
  }

  const directives = {
    'default-src': ["'self'"],
    // Aucun script en ligne ni venu d'ailleurs (le script du thème est un fichier : /theme-init.js)
    'script-src': ["'self'"],
    // Styles : 'unsafe-inline' requis par l'écran de chargement d'index.html et les
    // attributs style dynamiques ; sans risque d'exécution de code.
    'style-src': ["'self'", "'unsafe-inline'"],
    // data: → QR codes, photos de participant gardées sur l'appareil ; blob: → aperçus ;
    // API de billetterie → photos de la liste publique des participants
    'img-src': ["'self'", 'data:', 'blob:', paymentOrigin].filter(Boolean),
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", paymentOrigin].filter(Boolean),
    'frame-src': [MAP_ORIGIN],
    'media-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"], // interdit d'afficher le site dans une iframe (clickjacking)
    'manifest-src': ["'self'"],
    'worker-src': ["'self'"],
    'upgrade-insecure-requests': [],
  }

  return Object.entries(directives)
    .map(([k, v]) => [k, ...v].join(' '))
    .join('; ')
}

/** Directives ignorées dans une balise <meta> (elles n'ont d'effet qu'en en-tête HTTP) */
export function cspForMeta(csp) {
  return csp
    .split('; ')
    .filter((d) => !/^(frame-ancestors|report-uri|sandbox)/.test(d))
    .join('; ')
}

/** Autres en-têtes de sécurité */
export const SECURITY_HEADERS = {
  // HTTPS obligatoire pendant 2 ans, sous-domaines compris
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  // Le navigateur ne « devine » pas le type des fichiers
  'X-Content-Type-Options': 'nosniff',
  // Anciens navigateurs : pas d'affichage dans une iframe
  'X-Frame-Options': 'DENY',
  // L'adresse complète des pages n'est pas transmise aux autres sites
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Fonctions sensibles désactivées (le flyer lit un fichier, pas la caméra)
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), serial=(), magnetometer=(), gyroscope=(), accelerometer=(), browsing-topics=()',
  // Isole la page des autres fenêtres (attaques par fenêtre ouverte)
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Permitted-Cross-Domain-Policies': 'none',
}

/** Toutes les en-têtes, CSP comprise */
export function allHeaders(options) {
  return { 'Content-Security-Policy': buildCsp(options), ...SECURITY_HEADERS }
}
