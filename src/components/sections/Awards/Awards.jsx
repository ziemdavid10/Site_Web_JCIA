import { Button, Countdown, Icon, MoreLink, PhotoStack, Reveal, SectionHeader } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { rich } from '@/i18n/rich'
import { CONFIG } from '@/data/config'
import AwardCategories from './AwardCategories'
import SelectionProcess from './SelectionProcess'
import AwardsTimeline from './AwardsTimeline'
import Eligibility from './Eligibility'
import toghu from '@/assets/images/motifs/pattern-toghu.webp'
import maskGreen from '@/assets/images/motifs/mask-green.webp'
import maskYellow from '@/assets/images/motifs/mask-yellow.webp'
import './Awards.scss'

/**
 * <Awards /> — Cameroon Artificial Intelligence Awards (CAIA 2027).
 *
 * Section composée de sous-composants :
 *   AwardCategories  → les 10 prix
 *   SelectionProcess → étapes, pondération jury/public, grille d'évaluation
 *   Eligibility      → conditions, pièces, avantages
 *   AwardsTimeline   → chronogramme de l'appel
 *
 * Direction artistique : ambiance « soirée de gala » — fond bleu nuit,
 * texture de broderie Toghu, masques aux couleurs du drapeau.
 */
export default function Awards() {
  const { t } = useI18n()
  const aw = t.awards
  const downloads = CONFIG.features.documentDownloads

  return (
    <section className="section awards" id="awards" aria-labelledby="awards-title">
      {/* Décor */}
      <div className="awards__texture" style={{ backgroundImage: `url(${toghu})` }} aria-hidden="true" />
      <img className="awards__mask awards__mask--green" src={maskGreen} alt="" loading="lazy" aria-hidden="true" />
      <img className="awards__mask awards__mask--yellow" src={maskYellow} alt="" loading="lazy" aria-hidden="true" />

      <div className="container awards__inner">
        {/* --- Introduction ------------------------------------------------- */}
        <div className="awards__intro">
          <div>
            <SectionHeader id="awards-title" dark eyebrow={aw.eyebrow} title={aw.title} lead={aw.lead} />
            <Reveal className="awards__egide">
              <span>{aw.egideLabel}</span>
              <ul>
                {aw.egide.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </Reveal>
            <Reveal className="awards__ctas">
              <Button href={CONFIG.links.awards} external size="lg" icon="arrow-up-right">
                {aw.ctaApply}
              </Button>
              {/* Téléchargement du TDR bloqué tant que le PDF n'est pas définitif
                  (CONFIG.features.documentDownloads) */}
              {downloads ? (
                <Button href={CONFIG.links.tdrPdf} external size="lg" variant="ghost" iconLeft="download">
                  {aw.ctaTdr}
                </Button>
              ) : (
                <Button size="lg" variant="ghost" iconLeft="download" disabled title={t.soonDoc}>
                  {aw.ctaTdr} <span className="btn__soon">{t.soonShort}</span>
                </Button>
              )}
            </Reveal>
          </div>

          {/* Carte « date limite » */}
          <Reveal className="deadline-card" delay={150}>
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

          {/* Souvenirs des remises de prix précédentes */}
          <Reveal className="awards__photos" delay={220}>
            <PhotoStack ids={['trophee-2025', 'laureats-2025', 'remise-prix-2025', 'remise-2023']} tilt="right" interval={6200} />
          </Reveal>
        </div>

        <AwardCategories />
        <SelectionProcess />
        <Eligibility />
        <AwardsTimeline />
        <MoreLink route="awards" align="center" />
      </div>
    </section>
  )
}
