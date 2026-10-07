import { useEffect, useState } from 'react'
import { allAttendees, fetchPublicAttendees, localAttendees, mergeAttendees } from '@/services/attendees'
import { PAYMENT_MODE } from '@/services/payment'

/**
 * Participants « Ils y seront » : liste du serveur en mode réel (une seule
 * requête par chargement de page, partagée entre les composants), liste
 * d'exemple en démonstration.
 */
let shared = null
const load = () => (shared ??= fetchPublicAttendees().catch(() => null))

export default function useAttendees() {
  const live = PAYMENT_MODE === 'live'
  const [people, setPeople] = useState(() => (live ? localAttendees() : allAttendees()))

  useEffect(() => {
    if (!live) return undefined
    let alive = true
    load().then((server) => alive && setPeople(mergeAttendees(server)))
    return () => {
      alive = false
    }
  }, [live])

  return people
}
