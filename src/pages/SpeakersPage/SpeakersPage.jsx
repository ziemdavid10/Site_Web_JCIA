import { Link } from 'react-router'
import { Button, Reveal, ThemeImg } from '@/components/ui'
import { CheckList, CtaBand, PageHero, PageSection, Steps } from '@/components/page'
import SpeakersExplorer from '@/components/speakers/SpeakersExplorer'
import { useI18n } from '@/i18n/context'
import { CONFIG } from '@/data/config'
import useDocumentMeta from '@/hooks/useDocumentMeta'
import mascot from '@/assets/images/brand/mascot.webp'
import mascotWhite from '@/assets/images/brand/mascot-white.webp'
import './SpeakersPage.scss'

/**
 * <SpeakersPage /> — intervenants : profils attendus (ou liste officielle dès
 * qu'elle est publiée dans t.speakers.list) et appel à intervenants détaillé.
 */
export default function SpeakersPage() {
  const { t } = useI18n()
  const sp = t.pages.speakers
  const { routes, contact } = CONFIG
  const proposeHref = `mailto:${contact.emails[0]}?subject=${encodeURIComponent(t.speakers.ctaSubject)}`
  useDocumentMeta(`${sp.title} | ${t.event.shortName}`)

  return (
    <div className="detail-page speakers-page">
      <PageHero
        current={sp.title}
        eyebrow={sp.hero.eyebrow}
        title={sp.hero.title}
        lead={sp.hero.lead}
        art={<ThemeImg light={mascot} dark={mascotWhite} alt="" width="240" height="316" />}
      >
        <Button href="#appel" size="lg" icon="arrow-right">
          {sp.call.button}
        </Button>
        <Button as={Link} to={routes.tickets} size="lg" variant="ghost" iconLeft="ticket">
          {t.header.mobileCta}
        </Button>
      </PageHero>

      {/* Catégories cliquables + cartes des intervenants */}
      <PageSection id="liste" tone="white" eyebrow={t.speakers.eyebrow} title={sp.profilesTitle}>
        <SpeakersExplorer mode="page" />
      </PageSection>

      {/* Appel à intervenants */}
      <PageSection id="appel" tone="stage" eyebrow={sp.call.eyebrow} title={sp.call.title} lead={sp.call.text}>
        <div className="speakers-call">
          <Reveal className="speakers-call__topics">
            <h3 className="page-section__subtitle">{sp.call.topicsTitle}</h3>
            <CheckList items={sp.call.topics} columns={2} />
          </Reveal>
          <div>
            <h3 className="page-section__subtitle">{sp.call.stepsTitle}</h3>
            <Steps items={sp.call.steps} />
          </div>
        </div>
        <Reveal className="speakers-call__cta">
          <Button href={proposeHref} size="lg" iconLeft="mail">
            {sp.call.button}
          </Button>
        </Reveal>
      </PageSection>

      <CtaBand />
    </div>
  )
}
