import { Reveal } from '@/components/ui'
import { CheckList, CtaBand, DataTable, IconCards, PageHero, PageSection, Toc } from '@/components/page'
import About from '@/components/sections/About/About'
import Theme from '@/components/sections/Theme/Theme'
import GenevaBridge from '@/components/sections/GenevaBridge/GenevaBridge'
import Organizer from '@/components/sections/Organizer/Organizer'
import { useI18n } from '@/i18n/context'
import { rich } from '@/i18n/rich'
import useDocumentMeta from '@/hooks/useDocumentMeta'
import mapColors from '@/assets/images/brand/map-colors.webp'
import './AboutPage.scss'

/**
 * <AboutPage /> — page « À propos » : version détaillée de la section de l'accueil.
 *
 *   Contexte (du monde au Cameroun) → les quatre défis (section de l'accueil)
 *   → thématique 2027 → positionnement → objectifs & résultats attendus
 *   → de Yaoundé à Genève → l'organisateur (IAC – CAIPI).
 */
export default function AboutPage() {
  const { t, locale } = useI18n()
  const a = t.pages.about
  useDocumentMeta(`${a.title} | ${t.event.shortName}`)

  return (
    <div className="detail-page about-page">
      <PageHero
        current={a.title}
        eyebrow={a.hero.eyebrow}
        title={a.hero.title}
        lead={a.hero.lead}
        art={<img src={mapColors} alt="" width="380" height="380" />}
        stats={t.figures.items.slice(0, 4).map((f) => ({ value: `${f.value.toLocaleString(locale)}${f.suffix}`, label: f.label }))}
      />
      <Toc items={a.toc} />

      {/* --- Contexte : zoom du monde vers les JCIA ------------------------------ */}
      <PageSection id="contexte" tone="white" eyebrow={a.story.eyebrow} title={a.story.title}>
        <ol className="story">
          {a.story.blocks.map((b, i) => (
            <Reveal as="li" key={b.kicker} delay={(i % 2) * 90} className="story__item">
              <span className="story__num" aria-hidden="true">
                0{i + 1}
              </span>
              <p className="story__kicker">{b.kicker}</p>
              <h3>{b.title}</h3>
              <p>{rich(b.text)}</p>
            </Reveal>
          ))}
        </ol>

        <Reveal className="about-problem">
          <p className="about-problem__eyebrow">{a.problem.eyebrow}</p>
          <blockquote>
            <p>{a.problem.text}</p>
          </blockquote>
        </Reveal>
      </PageSection>

      {/* --- Les quatre défis (section de l'accueil, réutilisée) ------------------ */}
      <div id="defis" className="page-anchor">
        <About />
      </div>

      <div id="thematique" className="page-anchor">
        <Theme />
      </div>

      {/* --- Positionnement ----------------------------------------------------------- */}
      <PageSection id="positionnement" tone="sand" eyebrow={a.roles.eyebrow} title={a.roles.title} lead={a.roles.lead}>
        <IconCards items={a.roles.items} columns={3} />
      </PageSection>

      {/* --- Objectifs & résultats -------------------------------------------------------- */}
      <PageSection id="objectifs" tone="white" eyebrow={a.objectives.eyebrow} title={a.objectives.title}>
        <div className="page-section__split">
          <div>
            <Reveal as="p" className="about-general">
              {a.objectives.general}
            </Reveal>
            <CheckList items={a.objectives.items} />
          </div>
          <div>
            <h3 className="page-section__subtitle">{a.objectives.resultsTitle}</h3>
            <DataTable head={a.objectives.head} rows={a.objectives.rows} />
          </div>
        </div>
      </PageSection>

      <div id="geneve" className="page-anchor">
        <GenevaBridge />
      </div>

      {/* --- L'organisateur (section de l'accueil) ------------------------------------ */}
      <div id="iac" className="page-anchor">
        <Organizer />
      </div>

      <CtaBand />
    </div>
  )
}
