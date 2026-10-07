import { useEffect, useState } from 'react'
import { CONFIG } from '@/data/config'
import { fetchCatalog, PAYMENT_MODE } from '@/services/payment'

/**
 * Catalogue de la billetterie : configuration locale (tarifs, couleurs,
 * quotas) complétée, en mode réel, par le serveur — places restantes réelles
 * (stock TIKORA), tarif ouvert ou non à la vente, frais de service et moyens
 * de paiement acceptés.
 *
 * Un seul appel réseau par chargement de page (promesse partagée).
 */
let shared = null
const load = () => (shared ??= fetchCatalog().catch(() => null))

const DEMO = { mode: 'demo', methods: ['momo', 'card'], buyerFee: null }

export default function useTicketCatalog() {
  const [server, setServer] = useState(null)

  useEffect(() => {
    if (PAYMENT_MODE !== 'live') return undefined
    let alive = true
    load().then((data) => alive && setServer(data))
    return () => {
      alive = false
    }
  }, [])

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
    loaded: PAYMENT_MODE !== 'live' || Boolean(server),
    mode: PAYMENT_MODE,
    // Serveur branché mais en simulation (PAYMENT_PROVIDER_MODE=demo) : bandeau « démonstration »
    demo: PAYMENT_MODE !== 'live' || server?.mode === 'demo',
    // Mode réel : Mobile Money uniquement (TIKORA) ; démonstration : carte simulée aussi
    methods: PAYMENT_MODE === 'live' ? (server?.methods?.length ? server.methods : ['momo']) : DEMO.methods,
    buyerFee: PAYMENT_MODE === 'live' ? (server?.buyerFee ?? { type: 'percent', value: 2, minimum: 100 }) : null,
  }
}
