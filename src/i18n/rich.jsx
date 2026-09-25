import { Fragment } from 'react'
import { Link } from 'react-router'
import { safeHref } from '@/security/sanitize'

/**
 * Mise en forme légère des textes traduits :
 *   *texte*         → <em>     (mot mis en valeur : soulignement orange dans les titres)
 *   **texte**       → <strong>
 *   [texte](/lien)  → lien (interne via le routeur, ou document dans un nouvel onglet)
 *   [texte]         → lien vers `options.link` (utile quand l'URL dépend du contexte)
 *
 * Permet de garder les traductions en chaînes simples dans les fichiers de
 * langue tout en conservant les accents typographiques du design.
 *
 * @param {string} text
 * @param {{ link?: string, newTab?: boolean }} options  newTab : ouvre aussi les liens internes dans un nouvel onglet
 * @example rich('La plateforme de référence sur l’*IA*')
 */
const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\](?:\([^)]+\))?)/g

export function rich(text, options = {}) {
  if (typeof text !== 'string') return text

  return text.split(TOKEN).map((part, i) => {
    if (!part) return null

    // Gras
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>

    // Mise en valeur
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>

    // Liens
    const link = part.match(/^\[([^\]]+)\](?:\(([^)]+)\))?$/)
    if (link) {
      const [, label, rawHref = options.link] = link
      // Sécurité : seules les adresses sûres deviennent des liens (jamais « javascript: »)
      const href = safeHref(rawHref)
      if (!href) return <Fragment key={i}>{label}</Fragment>
      // Documents (PDF…) et liens externes : nouvel onglet
      if (options.newTab || /^(https:|mailto:|tel:)|\.pdf$/.test(href)) {
        return (
          <a key={i} href={href} target="_blank" rel="noopener noreferrer">
            {label}
          </a>
        )
      }
      return (
        <Link key={i} to={href}>
          {label}
        </Link>
      )
    }

    return <Fragment key={i}>{part}</Fragment>
  })
}
