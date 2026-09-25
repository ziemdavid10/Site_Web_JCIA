import { Button, Reveal, SectionHeader } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { CONFIG } from '@/data/config'
import sun from '@/assets/images/motifs/sun.webp'
import './Organizer.scss'

/**
 * <Organizer /> — présentation de l'organisateur : IAC – CAIPI.
 */
export default function Organizer() {
  const { t } = useI18n()
  const o = t.organizer

  return (
    <section className="section section--sand organizer" id="organisateur" aria-labelledby="organizer-title">
      <div className="container organizer__grid">
        <div>
          <SectionHeader id="organizer-title" eyebrow={o.eyebrow} title={o.title} lead={o.lead} />

          {/* Vision */}
          <Reveal as="figure" className="organizer__vision">
            <img src={sun} alt="" width="120" height="104" loading="lazy" aria-hidden="true" />
            <figcaption>{o.visionLabel}</figcaption>
            <blockquote>{o.vision}</blockquote>
          </Reveal>

          <Reveal className="organizer__partners">
            <h3>{o.partnershipsTitle}</h3>
            <ul>
              {o.partnerships.map((p) => (
                <li key={p.name}>
                  <strong>{p.name}</strong>
                  <span>{p.detail}</span>
                </li>
              ))}
            </ul>
            <Button href={CONFIG.links.iac} external variant="outline" icon="arrow-up-right" size="sm">
              {o.cta}
            </Button>
          </Reveal>
        </div>

        {/* Missions */}
        <Reveal className="organizer__missions" delay={120}>
          <h3>{o.missionsTitle}</h3>
          <ol>
            {o.missions.map((m, i) => (
              <li key={m}>
                <span>{String(i + 1).padStart(2, '0')}</span>
                <p>{m}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  )
}
