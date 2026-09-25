import { useId, useMemo, useState } from 'react'
import { Accordion, Button, Icon, Reveal, ThemeImg } from '@/components/ui'
import { CtaBand, PageHero } from '@/components/page'
import { useI18n } from '@/i18n/context'
import { CONFIG } from '@/data/config'
import useDocumentMeta from '@/hooks/useDocumentMeta'
import mascot from '@/assets/images/brand/mascot.webp'
import mascotWhite from '@/assets/images/brand/mascot-white.webp'
import './FaqPage.scss'

/** Minuscules sans accents : « Événement » et « evenement » se retrouvent. */
const normalize = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/**
 * <FaqPage /> — toutes les questions fréquentes, avec recherche plein texte
 * (insensible aux accents) et filtre par catégorie.
 */
export default function FaqPage() {
  const { t } = useI18n()
  const f = t.pages.faq
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('all')
  const searchId = useId()
  const { contact } = CONFIG
  useDocumentMeta(`${f.title} | ${t.event.shortName}`)

  const results = useMemo(() => {
    const q = normalize(query.trim())
    return f.items.filter(
      (item) => (cat === 'all' || item.cat === cat) && (!q || normalize(`${item.q} ${item.a}`).includes(q)),
    )
  }, [f.items, query, cat])

  // Nombre de questions par catégorie (affiché dans les filtres)
  const count = (id) => (id === 'all' ? f.items.length : f.items.filter((i) => i.cat === id).length)
  const filters = [{ id: 'all', label: f.all }, ...f.categories]

  return (
    <div className="detail-page faq-page">
      <PageHero
        current={f.title}
        eyebrow={f.hero.eyebrow}
        title={f.hero.title}
        lead={f.hero.lead}
        art={<ThemeImg light={mascot} dark={mascotWhite} alt="" width="220" height="290" />}
      />

      <section className="page-section page-section--white">
        <div className="container faq-page__grid">
          {/* Recherche + filtres */}
          <div className="faq-page__tools">
            <label htmlFor={searchId} className="faq-page__search">
              <span className="visually-hidden">{f.searchLabel}</span>
              <Icon name="search" size={20} />
              <input
                id={searchId}
                type="search"
                value={query}
                placeholder={f.searchPlaceholder}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
              />
            </label>

            <div className="faq-page__filters" role="group" aria-label={f.searchLabel}>
              {filters.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={cat === c.id ? 'is-active' : ''}
                  aria-pressed={cat === c.id}
                  onClick={() => setCat(c.id)}
                >
                  {c.label}
                  <span>{count(c.id)}</span>
                </button>
              ))}
            </div>

            <Reveal className="faq-page__still">
              <h2>{f.stillTitle}</h2>
              <p>{f.stillText}</p>
              <Button href={`mailto:${contact.emails[0]}`} size="sm" variant="secondary" iconLeft="mail">
                {contact.emails[0]}
              </Button>
              <a className="faq-page__phone" href={`tel:${contact.phones[0].replace(/\s/g, '')}`}>
                <Icon name="phone" size={16} /> {contact.phones[0]}
              </a>
            </Reveal>
          </div>

          {/* Résultats */}
          <div aria-live="polite">
            {results.length ? (
              <Accordion key={`${cat}-${query}`} items={results} defaultOpen={query ? 0 : -1} headingLevel={2} />
            ) : (
              <p className="faq-page__empty">
                <Icon name="search" size={28} />
                {f.noResults}
              </p>
            )}
          </div>
        </div>
      </section>

      <CtaBand />
    </div>
  )
}
