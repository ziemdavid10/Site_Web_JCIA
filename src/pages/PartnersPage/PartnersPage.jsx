import { Button, PartnerLogo, Reveal, ThemeImg } from '@/components/ui'
import { CheckList, CtaBand, IconCards, PageHero, PageSection, Steps } from '@/components/page'
import Partners from '@/components/sections/Partners/Partners'
import { useI18n } from '@/i18n/context'
import { CONFIG } from '@/data/config'
import useDocumentMeta from '@/hooks/useDocumentMeta'
import logoMascot from '@/assets/images/brand/logo-mascot.webp'
import logoMascotWhite from '@/assets/images/brand/logo-mascot-white.webp'
import './PartnersPage.scss'

/**
 * <PartnersPage /> — partenaires & sponsors : audience, partenaires
 * institutionnels et médias (section de l'accueil), plan de communication,
 * dispositif digital et démarche pour devenir partenaire.
 */
export default function PartnersPage() {
  const { t } = useI18n()
  const p = t.pages.partners
  const b = t.partners.become
  const { links, contact } = CONFIG
  const contactHref = `mailto:${contact.emails[0]}?subject=${encodeURIComponent(b.subject)}`
  useDocumentMeta(`${p.title} | ${t.event.shortName}`)

  const actions = (variant) => (
    <>
      <Button href={links.partnershipPdf} external size="lg" iconLeft="download">
        {b.download}
      </Button>
      <Button href={contactHref} size="lg" variant={variant} icon="arrow-right">
        {b.contact}
      </Button>
    </>
  )

  return (
    <div className="detail-page partners-page">
      <PageHero
        current={p.title}
        eyebrow={p.hero.eyebrow}
        title={p.hero.title}
        lead={p.hero.lead}
        stats={p.reach}
        art={<ThemeImg light={logoMascot} dark={logoMascotWhite} alt="" width="360" height="144" />}
      >
        {actions('ghost')}
      </PageHero>

      <Partners />

      {/* Mur de logos (statique, lisible sans animation) */}
      <PageSection tone="white" title={t.partners.pastLabel}>
        <ul className="logo-wall">
          {t.partners.past.map((p, i) => (
            <Reveal as="li" key={p.id} delay={(i % 4) * 60}>
              <PartnerLogo id={p.id} name={p.name} index={i} />
            </Reveal>
          ))}
        </ul>
        <h3 className="page-section__subtitle partners-page__gap">{t.partners.mediaLabel}</h3>
        <ul className="logo-wall">
          {t.partners.media.map((m, i) => (
            <Reveal as="li" key={m.id} delay={(i % 4) * 60}>
              <PartnerLogo id={m.id} name={m.name} kind="media" index={i + 1} />
            </Reveal>
          ))}
        </ul>
      </PageSection>

      {/* Plan de communication */}
      <PageSection tone="sand" title={p.comms.title}>
        <CheckList items={p.comms.objectives} columns={2} />
        <ol className="comms-phases">
          {p.comms.phases.map((ph, i) => (
            <Reveal as="li" key={ph.title} delay={i * 100} className={`comms-phase comms-phase--${i}`}>
              <h3>
                <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                {ph.title}
              </h3>
              <ul>
                {ph.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </Reveal>
          ))}
        </ol>
      </PageSection>

      <PageSection tone="white" title={p.digital.title}>
        <IconCards items={p.digital.items} columns={3} />
      </PageSection>

      <PageSection tone="stage" title={p.process.title}>
        <Steps items={p.process.steps} />
        <div className="partners-page__cta">{actions('ghost')}</div>
      </PageSection>

      <CtaBand />
    </div>
  )
}
