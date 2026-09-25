import { useCallback, useEffect, useMemo, useState } from 'react'
import { CONFIG } from '@/data/config'
import { storage } from '@/utils/storage'
import { ThemeContext } from './context'

const media = () => window.matchMedia('(prefers-color-scheme: dark)')

/**
 * <ThemeProvider /> — thème clair / sombre.
 *
 *  • Sans choix explicite, le thème suit le réglage du système (et ses changements).
 *  • Le choix de l'utilisateur est mémorisé.
 *  • Le thème est appliqué via l'attribut data-theme sur <html> : toutes les
 *    couleurs « sémantiques » (variables CSS --c-*) basculent automatiquement.
 *  • Un script inline dans index.html applique le thème AVANT le premier
 *    affichage pour éviter tout flash de couleur.
 */
export default function ThemeProvider({ children }) {
  // Préférence mémorisée : 'light' | 'dark' | null (= système)
  const [preference, setPreference] = useState(() => {
    const saved = storage.get(CONFIG.storage.theme)
    return saved === 'light' || saved === 'dark' ? saved : null
  })
  const [systemDark, setSystemDark] = useState(() => media().matches)

  // Écoute les changements du thème système
  useEffect(() => {
    const mq = media()
    const onChange = (e) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const theme = preference ?? (systemDark ? 'dark' : 'light')

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.style.colorScheme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0c1122' : '#19203a')
  }, [theme])

  const setTheme = useCallback((next) => {
    // Fondu des couleurs pendant la bascule (classe retirée ensuite pour ne pas
    // ralentir les autres transitions du site)
    const root = document.documentElement
    root.classList.add('theme-transition')
    window.setTimeout(() => root.classList.remove('theme-transition'), 450)

    setPreference(next)
    if (next) storage.set(CONFIG.storage.theme, next)
    else storage.remove(CONFIG.storage.theme)
  }, [])

  const toggleTheme = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme])

  const value = useMemo(
    () => ({ theme, preference, setTheme, toggleTheme, isDark: theme === 'dark' }),
    [theme, preference, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
