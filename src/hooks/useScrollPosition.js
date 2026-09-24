import { useEffect, useState } from 'react'

/**
 * Retourne la position verticale de défilement (limitée via requestAnimationFrame).
 * Sert à l'en-tête (état « compact ») et au bouton « retour en haut ».
 */
export default function useScrollPosition() {
  const [y, setY] = useState(0)

  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        setY(window.scrollY)
        ticking = false
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return y
}
