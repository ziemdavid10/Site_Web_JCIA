import { useEffect, useId, useRef, useState } from 'react'
import { useI18n } from '@/i18n/context'
import { GALLERY_DIR } from '@/data/gallery'
import './PhotoStack.scss'

/**
 * <PhotoStack /> — petit paquet de 3 ou 4 photos empilées qui se relaient.
 *
 * Les photos sont légèrement pivotées, comme un jeu de tirages posé sur une
 * table ; toutes les 5 secondes, celle du dessus passe dessous. Un clic (ou la
 * touche Entrée) fait défiler immédiatement, et le survol met en pause.
 *
 * Accessibilité et confort :
 *  • le défilement s'arrête si le système demande « moins d'animations » ;
 *  • les vignettes (640 px) sont chargées paresseusement ;
 *  • chaque photo porte sa légende traduite comme texte alternatif.
 *
 * @param {string[]} ids     identifiants de photos (src/data/gallery.js)
 * @param {'left'|'right'} tilt  sens d'inclinaison du paquet
 * @param {number} interval  durée d'affichage d'une photo (ms)
 */
export default function PhotoStack({ ids = [], tilt = 'left', interval = 5000, className = '' }) {
  const { t } = useI18n()
  const [top, setTop] = useState(0)
  const paused = useRef(false)
  const uid = useId().replace(/:/g, '')
  const count = ids.length

  useEffect(() => {
    if (count < 2) return undefined
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (reduce?.matches) return undefined
    const timer = setInterval(() => {
      if (!paused.current && !document.hidden) setTop((i) => (i + 1) % count)
    }, interval)
    return () => clearInterval(timer)
  }, [count, interval])

  if (!count) return null
  const caption = (id) => t.gallery.photos[id] ?? t.event.shortName

  return (
    <div
      className={`photo-stack photo-stack--${tilt} ${className}`.trim()}
      onMouseEnter={() => {
        paused.current = true
      }}
      onMouseLeave={() => {
        paused.current = false
      }}
    >
      <button
        type="button"
        className="photo-stack__deck"
        aria-label={t.gallery.next}
        aria-describedby={`${uid}-cap`}
        onClick={() => setTop((i) => (i + 1) % count)}
        onFocus={() => {
          paused.current = true
        }}
        onBlur={() => {
          paused.current = false
        }}
      >
        {ids.map((id, i) => {
          // position dans la pile : 0 = dessus, puis 1, 2, 3 en dessous
          const pos = (i - top + count) % count
          return (
            <img
              key={id}
              src={`${GALLERY_DIR}${id}-sm.webp`}
              alt={pos === 0 ? caption(id) : ''}
              width="640"
              height="427"
              loading="lazy"
              decoding="async"
              className="photo-stack__photo"
              style={{ '--pos': pos, zIndex: count - pos }}
              aria-hidden={pos === 0 ? undefined : 'true'}
            />
          )
        })}
      </button>
      <p className="photo-stack__caption" id={`${uid}-cap`}>
        {caption(ids[top])}
      </p>
    </div>
  )
}
