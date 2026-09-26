import { Button, CallButton, Icon, Reveal } from '@/components/ui'
import { CheckList, CtaBand, IconCards, PageHero, PageSection, Steps } from '@/components/page'
import Catalogue from '@/components/sections/Catalogue/Catalogue'
import { useI18n } from '@/i18n/context'
import { rich } from '@/i18n/rich'
import { CONFIG } from '@/data/config'
import useDocumentMeta from '@/hooks/useDocumentMeta'
import spiral from '@/assets/images/motifs/spiral.webp'
import './CataloguePage.scss'

/**
 * <CataloguePage /> — Catalogue National des Acteurs de l'IA du Cameroun :
 * formats, aperçu du moteur de recherche (section de l'accueil), acteurs
 * recensés, méthodologie, protection des données et référencement.
 */
export default function CataloguePage() {
  const { t } = useI18n()
  const c = t.pages.catalogue
  const referHref = `mailto:${CONFIG.contact.emails[0]}?subject=${encodeURIComponent(t.catalogue.ctaSubject)}`
  useDocumentMeta(`${c.title} | ${t.event.shortName}`)

  return (
    <div className="detail-page catalogue-page">
      <PageHero
        current={c.title}
        eyebrow={c.hero.eyebrow}
        title={c.hero.title}
        lead={c.hero.lead}
        art={<img src={spiral} alt="" width="260" height="260" />}
      >
        <Button href={referHref} size="lg" iconLeft="mail">
          {t.catalogue.cta}
        </Button>
        <CallButton size="lg" variant="ghost" />
        <p className="catalogue-page__target">{rich(t.catalogue.target)}</p>
      </PageHero>

      <PageSection tone="white" title={c.formats.title}>
        <IconCards items={c.formats.items} columns={2} />
      </PageSection>

      {/* Aperçu du moteur de recherche + impacts (section de l'accueil) */}
      <Catalogue />

      <PageSection tone="sand" title={c.actorsTitle}>
        <ul className="actor-chips">
          {t.catalogue.actors.map((a, i) => (
            <Reveal as="li" key={a} delay={(i % 5) * 50}>
              <Icon name="user" size={18} />
              {a}
            </Reveal>
          ))}
        </ul>
      </PageSection>

      <PageSection tone="stage" title={c.method.title} lead={c.method.lead}>
        <Steps items={c.method.steps} />
        <h3 className="page-section__subtitle catalogue-page__gap">{rich(c.privacy.title)}</h3>
        <CheckList items={c.privacy.items} columns={2} />
      </PageSection>

      <PageSection tone="white" title={c.howTo.title}>
        <Steps items={c.howTo.steps} />
        <div className="catalogue-page__cta">
          <Button href={referHref} size="lg" variant="secondary" iconLeft="mail">
            {t.catalogue.cta}
          </Button>
        </div>
      </PageSection>

      <CtaBand />
    </div>
  )
}
