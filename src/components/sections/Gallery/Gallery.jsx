import { useState } from 'react'
import { Icon, Reveal, SectionHeader } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { fill } from '@/i18n/format'
import { GALLERY, GALLERY_DIR, GALLERY_YEARS } from '@/data/gallery'
import GalleryLightbox from './GalleryLightbox'
import './Gallery.scss'

/**
 * <Gallery /> — galerie photos des éditions précédentes, juste avant le pied de page.
 *
 *  • Filtre par édition (2025, 2023) — « Toutes » par défaut ;
 *  • grille en mosaïque : vignettes 640 px, chargées paresseusement, avec
 *    dimensions déclarées (aucun saut de mise en page) ;
 *  • un clic ouvre la visionneuse (<dialog> natif : Échap, piège du focus),
 *    flèches gauche / droite pour circuler.
 *
 * Les photos et leurs légendes viennent de src/data/gallery.js et des fichiers
 * de langue : aucune donnée n'est chargée depuis un service externe.
 */
export default function Gallery() {
  const { t } = useI18n()
  const g = t.gallery
  const [year, setYear] = useState('all')
  const [openIndex, setOpenIndex] = useState(null)

  const photos = GALLERY.filter((p) => year === 'all' || p.year === year)
  const caption = (p) => g.photos[p.id] ?? fill(g.fallback, { year: p.year })

  return (
    <section className="section gallery" id="galerie" aria-labelledby="gallery-title">
      <div className="container">
        <SectionHeader id="gallery-title" align="center" eyebrow={g.eyebrow} title={g.title} lead={g.lead} />

        {/* Filtres par édition */}
        <ul className="gallery__filters" aria-label={g.filterLabel}>
          {[{ id: 'all', label: g.all }, ...GALLERY_YEARS.map((y) => ({ id: y, label: fill(g.edition, { year: y }) }))].map(
            (f) => (
              <li key={f.id}>
                <button
                  type="button"
                  className={`gallery__filter ${year === f.id ? 'is-active' : ''}`}
                  aria-pressed={year === f.id}
                  onClick={() => {
                    setYear(f.id)
                    setOpenIndex(null)
                  }}
                >
                  {f.label}
                </button>
              </li>
            ),
          )}
        </ul>

        <ul className="gallery__grid" key={year /* relance l'animation d'entrée */}>
          {photos.map((p, i) => (
            <Reveal as="li" key={p.id} delay={(i % 4) * 70} className="gallery__item">
              <button type="button" onClick={() => setOpenIndex(i)} aria-label={`${caption(p)} — ${g.open}`}>
                <img
                  src={`${GALLERY_DIR}${p.id}-sm.webp`}
                  alt={caption(p)}
                  width={p.w}
                  height={p.h}
                  loading="lazy"
                  decoding="async"
                />
                <span className="gallery__zoom" aria-hidden="true">
                  <Icon name="search" size={20} />
                </span>
                <span className="gallery__caption">{caption(p)}</span>
              </button>
            </Reveal>
          ))}
        </ul>

        <p className="gallery__credit">{g.credit}</p>
      </div>

      <GalleryLightbox
        photos={photos}
        index={openIndex}
        caption={caption}
        onClose={() => setOpenIndex(null)}
        onNavigate={setOpenIndex}
      />
    </section>
  )
}
