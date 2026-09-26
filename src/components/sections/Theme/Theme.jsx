import { Icon, Reveal, SectionHeader } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import mapColors from '@/assets/images/brand/map-large.webp'
import './Theme.scss'

/**
 * <Theme /> — la thématique 2027, ses quatre ambitions et le contexte
 * national / international qui l'a fait naître.
 */
export default function Theme() {
  const { t } = useI18n()
  const th = t.theme

  return (
    <section className="section section--white theme" id="theme" aria-labelledby="theme-title">
      <div className="container">
        <div className="theme__top">
          <div>
            <SectionHeader id="theme-title" eyebrow={th.eyebrow} title={th.title} />
            {/* Citation du thème, encadrée par la carte « circuits » du logo */}
            <Reveal as="figure" className="theme__quote">
              <img src={mapColors} alt="" width="340" height="513" loading="lazy" aria-hidden="true" />
              <blockquote>
                <p>{th.quote}</p>
              </blockquote>
              <figcaption>{th.caption}</figcaption>
            </Reveal>
          </div>

          <ul className="theme__ambitions">
            {th.ambitions.map((a, i) => (
              <Reveal as="li" key={a.title} delay={i * 90} className="ambition">
                <span className="ambition__icon">
                  <Icon name={a.icon} size={26} />
                </span>
                <h3>{a.title}</h3>
                <p>{a.text}</p>
              </Reveal>
            ))}
          </ul>
        </div>

        {/* Contexte : jalons clés */}
        <Reveal className="theme__context">
          <h3 className="theme__context-title">{th.contextTitle}</h3>
          <ol className="milestones">
            {th.milestones.map((m, i) => (
              <li key={m.date} className={i === th.milestones.length - 1 ? 'is-current' : ''}>
                <span className="milestones__dot" aria-hidden="true" />
                <time>{m.date}</time>
                <p>{m.text}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  )
}
