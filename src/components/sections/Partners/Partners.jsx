import { Button, Icon, Marquee, MoreLink, PartnerLogo, Reveal, SectionHeader } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { CONFIG } from '@/data/config'
import logoMascot from '@/assets/images/brand/logo-mascot-white.webp'
import './Partners.scss'

/**
 * <Partners /> — égide institutionnelle, partenaires des éditions précédentes,
 * médias, et appel à devenir partenaire / sponsor.
 * Chaque partenaire / média est affiché avec son logo (src/data/partners.js,
 * fichiers dans public/images/partners/) et son nom.
 */
export default function Partners() {
  const { t } = useI18n()
  const pa = t.partners
  const b = pa.become

  return (
    <section className="section section--white partners" id="partenaires" aria-labelledby="partners-title">
      <div className="container">
        <SectionHeader id="partners-title" align="center" eyebrow={pa.eyebrow} title={pa.title} lead={pa.lead} />

        {/* Égide / patronage */}
        <ul className="partners__institutional">
          {pa.institutional.map((p, i) => (
            <Reveal as="li" key={p.name} delay={i * 80}>
              <span className="partners__role">{p.role}</span>
              <strong>{p.name}</strong>
            </Reveal>
          ))}
        </ul>
      </div>

      {/* Bandeaux défilants */}
      <div className="partners__marquees">
        <p className="partners__marquee-label container">{pa.pastLabel}</p>
        <Marquee
          items={pa.past}
          duration={48}
          className="partners__marquee partners__marquee--partners"
          renderItem={(p, i) => <PartnerLogo id={p.id} name={p.name} index={i} />}
        />
        <p className="partners__marquee-label container">{pa.mediaLabel}</p>
        <Marquee
          items={pa.media}
          duration={70}
          reverse
          className="partners__marquee partners__marquee--media"
          renderItem={(m, i) => <PartnerLogo id={m.id} name={m.name} kind="media" index={i + 1} />}
        />
      </div>

      {/* Devenir partenaire */}
      <div className="container">
        <Reveal className="become-partner">
          <div className="become-partner__intro">
            <img src={logoMascot} alt="" width="220" height="88" loading="lazy" aria-hidden="true" />
            <h3>{b.title}</h3>
            <p>{b.text}</p>
            <div className="become-partner__ctas">
              <Button href={CONFIG.links.partnershipPdf} external iconLeft="download">
                {b.download}
              </Button>
              <Button
                href={`mailto:${CONFIG.contact.emails[0]}?subject=${encodeURIComponent(b.subject)}`}
                variant="ghost"
                icon="arrow-right"
              >
                {b.contact}
              </Button>
            </div>
          </div>
          <ul className="become-partner__benefits">
            {b.benefits.map((item) => (
              <li key={item.title}>
                <Icon name={item.icon} size={22} />
                <div>
                  <h4>{item.title}</h4>
                  <p>{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>
        <MoreLink route="partners" align="center" />
      </div>
    </section>
  )
}
