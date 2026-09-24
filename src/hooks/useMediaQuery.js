import { useSyncExternalStore } from 'react'

/**
 * Suit une media query CSS depuis React, sans effet ni rendu superflu.
 * `useSyncExternalStore` s'abonne directement au navigateur : la valeur est
 * toujours juste, même au premier rendu.
 *
 * @example const isPhone = useMediaQuery('(max-width: 767.98px)')
 */
export default function useMediaQuery(query) {
  const subscribe = (onChange) => {
    const mql = window.matchMedia(query)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false, // rendu côté serveur : on suppose « pas un téléphone »
  )
}
