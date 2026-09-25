/**
 * Vérifie que toutes les langues ont exactement la même structure que le
 * français (mêmes clés, mêmes longueurs de listes, pas de texte vide).
 * Usage : npm run check:i18n
 */
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { LOCALES, DEFAULT_LANG } = await server.ssrLoadModule('/src/i18n/locales/index.js')
await server.close()

const problems = []
const typeOf = (v) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v)

function compare(ref, other, path, lang) {
  if (typeOf(ref) !== typeOf(other)) {
    problems.push(`[${lang}] ${path} : type ${typeOf(other)} au lieu de ${typeOf(ref)}`)
    return
  }
  if (typeof ref === 'string' && ref.trim() && !other.trim()) problems.push(`[${lang}] ${path} : texte vide`)
  if (Array.isArray(ref)) {
    if (ref.length !== other.length) problems.push(`[${lang}] ${path} : ${other.length} éléments au lieu de ${ref.length}`)
    ref.forEach((item, i) => other[i] !== undefined && compare(item, other[i], `${path}[${i}]`, lang))
  } else if (ref && typeof ref === 'object') {
    for (const key of Object.keys(ref)) {
      if (!(key in other)) problems.push(`[${lang}] ${path}.${key} : clé manquante`)
      else compare(ref[key], other[key], `${path}.${key}`, lang)
    }
    for (const key of Object.keys(other)) if (!(key in ref)) problems.push(`[${lang}] ${path}.${key} : clé en trop`)
  }
}

for (const [lang, locale] of Object.entries(LOCALES)) {
  if (lang !== DEFAULT_LANG) compare(LOCALES[DEFAULT_LANG], locale, 't', lang)
}

if (problems.length) {
  console.error(`✗ ${problems.length} écart(s) de traduction :\n` + problems.join('\n'))
  process.exit(1)
}
console.log(`✓ Traductions cohérentes (${Object.keys(LOCALES).join(', ')})`)
