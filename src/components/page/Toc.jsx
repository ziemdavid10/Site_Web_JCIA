import { useEffect, useRef } from 'react'
import { useI18n } from '@/i18n/context'
import useScrollSpy from '@/hooks/useScrollSpy'

/**
 * <Toc /> — sommaire « Sur cette page », collant sous l'en-tête.
 * Barre de puces défilante horizontalement : identique sur mobile, tablette et
 * desktop (pas de colonne latérale qui écraserait le contenu).
 * La puce de la section lue est mise en évidence et ramenée dans la zone visible.
 *
 * @param {{id: string, label: string}[]} items
 */
export default function Toc({ items }) {
  const { t } = useI18n()
  const active = useScrollSpy(items.map((i) => i.id))
  const listRef = useRef(null)

  // Garde la puce active visible dans la barre (défilement horizontal uniquement)
  useEffect(() => {
    const list = listRef.current
    const el = list?.querySelector('.is-active')
    if (!list || !el) return
    const left = el.offsetLeft - list.clientWidth / 2 + el.clientWidth / 2
    list.scrollTo({ left, behavior: 'smooth' })
  }, [active])

  return (
    <nav className="toc" aria-label={t.pages.onThisPage}>
      <div className="container toc__inner">
        <span className="toc__label">{t.pages.onThisPage}</span>
        <ol ref={listRef}>
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={active === item.id ? 'is-active' : ''}
                aria-current={active === item.id ? 'true' : undefined}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  )
}
