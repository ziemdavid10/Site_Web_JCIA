import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadAttendeePhoto, localPhoto } from '@/services/photos'

/**
 * Photos des participants d'une commande, par position (1 = premier nom) :
 * copie de l'appareil affichée tout de suite, puis version du serveur si elle
 * diffère (autre appareil). `update` reflète aussitôt un ajout ou un retrait.
 *
 * @returns {{ photos: Record<number, string|null>, ready: boolean, update: (position: number, src: string|null) => void }}
 */
export default function useAttendeePhotos(order) {
  const versions = order ? order.photos.map((p) => `${p.position}:${p.version}`).join(',') : ''
  const key = order ? `${order.id}|${order.attendees.length}|${versions}` : ''

  // Copies locales (lecture synchrone, une fois par commande)
  const local = useMemo(
    () => (order ? Object.fromEntries(order.attendees.map((_, i) => [i + 1, localPhoto(order.id, i + 1)?.src ?? null])) : {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recalcul seulement si la commande ou ses photos changent
    [key],
  )

  const [loaded, setLoaded] = useState({ key: null, photos: {} })
  const [edits, setEdits] = useState({ id: null, photos: {} })

  useEffect(() => {
    if (!order) return undefined
    let alive = true
    Promise.all(
      order.attendees.map((_, i) => loadAttendeePhoto(order, i + 1, order.photos.find((p) => p.position === i + 1)?.version)),
    ).then((list) => {
      if (alive) setLoaded({ key, photos: Object.fromEntries(list.map((src, i) => [i + 1, src])) })
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- même règle que ci-dessus
  }, [key])

  const update = useCallback(
    (position, src) => setEdits((e) => ({ id: order?.id, photos: { ...(e.id === order?.id ? e.photos : {}), [position]: src } })),
    [order?.id],
  )

  const photos = {
    ...local,
    ...(loaded.key === key ? loaded.photos : {}),
    ...(edits.id === order?.id ? edits.photos : {}),
  }
  return { photos, ready: loaded.key === key, update }
}
