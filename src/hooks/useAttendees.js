import { useEffect, useState } from 'react'
import { fetchPublicAttendees, localAttendees, mergeAttendees } from '@/services/attendees'

/**
 * Participants « Ils y seront » : liste du serveur (une seule requête par
 * chargement de page, partagée entre les composants), précédée des
 * participants inscrits depuis cet appareil.
 */
let shared = null
const load = () => (shared ??= fetchPublicAttendees().catch(() => null))

export default function useAttendees() {
  const [people, setPeople] = useState(localAttendees)

  useEffect(() => {
    let alive = true
    load().then((server) => alive && setPeople(mergeAttendees(server)))
    return () => {
      alive = false
    }
  }, [])

  return people
}
