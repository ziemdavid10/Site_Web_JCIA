import { Link } from 'react-router'
import { Accordion, Button, Icon, Reveal } from '@/components/ui'
import { PageHero, PageSection } from '@/components/page'
import OperatorBadge from '@/components/tickets/OperatorBadge'
import { useI18n } from '@/i18n/context'
import { rich } from '@/i18n/rich'
import { fill } from '@/i18n/format'
import { CONFIG } from '@/data/config'
import { formatXAF } from '@/utils/money'
import { formatSeats, isLowStock, isSoldOut, remainingSeats } from '@/utils/tickets'
import useDocumentMeta from '@/hooks/useDocumentMeta'
import './TicketsPage.scss'

/**
 * <TicketsPage /> — billetterie : choix du tarif.
 * (Inspirée de la page « Attend » de PyCon Cameroon, adaptée aux JCIA 2027.)
 *
 *   étapes du parcours → cartes tarifaires → comparatif détaillé
 *   → groupes & paiement mobile → notes → questions fréquentes.
 *
 * Chaque carte mène à /billetterie/commande/:tierId (tarif présélectionné).
 */
export default function TicketsPage() {
  const { t, locale } = useI18n()
  const tp = t.tickets.page
  const { routes, tickets, payment, contact, features } = CONFIG
  // Paiement en ligne pas encore branché : les tarifs restent consultables,
  // mais aucune commande ne peut être lancée (CONFIG.features.payment).
  const open = features.payment
  const price = (tier) => (tier.price === 0 ? tp.free : formatXAF(tier.price, locale))
  const seats = (tier) =>
    fill(tp.seatsLeft, { n: formatSeats(remainingSeats(tier), locale), total: formatSeats(tier.quota, locale) })
  const faqItems = t.pages.faq.items.filter((i) => i.cat === 'tickets')
  useDocumentMeta(`${tp.title} | ${t.event.shortName}`)

  return (
    <div className="detail-page tickets-page">
      <PageHero current={tp.title} eyebrow={tp.hero.eyebrow} title={tp.hero.title} lead={tp.hero.lead}>
        {/* Parcours en 4 étapes */}
        <ol className="tickets-steps">
          {tp.steps.map((s, i) => (
            <li key={s.title}>
              <span className="tickets-steps__icon" aria-hidden="true">
                <Icon name={s.icon} size={20} />
              </span>
              <span>
                <strong>
                  {i + 1}. {s.title}
                </strong>{' '}
                {s.text}
              </span>
            </li>
          ))}
        </ol>
      </PageHero>

      {/* --- Cartes tarifaires --------------------------------------------------- */}
      <PageSection id="tarifs" tone="sand" title={tp.tiersTitle} align="center">
        {/* Billetterie en ligne fermée : on l'annonce avant les tarifs */}
        {!open && (
          <Reveal className="tickets-closed">
            <span className="tickets-closed__tag">
              <Icon name="clock" size={15} /> {tp.closed.tag}
            </span>
            <h3>{tp.closed.title}</h3>
            <p>{tp.closed.text}</p>
            <Button
              href={`mailto:${contact.emails[0]}?subject=${encodeURIComponent(tp.closed.subject)}`}
              variant="secondary"
              iconLeft="mail"
            >
              {tp.closed.cta}
            </Button>
          </Reveal>
        )}

        <ul className="tier-grid">
          {tickets.tiers.map((tier, i) => {
            const tt = t.tickets.tiers[tier.id]
            return (
              <Reveal
                as="li"
                key={tier.id}
                delay={i * 80}
                className={`tier-card tier-card--${tier.color} ${isSoldOut(tier) ? 'is-sold-out' : ''}`}
              >
                {/* Mention « le plus choisi » retirée à la demande de l'organisateur :
                    {tier.featured && <span className="tier-card__ribbon">{tp.featured}</span>} */}
                {isSoldOut(tier) && <span className="tier-card__ribbon tier-card__ribbon--out">{tp.soldOut}</span>}
                <div className="tier-card__head">
                  <span className="tier-card__icon" aria-hidden="true">
                    <Icon name={tier.icon} size={24} />
                  </span>
                  <span className={`tier-card__mode ${tier.onsite ? '' : 'is-online'}`}>
                    <Icon name={tier.onsite ? 'pin' : 'play'} size={14} />
                    {tier.onsite ? tp.onsite : tp.online}
                  </span>
                </div>
                <h3 className="tier-card__name">{tt.name}</h3>
                <p className="tier-card__tagline">{tt.tagline}</p>
                <p className="tier-card__price">
                  <strong>{price(tier)}</strong>
                  {tier.price > 0 && <span>{tp.perPerson}</span>}
                </p>
                {/* Places restantes sur le quota — affichées en permanence */}
                <p
                  className={`tier-card__quota ${isLowStock(tier) ? 'is-low' : ''} ${isSoldOut(tier) ? 'is-out' : ''}`}
                >
                  <Icon name={isLowStock(tier) || isSoldOut(tier) ? 'alert' : 'ticket'} size={15} />
                  {isSoldOut(tier) ? tp.soldOutCta : seats(tier)}
                </p>
                <ul className="tier-card__features">
                  {tt.features.map((f) => (
                    <li key={f}>
                      <Icon name="check" size={16} />
                      {f}
                    </li>
                  ))}
                </ul>
                {tt.note && (
                  <p className="tier-card__note">
                    <Icon name="info" size={16} />
                    {tt.note}
                  </p>
                )}
                {/* Quota vendu → « Épuisé » ; billetterie fermée → « Bientôt disponible » */}
                {isSoldOut(tier) ? (
                  <Button
                    variant="outline"
                    iconLeft="info"
                    className="tier-card__cta"
                    disabled
                    aria-label={`${tt.name} — ${tp.soldOutCta}`}
                  >
                    {tp.soldOutCta}
                  </Button>
                ) : !open ? (
                  <Button
                    variant="outline"
                    iconLeft="clock"
                    className="tier-card__cta"
                    disabled
                    title={tp.closed.title}
                    aria-label={`${tt.name} — ${tp.chooseClosed}`}
                  >
                    {tp.chooseClosed}
                  </Button>
                ) : (
                  <Button
                    as={Link}
                    to={`${routes.checkout}/${tier.id}`}
                    variant="secondary"
                    icon="arrow-right"
                    className="tier-card__cta"
                    aria-label={`${tp.choose} — ${tt.name}`}
                  >
                    {tp.choose}
                  </Button>
                )}
              </Reveal>
            )
          })}
        </ul>
      </PageSection>

      {/* --- Comparatif ------------------------------------------------------------- */}
      <PageSection tone="white" title={tp.compare.title} align="center">
        <div className="compare" role="region" aria-label={tp.compare.title} tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">{tp.compare.feature}</th>
                {tickets.tiers.map((tier) => (
                  <th scope="col" key={tier.id} className={`compare__tier compare__tier--${tier.color}`}>
                    <span>{t.tickets.tiers[tier.id].name}</span>
                    <small>{price(tier)}</small>
                    <small className={`compare__quota ${isSoldOut(tier) ? 'is-out' : ''}`}>
                      {isSoldOut(tier)
                        ? tp.soldOutCta
                        : fill(tp.seatsLeftShort, { n: formatSeats(remainingSeats(tier), locale) })}
                    </small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tp.compare.rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {row.values.map((v, i) => (
                    <td key={tickets.tiers[i].id}>
                      {v ? (
                        <span className="compare__yes" role="img" aria-label="✓">
                          <Icon name="check" size={16} />
                        </span>
                      ) : (
                        <span className="compare__no" role="img" aria-label="✗">
                          —
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageSection>

      {/* --- Groupes & paiement ------------------------------------------------------- */}
      <PageSection tone="sand">
        <div className="tickets-info">
          <Reveal className="tickets-info__card">
            <Icon name="users" size={28} />
            <h2>{tp.groups.title}</h2>
            <p>{tp.groups.text}</p>
            <Button
              href={`mailto:${contact.emails[0]}?subject=${encodeURIComponent(tp.groups.subject)}`}
              variant="outline"
              iconLeft="mail"
            >
              {tp.groups.cta}
            </Button>
          </Reveal>
          <Reveal className="tickets-info__card tickets-info__card--pay" delay={100}>
            <Icon name="smartphone" size={28} />
            <h2>{tp.pay.title}</h2>
            <p>{tp.pay.text}</p>
            <div className="tickets-info__ops">
              {[...payment.operators, ...payment.cards].map((op) => (
                <OperatorBadge key={op.id} id={op.id} />
              ))}
            </div>
            <p className="tickets-info__secure">
              <Icon name="lock" size={16} />
              {tp.pay.secure}
            </p>
          </Reveal>
        </div>

        <ul className="tickets-notes">
          {tp.notes.map((n) => (
            <li key={n}>
              <Icon name="info" size={16} />
              {rich(n)}
            </li>
          ))}
        </ul>
      </PageSection>

      {/* --- Questions ------------------------------------------------------------------ */}
      <PageSection tone="white" width="narrow" title={tp.faqTitle}>
        <Accordion items={faqItems} />
        <p className="tickets-page__faq-link">
          <Link to={routes.faq}>
            {tp.faqLink} <Icon name="arrow-right" size={16} />
          </Link>
        </p>
      </PageSection>
    </div>
  )
}
