/**
 * Outils de sécurité : nettoyage et validation des données.
 *
 * Règle générale : React échappe déjà tout texte affiché ({valeur}), ce qui
 * empêche l'injection de HTML/JavaScript (XSS). Le site n'utilise jamais
 * de HTML brut. Ces fonctions couvrent le reste :
 *   • les adresses de liens (un lien « javascript: » exécuterait du code) ;
 *   • les champs saisis par l'utilisateur (longueur, caractères de contrôle) ;
 *   • les identifiants lus dans l'URL ou le stockage local (liste blanche / format).
 */

/** Liens internes (/page), ancres (#id), mailto/tel et https uniquement. */
const SAFE_HREF = /^(\/(?!\/)|#|mailto:|tel:|https:\/\/)/i

/**
 * Renvoie l'adresse si elle est sûre, sinon null.
 * Refuse notamment javascript:, data:, vbscript: et les URL « //domaine » ambiguës.
 */
export function safeHref(href) {
  if (typeof href !== 'string') return null
  const trimmed = href.trim()
  // Retire les caractères invisibles qui servent à contourner les filtres (« java\tscript: »)
  // eslint-disable-next-line no-control-regex -- on cherche justement à retirer ces caractères
  const compact = trimmed.replace(/[\u0000-\u001F\u007F\s]+/g, '')
  if (/^(javascript|data|vbscript):/i.test(compact)) return null
  return SAFE_HREF.test(trimmed) ? trimmed : null
}

/** Lien externe : uniquement https:// vers un nom de domaine. */
export function safeExternalUrl(url) {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && u.hostname.includes('.') ? u.href : null
  } catch {
    return null
  }
}

/**
 * Nettoie un texte saisi : supprime les caractères de contrôle et les
 * caractères de mise en forme invisibles, réduit les espaces, limite la longueur.
 */
export function cleanText(value, max = 120) {
  return String(value ?? '')
    .normalize('NFC')
    // eslint-disable-next-line no-control-regex -- on cherche justement à retirer ces caractères
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

/** Nom de personne : lettres (tous alphabets), espaces, apostrophes, tirets, points. */
export function isValidPersonName(value) {
  const v = cleanText(value, 80)
  return v.length >= 3 && /^[\p{L}\p{M}][\p{L}\p{M}' .’-]*$/u.test(v)
}

/** Prénom ou nom seul : au moins 2 caractères (même règle que le serveur). */
export function isValidNamePart(value) {
  const v = cleanText(value, 40)
  return v.length >= 2 && /^[\p{L}\p{M}][\p{L}\p{M}' .’-]*$/u.test(v)
}

/** E-mail : forme simple et longueur raisonnable (la vraie vérification = e-mail envoyé). */
export function isValidEmail(value) {
  const v = cleanText(value, 254)
  return v.length <= 254 && /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i.test(v)
}

/** Identifiant de commande : JCIA27-XXXXXX (alphabet sans caractères ambigus). */
export const ORDER_ID_RE = /^JCIA27-[A-HJ-NP-Z2-9]{6}$/

/** Valeur présente dans une liste blanche, sinon valeur par défaut. */
export function oneOf(value, allowed, fallback = null) {
  return allowed.includes(value) ? value : fallback
}
