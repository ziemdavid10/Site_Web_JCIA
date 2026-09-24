import { useEffect } from 'react'

/**
 * Met à jour le titre de l'onglet (et, si demandé, interdit l'indexation).
 * @param {string}  title    Titre de la page (null = titre par défaut)
 * @param {object}  options
 * @param {boolean} options.noindex  Ajoute <meta name="robots" content="noindex"> (pages d'erreur)
 */
export default function useDocumentMeta(title, { noindex = false } = {}) {
  useEffect(() => {
    if (title) document.title = title

    let robots
    if (noindex) {
      robots = document.createElement('meta')
      robots.name = 'robots'
      robots.content = 'noindex'
      document.head.appendChild(robots)
    }
    return () => robots?.remove()
  }, [title, noindex])
}
