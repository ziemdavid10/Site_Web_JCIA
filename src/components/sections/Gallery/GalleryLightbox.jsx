import { useEffect, useRef } from 'react'
import { Icon } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { fill } from '@/i18n/format'
import { GALLERY_DIR } from '@/data/gallery'

/**
 * <GalleryLightbox /> — visionneuse de la galerie, dans une fenêtre modale
 * native (<dialog>) : le navigateur fournit le fond assombri, le piège du
 * focus et la touche Échap. Les flèches ← → font défiler les photos et le
 * focus revient sur la vignette d'origine à la fermeture.
 */
export default function GalleryLightbox({ photos, index, caption, onClose, onNavigate }) {
  const { t } = useI18n()
  const g = t.gallery
  const ref = useRef(null)
  const isOpen = index !== null && index >= 0 && index < photos.length

  useEffect(() => {
    const dialog = ref.current
    if (!dialog || !isOpen) return undefined
    const opener = document.activeElement
    if (!dialog.open) dialog.showModal?.()
    return () => {
      if (dialog.open) dialog.close()
      opener?.focus?.()
    }
  }, [isOpen])

  if (!isOpen) return null
  const photo = photos[index]
  const go = (step) => onNavigate((index + step + photos.length) % photos.length)

  return (
    <dialog
      ref={ref}
      className="gallery-lightbox"
      aria-label={g.viewerLabel}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()} // clic sur le fond
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(1)
        if (e.key === 'ArrowLeft') go(-1)
      }}
    >
      <div className="gallery-lightbox__box">
        <button type="button" className="gallery-lightbox__close" onClick={onClose} aria-label={g.close}>
          <Icon name="close" size={22} />
        </button>

        <figure>
          <img
            src={`${GALLERY_DIR}${photo.id}.webp`}
            alt={caption(photo)}
            width={photo.w}
            height={photo.h}
            decoding="async"
          />
          <figcaption>
            <span>{caption(photo)}</span>
            <small>{fill(g.counter, { n: index + 1, total: photos.length })}</small>
          </figcaption>
        </figure>

        {photos.length > 1 && (
          <div className="gallery-lightbox__nav">
            <button type="button" onClick={() => go(-1)} aria-label={g.previous}>
              <Icon name="arrow-left" size={22} />
            </button>
            <button type="button" onClick={() => go(1)} aria-label={g.next}>
              <Icon name="arrow-right" size={22} />
            </button>
          </div>
        )}
      </div>
    </dialog>
  )
}
