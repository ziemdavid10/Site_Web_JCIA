import { useCallback, useEffect, useState } from 'react'
import { CONFIG } from '@/data/config'
import { API, fetchCatalog } from '@/services/payment'
import { isSoldOut } from '@/utils/tickets'

/**
 * Catalogue de la billetterie : configuration locale (tarifs, couleurs,
 * quotas) complétée par le SERVEUR — places restantes réelles (stock TIKORA),
 * vente ouverte ou non, frais de service.
 *
 * Aucun repli simulé : tant que le serveur n'a pas répondu, ou s'il est
 * injoignable, aucune commande ne peut être passée.
 *
 *   status    'loading' | 'ready' | 'unavailable'
 *   salesOpen vente des billets PAYANTS ouverte chez TIKORA (événement validé)
 *
 * Un seul appel réseau par chargement de page (promesse partagée) ; « Réessayer »
 * relance l'appel.
 */
let shared = null
const load = () => (shared ??= fetchCatalog().catch(() => null))

export default function useTicketCatalog() {
  const [state, setState] = useState({ server: null, status: API ? 'loading' : 'unavailable' })

  useEffect(() => {
    if (!API) return undefined
    let alive = true
    load().then((data) => alive && setState({ server: data, status: data ? 'ready' : 'unavailable' }))
    return () => {
      alive = false
    }
  }, [])

  const retry = useCallback(() => {
    if (!API) return
    shared = null
    setState((s) => ({ ...s, status: 'loading' }))
    load().then((data) => setState({ server: data, status: data ? 'ready' : 'unavailable' }))
  }, [])

  const { server, status } = state
  const byId = new Map((server?.tiers ?? []).map((t) => [t.id, t]))
  const tiers = CONFIG.tickets.tiers.map((tier) => {
    const live = byId.get(tier.id)
    if (!live) return tier
    return {
      ...tier,
      available: Number.isFinite(live.available) ? live.available : undefined,
      onSale: live.onSale !== false,
    }
  })

  return {
    tiers,
    status,
    ready: status === 'ready',
    salesOpen: status === 'ready' && server?.salesOpen !== false,
    buyerFee: server?.buyerFee ?? { type: 'percent', value: 2, minimum: 100 },
    retry,
  }
}

/**
 * Peut-on commander ce tarif maintenant ?
 *   'open'        oui
 *   'soldout'     plus aucune place
 *   'soon'        vente pas encore ouverte (TIKORA n'a pas validé l'événement, ou période fermée)
 *   'unavailable' serveur injoignable / non configuré
 *   'loading'     réponse du serveur en attente
 */
export function tierAvailability(tier, catalog) {
  if (!CONFIG.features.payment) return 'soon'
  if (catalog.status === 'unavailable') return 'unavailable'
  if (catalog.status === 'loading') return 'loading'
  if (isSoldOut(tier)) return 'soldout'
  if (tier.price > 0 && !catalog.salesOpen) return 'soon'
  return tier.onSale === false ? 'soon' : 'open'
}

/**
 * Billet PAYANT : le paiement se fait sur la page TIKORA de l'événement, qui ne
 * dépend pas de notre serveur. Le lien reste donc ouvert même si notre serveur
 * ne répond pas ; il n'est fermé que si la vente n'est pas ouverte chez TIKORA
 * ou si le tarif est épuisé (informations lues sur notre serveur quand il répond).
 *   'open' | 'soldout' | 'soon'
 */
export function tikoraAvailability(tier, catalog) {
  if (!CONFIG.features.payment || !CONFIG.payment.tikoraEventUrl) return 'soon'
  if (isSoldOut(tier)) return 'soldout'
  if (catalog.ready && !catalog.salesOpen) return 'soon'
  return 'open'
}
