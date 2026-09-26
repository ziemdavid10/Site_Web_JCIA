import { useEffect, useState } from 'react'
import { Button, CallButton, Icon, MoreLink, PatternBg, Reveal, SectionHeader } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { rich } from '@/i18n/rich'
import { CONFIG } from '@/data/config'
import './Catalogue.scss'

/**
 * <Catalogue /> — Catalogue National des Acteurs de l'IA du Cameroun,
 * innovation phare de l'édition 2027.
 * Le visuel illustre la future version en ligne (moteur de recherche par
 * compétence, secteur et région).
 */
export default function Catalogue() {
  const { t } = useI18n()
  const c = t.catalogue
  const queries = c.queries
  const [q, setQ] = useState(0)

  // Fait défiler les exemples de requêtes toutes les 2,6 s
  useEffect(() => {
    const id = setInterval(() => setQ((i) => (i + 1) % queries.length), 2600)
    return () => clearInterval(id)
  }, [queries.length])

  return (
    <section className="section section--white catalogue" id="catalogue" aria-labelledby="catalogue-title">
      <div className="container catalogue__grid">
        <div>
          <SectionHeader id="catalogue-title" eyebrow={c.eyebrow} title={c.title} lead={c.lead} />
          <Reveal className="catalogue__method">
            <p>
              <Icon name="shield" size={18} />
              {c.method}
            </p>
          </Reveal>
          <Reveal className="catalogue__ctas">
            <Button
              href={`mailto:${CONFIG.contact.emails[0]}?subject=${encodeURIComponent(c.ctaSubject)}`}
              variant="secondary"
              icon="arrow-right"
            >
              {c.cta}
            </Button>
            <CallButton variant="ghost" />
            <span className="catalogue__target">{rich(c.target)}</span>
          </Reveal>
        </div>

        {/* Maquette du moteur de recherche */}
        <Reveal className="catalogue-mock" delay={120} aria-hidden="true">
          <PatternBg variant="circuit" color="#2db8bd" opacity={0.12} />
          <div className="catalogue-mock__bar">
            <span className="catalogue-mock__dots">
              <i />
              <i />
              <i />
            </span>
            catalogue.jcia.cm
          </div>
          <div className="catalogue-mock__search">
            <Icon name="search" size={20} />
            <span key={q} className="catalogue-mock__query">
              {queries[q % queries.length]}
            </span>
          </div>
          <div className="catalogue-mock__filters">
            {c.filters.map((f) => (
              <span key={f}>{f}</span>
            ))}
          </div>
          <ul className="catalogue-mock__actors">
            {c.actors.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Reveal>
      </div>

      {/* Impacts par public */}
      <div className="container">
        <ul className="catalogue__impacts">
          {c.impacts.map((it, i) => (
            <Reveal as="li" key={it.for} delay={(i % 3) * 80}>
              <span>{it.for}</span>
              <p>{it.text}</p>
            </Reveal>
          ))}
        </ul>
        <MoreLink route="catalogue" />
      </div>
    </section>
  )
}
