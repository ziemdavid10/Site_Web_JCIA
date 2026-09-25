import { createContext, useContext } from 'react'

/** Contexte de langue (séparé du Provider pour le rafraîchissement à chaud de Vite). */
export const I18nContext = createContext(null)

/**
 * Accès à la langue et aux traductions.
 * @returns {{ lang: 'fr'|'en', setLang: Function, t: object, locale: string }}
 * @example const { t } = useI18n(); <h2>{t.faq.title}</h2>
 */
export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n doit être utilisé dans <I18nProvider>')
  return ctx
}
