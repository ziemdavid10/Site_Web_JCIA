import { Button, CallButton, Icon, MoreLink, PhotoStack, Reveal, SectionHeader } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { CONFIG } from '@/data/config'
import djembe from '@/assets/images/motifs/djembe.webp'
import pot from '@/assets/images/motifs/pot.webp'
import './Salon.scss'

/**
 * <Salon /> — le Salon National 100 % IA : exposants et activités.
 * Décor : croquis d'objets traditionnels (djembé, jarre) — l'artisanat
 * dialogue avec la technologie.
 */
export default function Salon() {
  const { t } = useI18n()
  const sa = t.salon
  const bookingHref = `mailto:${CONFIG.contact.emails[0]}?subject=${encodeURIComponent(sa.ctaSubject)}`

  return (
    <section className="section section--sand salon" id="salon" aria-labelledby="salon-title">
      <img className="salon__doodle salon__doodle--djembe" src={djembe} alt="" loading="lazy" aria-hidden="true" />
      <img className="salon__doodle salon__doodle--pot" src={pot} alt="" loading="lazy" aria-hidden="true" />

      <div className="container salon__grid">
        <div>
          <SectionHeader id="salon-title" eyebrow={sa.eyebrow} title={sa.title} lead={sa.lead} />

          <ol className="salon__activities">
            {sa.activities.map((a, i) => (
              <Reveal as="li" key={a.title} delay={i * 80}>
                <span className="salon__activity-num">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{a.title}</h3>
                  <p>{a.text}</p>
                </div>
              </Reveal>
            ))}
          </ol>
          <MoreLink route="salon" />
          <Reveal className="salon__photos" delay={120}>
            <PhotoStack ids={['salon-2025', 'posters-2025', 'village-2025', 'ambiance-2025']} tilt="right" interval={5600} />
          </Reveal>
        </div>

        {/* Carte des exposants */}
        <Reveal className="exhibitors">
          <div className="exhibitors__head">
            <p className="exhibitors__big">
              150<span>+</span>
            </p>
            <p>{sa.exhibitorsCount}</p>
          </div>
          <ul className="exhibitors__list">
            {sa.exhibitors.map((e) => (
              <li key={e.label}>
                <Icon name={e.icon} size={22} />
                <span>{e.label}</span>
              </li>
            ))}
          </ul>
          <Button href={bookingHref} variant="light" icon="arrow-right" className="exhibitors__cta">
            {sa.cta}
          </Button>
          <CallButton variant="light" className="exhibitors__call" />
        </Reveal>
      </div>
    </section>
  )
}
