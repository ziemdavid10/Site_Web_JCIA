import { Link } from 'react-router'
import { Button, Icon } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { fill } from '@/i18n/format'
import { CONFIG } from '@/data/config'
import { formatXAF } from '@/utils/money'
import { getTicketPricing, isPromotionActive } from '@/utils/tickets'
import { tikoraAvailability } from '@/hooks/useTicketCatalog'
import './TikoraHandoff.scss'

/**
 * <TikoraHandoff /> — billet PAYANT : le paiement se poursuit sur la page de
 * l'événement chez TIKORA (Mobile Money). On explique la suite AVANT le départ :
 *   1. choisir la bonne catégorie sur TIKORA et payer ;
 *   2. TIKORA envoie les billets (QR codes) ;
 *   3. le serveur JCIA envoie le lien du formulaire participant ;
 *   4. le visuel « J'y serai » se crée sur le site.
 */
export default function TikoraHandoff({ tier, catalog }) {
  const { t, locale } = useI18n()
  const h = t.tickets.handoff
  const tt = t.tickets.tiers[tier.id]
  const { price, originalPrice, discounted } = getTicketPricing(tier)
  // Nom de la catégorie à choisir sur TIKORA (tarif de lancement ou plein tarif)
  const tikoraName = isPromotionActive() ? fill(h.launchName, { tier: tt.name }) : tt.name
  const availability = tikoraAvailability(tier, catalog)
  const open = availability === 'open'

  return (
    <div className="container tikora-handoff">
      <section className={`th-card th-card--${tier.color}`} aria-labelledby="th-title">
        <div className="th-card__tier">
          <span className="th-card__icon" aria-hidden="true">
            <Icon name={tier.icon} size={24} />
          </span>
          <div>
            <p className="th-card__eyebrow">{h.eyebrow}</p>
            <h2 id="th-title">{tt.name}</h2>
          </div>
          <p className="th-card__price">
            {discounted && <s>{formatXAF(originalPrice, locale)}</s>}
            <strong>{formatXAF(price, locale)}</strong>
            <small>{h.fees}</small>
          </p>
        </div>

        <ol className="th-steps">
          <li>
            <span aria-hidden="true">1</span>
            <div>
              <strong>{h.step1Title}</strong>
              <p>{fill(h.step1Text, { category: tikoraName })}</p>
            </div>
          </li>
          <li>
            <span aria-hidden="true">2</span>
            <div>
              <strong>{h.step2Title}</strong>
              <p>{h.step2Text}</p>
            </div>
          </li>
          <li>
            <span aria-hidden="true">3</span>
            <div>
              <strong>{h.step3Title}</strong>
              <p>{h.step3Text}</p>
            </div>
          </li>
          <li>
            <span aria-hidden="true">4</span>
            <div>
              <strong>{h.step4Title}</strong>
              <p>{h.step4Text}</p>
            </div>
          </li>
        </ol>

        {open ? (
          <Button href={CONFIG.payment.tikoraEventUrl} external size="lg" icon="arrow-up-right" className="th-card__cta">
            {h.cta}
          </Button>
        ) : (
          <Button size="lg" variant="outline" iconLeft={availability === 'soldout' ? 'info' : 'clock'} disabled className="th-card__cta">
            {availability === 'soldout' ? t.tickets.page.soldOutCta : t.tickets.page.chooseClosed}
          </Button>
        )}
        <p className="th-card__note">
          <Icon name="lock" size={14} /> {open ? h.ctaNote : availability === 'soldout' ? t.tickets.page.soldOutNote : h.soonNote}
        </p>
      </section>

      <aside className="th-mail" aria-labelledby="th-mail-title">
        <span className="th-mail__icon" aria-hidden="true">
          <Icon name="mail" size={26} />
        </span>
        <h2 id="th-mail-title">{h.mailTitle}</h2>
        <p>{h.mailText}</p>
        <ul>
          <li>
            <Icon name="ticket" size={16} /> {h.mailTickets}
          </li>
          <li>
            <Icon name="users" size={16} /> {h.mailForm}
          </li>
        </ul>
        <p className="th-mail__spam">{h.mailSpam}</p>
        <Link to={CONFIG.routes.flyer} className="th-mail__flyer">
          <Icon name="star" size={16} /> {h.flyer} <Icon name="arrow-right" size={16} />
        </Link>
      </aside>
    </div>
  )
}
