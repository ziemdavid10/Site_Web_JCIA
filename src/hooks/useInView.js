import { useEffect, useRef, useState } from 'react'

/**
 * Indique si un élément est visible dans la fenêtre (IntersectionObserver).
 * @param {object}  options
 * @param {boolean} options.once        Ne déclenche qu'une seule fois (par défaut : true)
 * @param {string}  options.rootMargin  Marge d'anticipation
 * @param {number}  options.threshold   Proportion visible requise
 * @returns {[React.RefObject, boolean]}
 */
export default function useInView({ once = true, rootMargin = '0px 0px -10% 0px', threshold = 0 } = {}) {
  const ref = useRef(null)
  // Navigateurs sans IntersectionObserver : contenu affiché d'emblée
  const [inView, setInView] = useState(() => !('IntersectionObserver' in window))

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined

    if (!('IntersectionObserver' in window)) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setInView(false)
        }
      },
      { rootMargin, threshold },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [once, rootMargin, threshold])

  return [ref, inView]
}
