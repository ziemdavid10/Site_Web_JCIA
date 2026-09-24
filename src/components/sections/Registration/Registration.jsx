import { Link } from 'react-router'
import { Button, Icon, PatternBg, Reveal, SectionHeader } from '@/components/ui'
import OperatorBadge from '@/components/tickets/OperatorBadge'
import { useI18n } from '@/i18n/context'
import { useConsent } from '@/consent/context'
import { CONFIG } from '@/data/config'
import { formatXAF } from '@/utils/money'
import { formatSeats, isLowStock, isSoldOut, remainingSeats } from '@/utils/tickets'
import { fill } from '@/i18n/format'
import './Registration.scss'

/**
 * <VenueMap /> — carte OpenStreetMap du lieu.
 * Contenu tiers : elle n'est chargée qu'avec le consentement « contenus tiers ».
 * Sinon, un encart explique pourquoi et permet de l'afficher en un clic.
 */
export function VenueMap() {
  const { t } = useI18n()
  const { has, allow } = useConsent()
  const r = t.registration

  return (
    <Reveal className="registration__map">
      {has('media') ? (
        <iframe title={r.mapTitle} src={CONFIG.venue.embedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      ) : (
        <div className="registration__map-consent">
          <Icon name="pin" size={28} />
          <p>
            <strong>{r.mapConsent.title}</strong>
            {r.mapConsent.text}
          </p>
          <button type="button" onClick={() => allow('media')}>
            {r.mapConsent.button}
          </button>
        </div>
      )}
      <a href={CONFIG.venue.mapUrl} target="_blank" rel="noopener noreferrer">
        <Icon name="arrow-up-right" size={16} /> {r.directions}
      </a>
    </Reveal>
  )
}

/**
 * <TicketsTeaser /> — aperçu de la billetterie : un lien par billet vers la
 * commande (tarif présélectionné), puis vers la page Billetterie complète.
 */
function TicketsTeaser() {
  const { t, locale } = useI18n()
  const r = t.registration
  const { tiers } = CONFIG.tickets
  const { routes } = CONFIG

  return (
    <Reveal className="tickets-teaser" delay={120}>
      <h3>{r.tiersTitle}</h3>
      <ul className="tickets-teaser__list">
        {tiers.map((tier) => {
          const tt = t.tickets.tiers[tier.id]
          const out = isSoldOut(tier)
          const low = !out && isLowStock(tier)
          return (
            <li
              key={tier.id}
              className={`tickets-teaser__tier tickets-teaser__tier--${tier.color} ${out ? 'is-sold-out' : ''}`}
            >
              <Link to={out ? routes.tickets : `${routes.checkout}/${tier.id}`}>
                <span className="tickets-teaser__icon" aria-hidden="true">
                  <Icon name={tier.icon} size={22} />
                </span>
                <span className="tickets-teaser__text">
                  <strong>
                    {tt.name}
                    {/* Mention « le plus choisi » retirée à la demande de l'organisateur :
                        {tier.featured && <em>{t.tickets.page.featured}</em>} */}
                  </strong>
                  <small>
                    {out
                      ? t.tickets.page.soldOut
                      : low
                        ? fill(t.tickets.page.remaining, { n: formatSeats(remainingSeats(tier), locale) })
                        : tt.tagline}
                  </small>
                </span>
                <span className="tickets-teaser__price">{tier.price === 0 ? r.from : formatXAF(tier.price, locale)}</span>
                <Icon name="chevron-right" size={20} className="tickets-teaser__chevron" />
              </Link>
            </li>
          )
        })}
      </ul>
      <Button as={Link} to={routes.tickets} icon="arrow-right" className="tickets-teaser__all">
        {r.allTickets}
      </Button>
      <div className="tickets-teaser__pay">
        <span>{r.payWith}</span>
        {CONFIG.payment.operators.map((op) => (
          <OperatorBadge key={op.id} id={op.id} size="sm" />
        ))}
      </div>
    </Reveal>
  )
}

/**
 * <Registration /> — informations pratiques + aperçu de la billetterie.
 */
export default function Registration() {
  const { t } = useI18n()
  const r = t.registration

  return (
    <section className="section registration" id="inscription" aria-labelledby="registration-title">
      <PatternBg variant="ndop-royal" color="currentColor" opacity={0.05} />

      <div className="container registration__grid">
        <div className="registration__info">
          <SectionHeader id="registration-title" dark eyebrow={r.eyebrow} title={r.title} lead={r.lead} />

          <ul className="registration__infos">
            {r.infos.map((info, i) => (
              <Reveal as="li" key={info.title} delay={i * 70}>
                <Icon name={info.icon} size={22} />
                <div>
                  <strong>{info.title}</strong>
                  <span>{info.text}</span>
                </div>
              </Reveal>
            ))}
          </ul>

          <VenueMap />
        </div>

        <TicketsTeaser />
      </div>
    </section>
  )
}
