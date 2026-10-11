import { Button, CallButton, Icon, Marquee, MoreLink, PartnerLogo, Reveal, SectionHeader } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { CONFIG } from '@/data/config'
import { PARTNER_LOGO_DIR, PARTNER_LOGOS } from '@/data/partners'
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

        {/* Organisateur et label international : logos mis en avant */}
        <h3 className="partners__featured-label">{pa.featuredLabel}</h3>
        <ul className="partners__featured">
          {pa.featured.map((f, i) => (
            <Reveal as="li" key={f.id} delay={i * 100} className="featured-partner">
              <span className="featured-partner__logo">
                <img
                  src={`${PARTNER_LOGO_DIR}${PARTNER_LOGOS[f.id]}`}
                  alt={f.name}
                  width="240"
                  height="120"
                  loading="lazy"
                  decoding="async"
                />
              </span>
              <span className="featured-partner__text">
                <span className="featured-partner__role">{f.role}</span>
                <strong>{f.name}</strong>
                <small>{f.detail}</small>
              </span>
            </Reveal>
          ))}
        </ul>

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
              {/* Dossier de partenariat : téléchargement bloqué
                  (CONFIG.features.documentDownloads) */}
              {CONFIG.features.documentDownloads ? (
                <Button href={CONFIG.links.partnershipPdf} external iconLeft="download">
                  {b.download}
                </Button>
              ) : (
                <Button iconLeft="download" disabled title={t.soonDoc}>
                  {b.download} <span className="btn__soon">{t.soonShort}</span>
                </Button>
              )}
              <Button
                href={`mailto:${CONFIG.contact.emails[0]}?subject=${encodeURIComponent(b.subject)}`}
                variant="ghost"
                icon="arrow-right"
              >
                {b.contact}
              </Button>
              <CallButton variant="ghost" />
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
