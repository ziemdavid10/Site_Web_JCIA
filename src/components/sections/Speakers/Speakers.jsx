import { Button, MoreLink, Reveal, SectionHeader } from '@/components/ui'
import SpeakersExplorer from '@/components/speakers/SpeakersExplorer'
import { useI18n } from '@/i18n/context'
import { CONFIG } from '@/data/config'
import './Speakers.scss'

/**
 * <Speakers /> — section « Intervenants » de l'accueil.
 * Un clic sur une catégorie déplie la liste de ses intervenants en cartes
 * (photo, thème, propos) ; chaque carte ouvre une fiche détaillée.
 */
export default function Speakers() {
  const { t } = useI18n()
  const sp = t.speakers

  return (
    <section className="section section--white speakers" id="intervenants" aria-labelledby="speakers-title">
      <div className="container">
        <SectionHeader id="speakers-title" align="center" eyebrow={sp.eyebrow} title={sp.title} lead={sp.lead} />
        <SpeakersExplorer mode="home" />
        <Reveal className="speakers__cta">
          <p>{sp.ctaText}</p>
          <Button
            href={`mailto:${CONFIG.contact.emails[0]}?subject=${encodeURIComponent(sp.ctaSubject)}`}
            variant="secondary"
            icon="arrow-right"
          >
            {sp.ctaButton}
          </Button>
        </Reveal>
        <MoreLink route="speakers" align="center" />
      </div>
    </section>
  )
}
