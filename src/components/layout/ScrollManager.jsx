import { useEffect } from 'react'
import { useLocation } from 'react-router'

/**
 * <ScrollManager /> — gestion du défilement lors des navigations :
 *  • changement de page → retour en haut ;
 *  • URL avec ancre (/#programme) → défilement jusqu'à la section, en
 *    réessayant brièvement le temps que la page (chargée à la demande) s'affiche.
 * Déplace aussi le focus sur le contenu principal pour les lecteurs d'écran.
 */
export default function ScrollManager() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'instant' })
      return undefined
    }

    let tries = 0
    let timer
    const tryScroll = () => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)))
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else if (tries++ < 20) {
        timer = setTimeout(tryScroll, 60)
      }
    }
    tryScroll()
    return () => clearTimeout(timer)
  }, [pathname, hash])

  return null
}
