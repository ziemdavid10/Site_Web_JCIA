import { useCallback, useMemo, useState } from 'react'
import { CONFIG } from '@/data/config'
import { storage } from '@/utils/storage'
import { ConsentContext, CONSENT_CATEGORIES } from './context'

/**
 * Lit le consentement mémorisé. Il est ignoré si la version de la politique
 * a changé ou s'il date de plus de 6 mois (il faut alors le redemander).
 */
function readStoredConsent() {
  const saved = storage.getJSON(CONFIG.storage.consent)
  if (!saved || saved.version !== CONFIG.consentVersion) return null
  const SIX_MONTHS = 1000 * 60 * 60 * 24 * 182
  if (Date.now() - new Date(saved.date).getTime() > SIX_MONTHS) return null
  return saved
}

/**
 * <ConsentProvider /> — gestion du consentement aux cookies et traceurs.
 *
 * Catégories (voir CONSENT_CATEGORIES) :
 *   • necessary  — toujours actifs (langue, thème, mémorisation du consentement)
 *   • media      — contenus tiers intégrés (carte OpenStreetMap)
 *   • analytics  — mesure d'audience (aucun outil installé à ce jour ; prêt à brancher)
 *
 * Usage dans un composant :
 *   const { has } = useConsent()
 *   if (has('media')) … charger l'iframe …
 */
export default function ConsentProvider({ children }) {
  const [consent, setConsent] = useState(readStoredConsent)
  const [panelOpen, setPanelOpen] = useState(false)

  /** Enregistre un choix { media: bool, analytics: bool } */
  const save = useCallback((choices) => {
    const record = {
      version: CONFIG.consentVersion,
      date: new Date().toISOString(),
      choices: { necessary: true, ...choices },
    }
    storage.setJSON(CONFIG.storage.consent, record)
    setConsent(record)
    setPanelOpen(false)
  }, [])

  const acceptAll = useCallback(
    () => save(Object.fromEntries(CONSENT_CATEGORIES.map((c) => [c, true]))),
    [save],
  )
  const rejectAll = useCallback(
    () => save(Object.fromEntries(CONSENT_CATEGORIES.map((c) => [c, c === 'necessary']))),
    [save],
  )

  /** Autorise une seule catégorie en conservant les autres choix (ex : « Afficher la carte ») */
  const allow = useCallback(
    (category) => {
      const current = consent?.choices ?? Object.fromEntries(CONSENT_CATEGORIES.map((c) => [c, c === 'necessary']))
      save({ ...current, [category]: true })
    },
    [consent, save],
  )

  const has = useCallback((category) => category === 'necessary' || Boolean(consent?.choices?.[category]), [consent])

  const value = useMemo(
    () => ({
      consent,
      hasDecided: Boolean(consent),
      has,
      allow,
      save,
      acceptAll,
      rejectAll,
      panelOpen,
      openPanel: () => setPanelOpen(true),
      closePanel: () => setPanelOpen(false),
    }),
    [consent, has, allow, save, acceptAll, rejectAll, panelOpen],
  )

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
}
