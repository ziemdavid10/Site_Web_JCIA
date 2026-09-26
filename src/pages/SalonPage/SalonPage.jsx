import { Link } from 'react-router'
import { Accordion, Button, CallButton } from '@/components/ui'
import { Callout, CtaBand, IconCards, PageHero, PageSection, Steps } from '@/components/page'
import Salon from '@/components/sections/Salon/Salon'
import { useI18n } from '@/i18n/context'
import { rich } from '@/i18n/rich'
import { CONFIG } from '@/data/config'
import useDocumentMeta from '@/hooks/useDocumentMeta'
import pot from '@/assets/images/motifs/pot.webp'

/**
 * <SalonPage /> — Salon National 100 % IA : chiffres, exposants et activités
 * (section de l'accueil), raisons d'exposer, réservation de stand, questions.
 */
export default function SalonPage() {
  const { t } = useI18n()
  const s = t.pages.salon
  const { routes, contact } = CONFIG
  const bookingHref = `mailto:${contact.emails[0]}?subject=${encodeURIComponent(t.salon.ctaSubject)}`
  useDocumentMeta(`${s.title} | ${t.event.shortName}`)

  return (
    <div className="detail-page salon-page">
      <PageHero
        current={s.title}
        eyebrow={s.hero.eyebrow}
        title={s.hero.title}
        lead={s.hero.lead}
        stats={s.stats}
        art={<img src={pot} alt="" width="300" height="300" />}
      >
        <Button href={bookingHref} size="lg" iconLeft="mail">
          {t.salon.cta}
        </Button>
        <Button as={Link} to={routes.tickets} size="lg" variant="ghost" iconLeft="ticket">
          {t.header.mobileCta}
        </Button>
        <CallButton size="lg" variant="ghost" />
      </PageHero>

      {/* Activités et exposants */}
      <Salon />

      <PageSection tone="white" title={s.why.title}>
        <IconCards items={s.why.items} columns={3} />
      </PageSection>

      <PageSection tone="sand" title={s.steps.title}>
        <Steps items={s.steps.items} />
        <div className="page-section__block">
          <Callout icon="star" tone="orange">
            <p>{rich(s.free)}</p>
          </Callout>
        </div>
      </PageSection>

      <PageSection tone="white" width="narrow" title={t.pages.faq.title}>
        <Accordion items={s.faq} />
      </PageSection>

      <CtaBand />
    </div>
  )
}
