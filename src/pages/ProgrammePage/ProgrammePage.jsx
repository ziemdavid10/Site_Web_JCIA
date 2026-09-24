import { Link } from 'react-router'
import { Button, Icon, Reveal } from '@/components/ui'
import { CtaBand, IconCards, PageHero, PageSection } from '@/components/page'
import Programme from '@/components/sections/Programme/Programme'
import { VenueMap } from '@/components/sections/Registration/Registration'
import { useI18n } from '@/i18n/context'
import { CONFIG } from '@/data/config'
import useDocumentMeta from '@/hooks/useDocumentMeta'
import maskOrange from '@/assets/images/motifs/mask-orange.webp'
import './ProgrammePage.scss'

/**
 * <ProgrammePage /> — programme complet des JCIA 2027 :
 * quatre registres → programme heure par heure (onglets, section de l'accueil)
 * → masterclasses en détail → temps forts → informations pratiques.
 */
export default function ProgrammePage() {
  const { t, lang } = useI18n()
  const p = t.pages.programme
  const colon = lang === 'fr' ? '\u00a0:' : ':' // typographie française : espace insécable avant « : »
  const mcs = t.programme.masterclasses
  const { routes } = CONFIG
  useDocumentMeta(`${p.title} | ${t.event.shortName}`)

  return (
    <div className="detail-page programme-page">
      <PageHero
        current={p.title}
        eyebrow={p.hero.eyebrow}
        title={p.hero.title}
        lead={p.hero.lead}
        art={<img src={maskOrange} alt="" width="300" height="300" />}
      >
        <Button as={Link} to={routes.tickets} size="lg" icon="arrow-right">
          {t.header.mobileCta}
        </Button>
        <Button href="#masterclasses-detail" size="lg" variant="ghost" iconLeft="book">
          {t.programme.masterclassesTitle}
        </Button>
      </PageHero>

      {/* Quatre registres */}
      <PageSection tone="white" title={p.registers.title}>
        <IconCards items={p.registers.items} columns={4} />
      </PageSection>

      {/* Programme heure par heure : section de l'accueil réutilisée */}
      <Programme showMasterclasses={false} />

      {/* Masterclasses en détail */}
      <PageSection id="masterclasses-detail" tone="white" title={p.masterclasses.title} lead={p.masterclasses.lead}>
        <ul className="mc-format" aria-label={t.programme.masterclassesTitle}>
          {p.masterclasses.format.map((f) => (
            <li key={f}>
              <Icon name="check" size={16} />
              {f}
            </li>
          ))}
        </ul>

        <ul className="mc-details">
          {mcs.map((m, i) => (
            <Reveal as="li" key={m.num} delay={(i % 2) * 90} className={`mc-detail mc-detail--${m.color}`}>
              <div className="mc-detail__head">
                <span className="mc-detail__num">{m.num}</span>
                <Icon name={m.icon} size={30} />
              </div>
              <h3>{m.title}</h3>
              <p className="mc-detail__text">{m.text}</p>
              <p className="mc-detail__label">{p.masterclasses.objectivesLabel}</p>
              <ul className="mc-detail__list">
                {p.masterclasses.details[i].map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
              <p className="mc-detail__audience">
                <Icon name="users" size={16} />
                <span>
                  <strong>
                    {p.masterclasses.audienceLabel}
                    {colon}
                  </strong> {m.audience}
                </span>
              </p>
            </Reveal>
          ))}
        </ul>
      </PageSection>

      {/* Temps forts */}
      <PageSection tone="stage" title={p.highlights.title}>
        <IconCards items={p.highlights.items} columns={3} />
      </PageSection>

      {/* Infos pratiques */}
      <PageSection tone="sand" title={p.practical.title}>
        <div className="programme-practical">
          <IconCards items={p.practical.items} columns={2} />
          <div className="programme-practical__map">
            <VenueMap />
          </div>
        </div>
        <p className="page-section__note">{p.note}</p>
      </PageSection>

      <CtaBand secondary={t.footer.extra.speakers} secondaryTo={routes.speakers} />
    </div>
  )
}
