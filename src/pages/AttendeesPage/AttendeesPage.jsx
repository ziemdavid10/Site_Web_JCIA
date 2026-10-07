import { Link } from 'react-router'
import { Button, CallButton, Icon, Reveal, ThemeImg } from '@/components/ui'
import { CtaBand, PageHero, PageSection } from '@/components/page'
import AttendeeList from '@/components/attendees/AttendeeList'
import { useI18n } from '@/i18n/context'
import { fill } from '@/i18n/format'
import { rich } from '@/i18n/rich'
import { CONFIG } from '@/data/config'
import useAttendees from '@/hooks/useAttendees'
import useDocumentMeta from '@/hooks/useDocumentMeta'
import mascot from '@/assets/images/brand/mascot.webp'
import mascotWhite from '@/assets/images/brand/mascot-white.webp'
import './AttendeesPage.scss'

/**
 * <AttendeesPage /> — « Ils y seront » : liste actualisée des participants
 * ayant réservé leur place et accepté de figurer publiquement.
 *
 * La liste est filtrable par profil et consultable par recherche. Elle ne
 * contient aucune donnée de contact : uniquement ce que chaque personne a
 * accepté de rendre visible au moment de sa commande.
 */
export default function AttendeesPage() {
  const { t } = useI18n()
  const a = t.attendees
  const p = t.pages.attendees
  const { routes } = CONFIG
  useDocumentMeta(`${p.title} | ${t.event.shortName}`)
  const attendeesCount = useAttendees().length

  return (
    <div className="detail-page attendees-page">
      <PageHero
        current={p.title}
        eyebrow={p.hero.eyebrow}
        title={p.hero.title}
        lead={p.hero.lead}
        stats={[
          { value: String(attendeesCount), label: p.hero.statAttendees },
          { value: '4', label: p.hero.statTiers },
        ]}
        art={<ThemeImg light={mascot} dark={mascotWhite} alt="" width="240" height="316" />}
      >
        <Button as={Link} to={routes.tickets} size="lg" icon="arrow-right">
          {a.ctaButton}
        </Button>
        <CallButton size="lg" variant="ghost" />
      </PageHero>

      <PageSection id="liste" tone="white" title={p.listTitle}>
        <AttendeeList mode="page" />
      </PageSection>

      {/* Comment apparaître / se retirer de la liste */}
      <PageSection tone="sand" width="narrow" title={p.privacy.title}>
        <ul className="attendees-page__privacy">
          {p.privacy.items.map((item) => (
            <Reveal as="li" key={item.title}>
              <Icon name={item.icon} size={20} />
              <div>
                <h3>{item.title}</h3>
                <p>{rich(item.text)}</p>
              </div>
            </Reveal>
          ))}
        </ul>
        <p className="attendees-page__legal">
          {fill(p.privacy.contact, { email: CONFIG.contact.privacyEmail })}
        </p>
      </PageSection>

      <CtaBand />
    </div>
  )
}
