import { CONFIG } from '@/data/config'

/**
 * Outils pour les numéros de téléphone camerounais (Mobile Money).
 * Format national : 9 chiffres commençant par 6 (ex. 6 77 23 80 22).
 */

/** Ne garde que les 9 chiffres nationaux (retire +237, 00237, espaces, tirets). */
export function normalizePhone(value = '') {
  let digits = String(value).replace(/\D/g, '')
  if (digits.startsWith('00237')) digits = digits.slice(5)
  else if (digits.startsWith('237') && digits.length > 9) digits = digits.slice(3)
  return digits
}

/** Numéro mobile camerounais valide ? */
export function isValidCmPhone(value) {
  return /^6\d{8}$/.test(normalizePhone(value))
}

/**
 * Déduit l'opérateur (MTN / Orange) à partir du préfixe.
 * @returns {object|null} opérateur de CONFIG.payment.operators, ou null si inconnu
 */
export function detectOperator(value) {
  const digits = normalizePhone(value)
  if (digits.length < 2) return null
  // Préfixe le plus long d'abord (ex. « 655 » avant « 65 »)
  let best = null
  for (const op of CONFIG.payment.operators) {
    for (const p of op.prefixes) {
      if (digits.startsWith(p) && (!best || p.length > best.len)) best = { op, len: p.length }
    }
  }
  return best?.op ?? null
}

/** Mise en forme lisible : +237 6 77 23 80 22 */
export function formatCmPhone(value) {
  const d = normalizePhone(value)
  if (d.length !== 9) return value
  return `+237 ${d[0]} ${d.slice(1, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`
}
