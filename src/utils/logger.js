import { CONFIG } from '../config/env.js'

/**
 * Journal structuré (une ligne JSON par événement), sans données personnelles.
 *
 * Toute valeur passée dans `meta` est filtrée : les clés sensibles (carte, CVC,
 * clé d'API, mot de passe, jeton) sont supprimées ; e-mails et téléphones sont
 * masqués. Ainsi une erreur ne peut pas recopier une clé TIKORA ou un numéro de
 * client dans les logs.
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 }
const threshold = LEVELS[CONFIG.logLevel] ?? LEVELS.info

const SECRET_KEYS = /^(card|cvc|cvv|number|pan|password|pass|secret|token|accesstoken|apikey|api_key|authorization|qrtoken|smtp_pass)$/i

export function maskEmail(email) {
  const s = String(email ?? '')
  const [user, domain] = s.split('@')
  if (!domain) return s ? '***' : ''
  return `${user.slice(0, 2)}***@${domain}`
}

export function maskPhone(phone) {
  const d = String(phone ?? '').replace(/\D/g, '')
  return d.length >= 4 ? `***${d.slice(-3)}` : d ? '***' : ''
}

export function redact(value, depth = 0) {
  if (depth > 4 || value == null) return value
  if (value instanceof Error) {
    return { name: value.name, message: redactString(value.message), code: value.code, status: value.status }
  }
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1))
  if (typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      if (SECRET_KEYS.test(k)) continue
      if (/email/i.test(k)) out[k] = maskEmail(v)
      else if (/phone/i.test(k)) out[k] = maskPhone(v)
      else out[k] = redact(v, depth + 1)
    }
    return out
  }
  return typeof value === 'string' ? redactString(value) : value
}

function redactString(s) {
  return String(s)
    .replace(/tk_(live|test)_[A-Za-z0-9_-]+/g, 'tk_$1_***')
    .replace(/\b\d{13,19}\b/g, '[pan]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, (m) => maskEmail(m))
    .slice(0, 500)
}

function write(level, msg, meta) {
  if ((LEVELS[level] ?? 0) < threshold) return
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg, ...(meta ? redact(meta) : {}) })
  if (level === 'error' || level === 'warn') process.stderr.write(`${line}\n`)
  else process.stdout.write(`${line}\n`)
}

export const logger = {
  debug: (msg, meta) => write('debug', msg, meta),
  info: (msg, meta) => write('info', msg, meta),
  warn: (msg, meta) => write('warn', msg, meta),
  error: (msg, meta) => write('error', msg, meta),
}
