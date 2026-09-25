import { useEffect, useState } from 'react'

/** L'utilisateur a-t-il demandé à réduire les animations ? */
const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/**
 * Anime un nombre de 0 à `end` lorsque `start` devient vrai.
 * Utilise une courbe « ease-out » et respecte prefers-reduced-motion.
 * @param {number}  end       Valeur finale
 * @param {boolean} start     Déclencheur (ex: élément visible)
 * @param {number}  duration  Durée en ms
 */
export default function useCountUp(end, start, duration = 1800) {
  const [value, setValue] = useState(0)
  const reduce = prefersReducedMotion()

  useEffect(() => {
    if (!start || reduce) return undefined

    let frame
    const t0 = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
      setValue(Math.round(end * eased))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [end, start, duration, reduce])

  // Animations réduites : valeur finale directement, sans animation
  return reduce && start ? end : value
}
