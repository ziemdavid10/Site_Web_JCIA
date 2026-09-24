import { createContext, useContext } from 'react'

export const ThemeContext = createContext(null)

/**
 * Accès au thème courant.
 * @returns {{ theme:'light'|'dark', preference:string|null, setTheme:Function, toggleTheme:Function, isDark:boolean }}
 */
export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme doit être utilisé dans <ThemeProvider>')
  return ctx
}
