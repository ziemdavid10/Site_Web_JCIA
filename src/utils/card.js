/**
 * Carte bancaire : mise en forme et vérifications faites dans le navigateur.
 *
 * ⚠️ IMPORTANT — ce que le site fait, et ce qu'il ne fait pas
 * Ces fonctions servent uniquement à guider la saisie (numéro groupé par 4,
 * réseau reconnu, date cohérente) et à éviter d'envoyer une demande vouée à
 * l'échec. Elles ne valident JAMAIS un paiement : seule la banque le fait.
 *
 * Le numéro complet ne quitte le formulaire que vers l'API de paiement, en
 * HTTPS, et n'est NI journalisé, NI conservé : la commande enregistrée sur
 * l'appareil ne garde que le réseau (« visa ») et les quatre derniers chiffres.
 *
 * En production, la solution recommandée reste la tokenisation du prestataire
 * (champs hébergés / SDK) : le numéro ne traverse alors même plus notre page,
 * ce qui réduit fortement les obligations PCI-DSS du commerçant. Voir
 * SECURITY.md et src/services/payment.js.
 */

/** Ne garde que les chiffres (l'utilisateur peut coller un numéro espacé) */
export const digitsOnly = (value = '') => String(value).replace(/\D/g, '')

/** Réseaux acceptés par la billetterie */
export const CARD_BRANDS = {
  visa: { label: 'Visa', lengths: [13, 16, 19], cvc: 3 },
  mastercard: { label: 'Mastercard', lengths: [16], cvc: 3 },
}

/**
 * Réseau déduit des premiers chiffres (IIN) : 'visa', 'mastercard' ou null.
 *  Visa        → commence par 4
 *  Mastercard  → 51–55, ou la plage 2221–2720
 */
export function detectBrand(value) {
  const n = digitsOnly(value)
  if (!n) return null
  if (n[0] === '4') return 'visa'
  const two = Number(n.slice(0, 2))
  const four = Number(n.slice(0, 4))
  if (two >= 51 && two <= 55) return 'mastercard'
  if (n.length >= 4 && four >= 2221 && four <= 2720) return 'mastercard'
  if (n.length < 4 && (n[0] === '2' || n[0] === '5')) return 'mastercard' // saisie en cours
  return null
}

/** Somme de Luhn : détecte une faute de frappe, pas une carte valide */
export function luhn(value) {
  const n = digitsOnly(value)
  if (n.length < 12) return false
  let sum = 0
  let double = false
  for (let i = n.length - 1; i >= 0; i -= 1) {
    let d = n.charCodeAt(i) - 48
    if (double) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    double = !double
  }
  return sum % 10 === 0
}

/** Numéro affiché par groupes de 4 : 4242 4242 4242 4242 */
export function formatCardNumber(value) {
  return digitsOnly(value).slice(0, 19).replace(/(.{4})/g, '$1 ').trim()
}

/** Le numéro est-il plausible ? (réseau accepté, longueur attendue, Luhn) */
export function isValidCardNumber(value) {
  const n = digitsOnly(value)
  const brand = detectBrand(n)
  if (!brand) return false
  return CARD_BRANDS[brand].lengths.includes(n.length) && luhn(n)
}

/** Saisie guidée de l'expiration : « 0527 » → « 05/27 » */
export function formatExpiry(value) {
  const n = digitsOnly(value).slice(0, 4)
  if (n.length <= 2) return n
  return `${n.slice(0, 2)}/${n.slice(2)}`
}

/**
 * Expiration valide et non dépassée.
 * @param {string} value  « MM/AA » ou « MMAA »
 * @param {Date}   now    instant de référence (injecté pour les tests)
 */
export function isValidExpiry(value, now = new Date()) {
  const n = digitsOnly(value)
  if (n.length !== 4) return false
  const month = Number(n.slice(0, 2))
  const year = 2000 + Number(n.slice(2))
  if (month < 1 || month > 12) return false
  // Une carte reste valable jusqu'au dernier jour de son mois
  const endOfMonth = new Date(year, month, 1).getTime() - 1
  return endOfMonth >= now.getTime()
}

/** CVC : 3 chiffres pour Visa et Mastercard */
export function isValidCvc(value, brand = 'visa') {
  const n = digitsOnly(value)
  return n.length === (CARD_BRANDS[brand]?.cvc ?? 3)
}

/** Quatre derniers chiffres — la seule partie du numéro que l'on garde */
export const last4 = (value) => digitsOnly(value).slice(-4)

/** Numéro masqué pour l'affichage : •••• •••• •••• 4242 */
export const maskCardNumber = (value) => `•••• •••• •••• ${last4(value)}`
