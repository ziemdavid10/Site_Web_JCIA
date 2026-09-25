import { useEffect, useState } from 'react'

/**
 * « Scroll spy » : retourne l'identifiant de la section actuellement lue,
 * pour mettre en surbrillance le lien correspondant dans la navigation.
 * @param {string[]} ids  Identifiants des sections observées
 */
export default function useScrollSpy(ids) {
  const [activeId, setActiveId] = useState(null)
  const key = ids.join('|') // dépendance stable

  useEffect(() => {
    const sections = key
      .split('|')
      .map((id) => document.getElementById(id))
      .filter(Boolean)
    if (!sections.length || !('IntersectionObserver' in window)) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        })
      },
      // Zone « active » : bande horizontale au tiers supérieur de l'écran
      { rootMargin: '-35% 0px -60% 0px' },
    )
    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [key])

  return activeId
}
