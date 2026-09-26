import { Link } from 'react-router'
import { Button, Icon, MoreLink, PatternBg, Reveal, SectionHeader } from '@/components/ui'
import AttendeeList from '@/components/attendees/AttendeeList'
import { useI18n } from '@/i18n/context'
import { fill } from '@/i18n/format'
import { CONFIG } from '@/data/config'
import { ATTENDEES_TOTAL } from '@/data/attendees'
import './Attendees.scss'

/**
 * <Attendees /> — « Ils y seront » : aperçu des participants déjà inscrits.
 * Le détail (filtres par profil, recherche) est sur /participants.
 */
export default function Attendees() {
  const { t } = useI18n()
  const a = t.attendees

  return (
    <section className="section section--white attendees-section" id="participants" aria-labelledby="attendees-title">
      <PatternBg variant="dots" color="currentColor" opacity={0.05} fade="radial" />

      <div className="container attendees-section__inner">
        <SectionHeader id="attendees-title" align="center" eyebrow={a.eyebrow} title={a.title} lead={a.lead} />

        <Reveal className="attendees-section__counter">
          <Icon name="users" size={22} />
          <strong>{fill(a.counter, { n: ATTENDEES_TOTAL })}</strong>
        </Reveal>

        <AttendeeList mode="home" limit={8} />

        <Reveal className="attendees-section__cta" delay={120}>
          <p>{a.ctaText}</p>
          <Button as={Link} to={CONFIG.routes.tickets} icon="arrow-right">
            {a.ctaButton}
          </Button>
        </Reveal>

        <MoreLink route="attendees" align="center" />
      </div>
    </section>
  )
}
