/**
 * Validation et nettoyage des entrées — mêmes règles que le frontend
 * (frontend/src/security/sanitize.js, frontend/src/utils/phone.js) afin qu'une
 * donnée acceptée par le formulaire le soit aussi par le serveur, et
 * inversement : le serveur ne fait JAMAIS confiance au navigateur.
 */

/** Identifiant de commande généré par le site : JCIA27-XXXXXX */
export const ORDER_ID_RE = /^JCIA27-[A-Z0-9]{6}$/
/** Identifiant de paiement : PAY-<uuid> (non devinable) ou ancien format */
export const PAYMENT_ID_RE = /^[\w-]{1,100}$/

export function cleanText(value, max = 120) {
  return String(value ?? '')
    .normalize('NFC')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

export function validEmail(email) {
  if (typeof email !== 'string') return false
  const v = email.trim()
  return v.length <= 254 && /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i.test(v)
}

export function isValidPersonName(value) {
  const v = cleanText(value, 80)
  return v.length >= 3 && /^[\p{L}\p{M}][\p{L}\p{M}' .’-]*$/u.test(v)
}

/** 9 chiffres nationaux camerounais (retire +237 / 00237 / espaces). */
export function normalizePhone(value = '') {
  let digits = String(value ?? '').replace(/\D/g, '')
  if (digits.startsWith('00237')) digits = digits.slice(5)
  else if (digits.startsWith('237') && digits.length > 9) digits = digits.slice(3)
  return digits
}

export function isValidCmPhone(value) {
  return /^6\d{8}$/.test(normalizePhone(value))
}

/** Format international attendu par TIKORA pour l'acheteur : +2376XXXXXXXX */
export const toE164 = (phone) => `+237${normalizePhone(phone)}`
/** Format attendu par TIKORA pour le payeur Mobile Money : 2376XXXXXXXX */
export const toMsisdn = (phone) => `237${normalizePhone(phone)}`

export const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
