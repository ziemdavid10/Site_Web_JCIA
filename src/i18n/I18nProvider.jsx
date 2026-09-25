import { useCallback, useEffect, useMemo, useState } from 'react'
import { CONFIG } from '@/data/config'
import { storage } from '@/utils/storage'
import { I18nContext } from './context'
import { DEFAULT_LANG, LANGS, LOCALES } from './locales'

/**
 * Détermine la langue initiale, par ordre de priorité :
 *   1. paramètre d'URL ?lang=en (liens partagés)
 *   2. choix mémorisé de l'utilisateur
 *   3. langue du navigateur (anglais → en, sinon français)
 */
function detectLang() {
  const fromUrl = new URLSearchParams(window.location.search).get('lang')
  if (LANGS.includes(fromUrl)) return fromUrl
  const saved = storage.get(CONFIG.storage.lang)
  if (LANGS.includes(saved)) return saved
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : DEFAULT_LANG
}

/**
 * <I18nProvider /> — fournit la langue courante et les contenus traduits.
 * Met aussi à jour <html lang>, le titre et la description de la page.
 */
export default function I18nProvider({ children }) {
  const [lang, setLangState] = useState(detectLang)
  const t = LOCALES[lang]

  const setLang = useCallback((next) => {
    if (!LANGS.includes(next)) return
    setLangState(next)
    storage.set(CONFIG.storage.lang, next)
  }, [])

  // Synchronise le document avec la langue choisie
  useEffect(() => {
    document.documentElement.lang = lang
    document.querySelector('meta[name="description"]')?.setAttribute('content', t.meta.description)
    document.querySelector('meta[property="og:locale"]')?.setAttribute('content', t.meta.ogLocale)
  }, [lang, t])

  const value = useMemo(() => ({ lang, setLang, t, locale: t.meta.intlLocale }), [lang, setLang, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
