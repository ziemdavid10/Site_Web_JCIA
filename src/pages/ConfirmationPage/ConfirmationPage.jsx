import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import QRCode from 'qrcode'
import { Button, Frise, Icon, PatternBg, Reveal } from '@/components/ui'
import OperatorBadge from '@/components/tickets/OperatorBadge'
import { useI18n } from '@/i18n/context'
import { rich } from '@/i18n/rich'
import { fill } from '@/i18n/format'
import { CONFIG } from '@/data/config'
import { formatXAF } from '@/utils/money'
import { formatCmPhone } from '@/utils/phone'
import { buildEventIcsHref } from '@/utils/calendar'
import { canGenerateFlyer, getOrder, isConfirmed } from '@/services/orders'
import { receiptFallbackHref, requestOrderReceipt } from '@/services/email'
import useDocumentMeta from '@/hooks/useDocumentMeta'
import logoWhite from '@/assets/images/brand/logo-jcia-white-sm.webp'
import './ConfirmationPage.scss'

/**
 * Génère les QR codes des billets (un par participant).
 * ⚠️ Démonstration : le contenu est lisible (n° de commande + participant).
 * En production, le QR code contiendra un jeton signé émis par le serveur de
 * billetterie et vérifié au contrôle d'accès.
 */
function useTicketQrCodes(order) {
  const [codes, setCodes] = useState([])

  useEffect(() => {
    if (!order) return undefined
    let cancelled = false
    Promise.all(
      order.attendees.map((name, i) =>
        QRCode.toDataURL(`JCIA2027|${order.id}|${i + 1}/${order.attendees.length}|${order.tierId}|${name}`, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 280,
          color: { dark: '#19203a', light: '#ffffff' },
        }),
      ),
    ).then((urls) => !cancelled && setCodes(urls))
    return () => {
      cancelled = true
    }
  }, [order])

  return codes
}

/**
 * Demande au serveur de billetterie l'envoi du récapitulatif, une seule fois
 * par commande et par session : si le visiteur revient sur cette page (retour
 * arrière, lien gardé), aucun second e-mail n'est demandé. Le serveur reçoit
 * en plus une clé d'idempotence, ce qui garantit l'absence de doublon même
 * depuis un autre appareil.
 */
const receiptRequests = new Map()

/** Icône associée à chaque état de l'envoi */
const RECEIPT_ICON = { sending: 'clock', sent: 'mail', queued: 'mail', demo: 'info', failed: 'alert' }

function useOrderReceipt(order) {
  const [state, setState] = useState('sending')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!order) return undefined
    let cancelled = false
    // On garde la PROMESSE, pas seulement son résultat : deux affichages
    // simultanés de la page partagent ainsi le même et unique appel.
    let request = receiptRequests.get(order.id)
    if (!request) {
      request = requestOrderReceipt(order)
      receiptRequests.set(order.id, request)
    }
    request.then((result) => !cancelled && setState(result))
    return () => {
      cancelled = true
    }
  }, [order, attempt])

  // Nouvelle tentative après un échec : le visiteur garde la main
  const retry = () => {
    if (!order) return
    receiptRequests.delete(order.id)
    setState('sending')
    setAttempt((n) => n + 1)
  }

  return [state, retry]
}

/**
 * <ConfirmationPage /> — commande confirmée : billets électroniques (QR code),
 * détails du paiement, ajout à l'agenda, impression, et accès au générateur de
 * flyer « J'y serai ».
 */
export default function ConfirmationPage() {
  const { t, locale } = useI18n()
  const c = t.tickets.confirmation
  const { orderId } = useParams()
  const order = useMemo(() => getOrder(orderId), [orderId])
  const codes = useTicketQrCodes(isConfirmed(order) ? order : null)
  const [receipt, retryReceipt] = useOrderReceipt(isConfirmed(order) ? order : null)
  const { routes, payment } = CONFIG
  useDocumentMeta(`${c.title} | ${t.event.shortName}`, { noindex: true })

  // --- Commande introuvable (autre appareil, lien erroné, paiement non abouti) -----------
  if (!isConfirmed(order)) {
    return (
      <div className="confirmation confirmation--missing">
        <div className="container confirmation__missing">
          <span className="confirmation__missing-icon">
            <Icon name="search" size={34} />
          </span>
          <h1>{c.notFoundTitle}</h1>
          <p>{c.notFoundText}</p>
          <div className="confirmation__missing-actions">
            <Button as={Link} to={routes.tickets} iconLeft="ticket">
              {t.tickets.checkout.back}
            </Button>
            <Button href={`mailto:${CONFIG.contact.emails[0]}?subject=${encodeURIComponent(orderId ?? '')}`} variant="outline" iconLeft="mail">
              {CONFIG.contact.emails[0]}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const tier = CONFIG.tickets.tiers.find((x) => x.id === order.tierId)
  const tt = t.tickets.tiers[order.tierId]
  const e = t.event
  // Mobile Money : l'opérateur débité ; carte : le réseau utilisé n'est pas connu
  // du navigateur (le paiement se fait chez la banque), on affiche donc « Carte ».
  const operator = payment.operators.find((o) => o.id === order.payment.operator)
  const isDemo = order.payment.mode === 'demo'
  const date = new Date(order.payment.paidAt || order.createdAt).toLocaleString(locale, { dateStyle: 'long', timeStyle: 'short' })
  const firstName = order.customer.name.split(' ')[0]

  return (
    <div className="confirmation">
      {/* --- Bandeau de succès ----------------------------------------------------- */}
      <header className="confirmation__hero">
        <PatternBg variant="ndop" color="currentColor" opacity={0.05} fade="radial" />
        <div className="container confirmation__hero-inner">
          <span className="confirmation__check" aria-hidden="true">
            <Icon name="check" size={40} strokeWidth={2.6} />
          </span>
          <h1>{rich(c.heading)}</h1>
          <p>{fill(c.lead, { name: firstName, email: order.customer.email })}</p>
          {isDemo && (
            <p className="confirmation__demo">
              <Icon name="info" size={16} /> {c.demo}
            </p>
          )}

          {/* État réel de l'envoi du récapitulatif : on n'annonce « envoyé »
              que lorsque le serveur l'a confirmé. */}
          <p className={`confirmation__receipt is-${receipt ?? 'sending'}`} aria-live="polite">
            <Icon name={RECEIPT_ICON[receipt] ?? 'clock'} size={16} />
            <span>
              {receipt === 'demo'
                ? c.receipt.demo
                : receipt === 'failed'
                  ? c.receipt.failed
                  : receipt === 'sending'
                    ? c.receipt.sending
                    : fill(c.receipt[receipt] ?? c.receipt.sent, { email: order.customer.email })}
            </span>
            {receipt === 'failed' && (
              <span className="confirmation__receipt-actions">
                <button type="button" className="confirmation__receipt-retry" onClick={retryReceipt}>
                  <Icon name="refresh" size={15} /> {c.receipt.retry}
                </button>
                <a href={receiptFallbackHref(order, c.title)}>
                  <Icon name="mail" size={15} /> {c.receipt.contact}
                </a>
              </span>
            )}
          </p>
        </div>
        <Frise height={12} />
      </header>

      <div className="container confirmation__grid">
        {/* --- Billets ---------------------------------------------------------------- */}
        <ol className="e-tickets">
          {order.attendees.map((name, i) => (
            <Reveal as="li" key={`${name}-${i}`} delay={i * 80} className={`e-ticket e-ticket--${tier?.color ?? 'orange'}`}>
              <div className="e-ticket__main">
                <img src={logoWhite} alt={e.shortName} width="110" height="46" className="e-ticket__logo" />
                <p className="e-ticket__tier">
                  {c.ticketLabel} {tt.name}
                  {order.attendees.length > 1 && (
                    <span>
                      {i + 1}/{order.attendees.length}
                    </span>
                  )}
                </p>
                <p className="e-ticket__holder">
                  <small>{c.holder}</small>
                  {name}
                </p>
                <ul className="e-ticket__meta">
                  <li>
                    <Icon name="calendar" size={15} /> {e.dateLabel}
                  </li>
                  <li>
                    <Icon name={tier?.onsite ? 'pin' : 'play'} size={15} />
                    {tier?.onsite ? `${e.venue.name}, ${e.venue.city}` : t.tickets.page.online}
                  </li>
                </ul>
              </div>
              <div className="e-ticket__stub">
                <PatternBg variant="ndop-royal" color="#19203a" opacity={0.09} scale={0.45} />
                {codes[i] ? (
                  <img src={codes[i]} alt={`QR code — ${order.id}`} width="140" height="140" className="e-ticket__qr" />
                ) : (
                  <span className="e-ticket__qr e-ticket__qr--loading" aria-hidden="true" />
                )}
                <p className="e-ticket__id">{order.id}</p>
                <p className="e-ticket__scan">{tier?.onsite ? c.scan : c.onlineAccess}</p>
              </div>
            </Reveal>
          ))}
        </ol>

        {/* --- Détails & actions ------------------------------------------------------ */}
        <aside className="confirmation__side">
          <Reveal className="order-box">
            <dl>
              <div>
                <dt>{c.order}</dt>
                <dd>{order.id}</dd>
              </div>
              <div>
                <dt>{c.date}</dt>
                <dd>{date}</dd>
              </div>
              <div>
                <dt>{t.tickets.checkout.total}</dt>
                <dd>{order.total === 0 ? c.free : formatXAF(order.total, locale)}</dd>
              </div>
              {(operator || order.payment.method === 'card') && (
                <>
                  <div>
                    <dt>{c.paidWith}</dt>
                    <dd>
                      {operator ? (
                        <>
                          <OperatorBadge id={operator.id} size="sm" /> {formatCmPhone(order.payment.phone)}
                        </>
                      ) : (
                        `${payment.cards.find((x) => x.id === order.payment.brand)?.name ?? t.tickets.checkout.methods.card.name}${
                          order.payment.last4 ? ` •••• ${order.payment.last4}` : ''
                        }`
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>{c.transaction}</dt>
                    <dd className="order-box__tx">{order.payment.transactionId}</dd>
                  </div>
                </>
              )}
            </dl>
            <div className="order-box__actions">
              <Button onClick={() => window.print()} variant="outline" size="sm" iconLeft="printer">
                {c.print}
              </Button>
              <Button href={buildEventIcsHref(t, CONFIG)} download="JCIA-2027.ics" variant="outline" size="sm" iconLeft="calendar">
                {c.calendar}
              </Button>
            </div>
          </Reveal>

          {/* Accès au générateur de flyer — billets payants uniquement */}
          {canGenerateFlyer(order) && (
            <Reveal className="flyer-cta" delay={120}>
              <span className="flyer-cta__badge" aria-hidden="true">
                <Icon name="image" size={26} />
              </span>
              <h2>{c.flyerTitle}</h2>
              <p>{c.flyerText}</p>
              <Button as={Link} to={`${routes.flyer}?order=${order.id}`} size="lg" icon="arrow-right">
                {c.flyerCta}
              </Button>
            </Reveal>
          )}

          <p className="confirmation__another">
            <Link to={routes.tickets}>
              <Icon name="ticket" size={16} /> {c.another}
            </Link>
          </p>
        </aside>
      </div>
    </div>
  )
}
