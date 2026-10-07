import { Button, Countdown, Icon, Reveal } from '@/components/ui'
import { Callout, CheckList, CtaBand, IconCards, PageHero, PageSection, Toc } from '@/components/page'
import AwardCategories from '@/components/sections/Awards/AwardCategories'
import SelectionProcess from '@/components/sections/Awards/SelectionProcess'
import Eligibility from '@/components/sections/Awards/Eligibility'
import AwardsTimeline from '@/components/sections/Awards/AwardsTimeline'
import { useI18n } from '@/i18n/context'
import { rich } from '@/i18n/rich'
import { CONFIG } from '@/data/config'
import useDocumentMeta from '@/hooks/useDocumentMeta'
import toghu from '@/assets/images/motifs/pattern-toghu.webp'
import maskGreen from '@/assets/images/motifs/mask-green.webp'
import '@/components/sections/Awards/Awards.scss'
import './AwardsPage.scss'

/**
 * <AwardsPage /> — Cameroon AI Awards 2027 : l'appel à candidatures complet
 * (d'après les Termes de Référence).
 *
 * Réutilise les sous-composants de la section de l'accueil (catégories,
 * éligibilité, sélection, calendrier) et ajoute objectifs, exclusions, dossier,
 * gouvernance et dispositions.
 */
export default function AwardsPage() {
  const { t } = useI18n()
  const a = t.pages.awards
  const aw = t.awards
  const { links } = CONFIG
  useDocumentMeta(`${a.title} | ${t.event.shortName}`)

  return (
    <div className="detail-page awards-page">
      <PageHero
        current={a.title}
        eyebrow={a.hero.eyebrow}
        title={a.hero.title}
        lead={a.hero.lead}
        stats={a.legacy.stats}
        art={<img src={maskGreen} alt="" width="300" height="300" />}
      >
        <Button href={links.awards} external size="lg" icon="arrow-up-right">
          {aw.ctaApply}
        </Button>
        {/* TDR : téléchargement bloqué (CONFIG.features.documentDownloads) */}
        {/* {features.documentDownloads ? (
          <Button href={links.tdrPdf} external size="lg" variant="ghost" iconLeft="download">
            {aw.ctaTdr}
          </Button>
        ) : (
          <Button size="lg" variant="ghost" iconLeft="download" disabled title={t.soonDoc}>
            {aw.ctaTdr} <span className="btn__soon">{t.soonShort}</span>
          </Button>
        )} */}
      </PageHero>
      <Toc items={a.toc} />

      {/* --- Présentation & objectifs -------------------------------------------- */}
      <PageSection id="presentation" tone="white" title={a.legacy.title}>
        <div className="page-section__split">
          <div>
            <Reveal as="p" className="page-section__text">
              {rich(a.legacy.text)}
            </Reveal>
            <h3 className="page-section__subtitle awards-page__gap">{a.objectives.title}</h3>
            <Callout icon="trophy" tone="orange">
              <p>{a.objectives.general}</p>
            </Callout>
            <div className="awards-page__gap-sm">
              <CheckList items={a.objectives.items} />
            </div>
          </div>

          {/* Carte « date limite » (même composant visuel que l'accueil) */}
          <Reveal className="deadline-card awards-page__deadline" delay={120}>
            <div className="deadline-card__icon">
              <Icon name="trophy" size={34} />
            </div>
            <p className="deadline-card__title">{aw.card.title}</p>
            <p className="deadline-card__dates">{rich(aw.card.dates)}</p>
            <Countdown target={CONFIG.awardsStart} label={aw.card.countdown} size="sm" />
            <ul className="deadline-card__facts">
              {aw.card.facts.map((f) => (
                <li key={f.label}>
                  <strong>{f.value}</strong> {f.label}
                </li>
              ))}
            </ul>
            <p className="deadline-card__gala">
              <Icon name="star" size={16} /> {aw.card.gala}
            </p>
          </Reveal>
        </div>
      </PageSection>

      {/* --- Catégories : ambiance « gala » ------------------------------------------ */}
      <section id="categories" className="page-section page-section--stage awards-page__gala">
        <div className="awards__texture" style={{ backgroundImage: `url(${toghu})` }} aria-hidden="true" />
        <div className="container awards__inner">
          <AwardCategories />
        </div>
      </section>

      {/* --- Éligibilité & exclusions ---------------------------------------------------- */}
      <PageSection id="eligibilite" tone="sand">
        <Eligibility />
        <h3 className="page-section__subtitle awards-page__gap">{a.exclusions.title}</h3>
        <CheckList items={a.exclusions.items} icon="close" columns={2} />
      </PageSection>

      {/* --- Dossier ----------------------------------------------------------------------- */}
      <PageSection id="dossier" tone="white" title={a.dossier.title}>
        <h3 className="page-section__subtitle">{a.dossier.contentTitle}</h3>
        <ol className="dossier-grid">
          {a.dossier.content.map((c, i) => (
            <Reveal as="li" key={c.title} delay={(i % 4) * 60}>
              <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h4>{c.title}</h4>
                <p>{c.text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
        <div className="page-section__split awards-page__gap">
          <div>
            <h3 className="page-section__subtitle">{a.dossier.formTitle}</h3>
            <CheckList items={a.dossier.form} />
          </div>
          <Callout icon="play" tone="teal">
            <p>{a.dossier.videoNote}</p>
          </Callout>
        </div>
      </PageSection>

      {/* --- Sélection ------------------------------------------------------------------------ */}
      <PageSection id="selection" tone="stage">
        <SelectionProcess />
      </PageSection>

      {/* --- Gouvernance & jury ----------------------------------------------------------------- */}
      <PageSection id="gouvernance" tone="sand" title={a.governance.title}>
        <div className="page-section__split">
          <div>
            <Reveal as="p" className="page-section__text">
              {rich(a.governance.egide)}
            </Reveal>
            <Reveal as="p" className="page-section__text">
              {a.governance.organisation}
            </Reveal>
          </div>
          <Reveal className="jury-card">
            <h3>{a.governance.juryTitle}</h3>
            <ul>
              {a.governance.jury.map((j) => (
                <li key={j.label}>
                  <strong>{j.count}</strong>
                  <span>{j.label}</span>
                </li>
              ))}
            </ul>
            <p>{a.governance.juryNote}</p>
          </Reveal>
        </div>
      </PageSection>

      {/* --- Calendrier ------------------------------------------------------------------------------ */}
      <PageSection id="calendrier" tone="stage">
        <AwardsTimeline />
      </PageSection>

      {/* --- Dispositions ------------------------------------------------------------------------------ */}
      <PageSection id="dispositions" tone="white" title={a.provisions.title}>
        <IconCards items={a.provisions.items.map((p, i) => ({ ...p, icon: ['lock', 'shield', 'handshake'][i] }))} columns={3} />
        {/* <div className="awards-page__gap">
          <Callout icon="mail" tone="teal">
            <p>{a.contact}</p>
          </Callout>
        </div> */}
      </PageSection>

      <CtaBand />
    </div>
  )
}
