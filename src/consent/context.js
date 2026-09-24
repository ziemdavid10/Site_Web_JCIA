import { createContext, useContext } from 'react'

/** Catégories de cookies / traceurs gérées par le bandeau de consentement */
export const CONSENT_CATEGORIES = ['necessary', 'media', 'analytics']

export const ConsentContext = createContext(null)

/**
 * Accès au consentement de l'utilisateur.
 * @returns {{ consent, hasDecided:boolean, has:(cat:string)=>boolean, allow:(cat:string)=>void, save, acceptAll, rejectAll,
 *             panelOpen:boolean, openPanel:Function, closePanel:Function }}
 */
export function useConsent() {
  const ctx = useContext(ConsentContext)
  if (!ctx) throw new Error('useConsent doit être utilisé dans <ConsentProvider>')
  return ctx
}
