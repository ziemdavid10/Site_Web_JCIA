import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import QRCode from 'qrcode'
import { Button, Frise, Icon, PatternBg, Reveal } from '@/components/ui'
import OperatorBadge from '@/components/tickets/OperatorBadge'
import ParticipantPhotos from '@/components/tickets/ParticipantPhotos'
import { useI18n } from '@/i18n/context'
import { rich } from '@/i18n/rich'
import { fill } from '@/i18n/format'
import { CONFIG } from '@/data/config'
import { formatXAF } from '@/utils/money'
import { formatCmPhone } from '@/utils/phone'
import { buildEventIcsHref } from '@/utils/calendar'
import { canGenerateFlyer, getOrder, isConfirmed, saveServerOrder } from '@/services/orders'
import { receiptFallbackHref, requestOrderReceipt } from '@/services/email'
import { fetchServerOrder } from '@/services/payment'
import useDocumentMeta from '@/hooks/useDocumentMeta'
import logoWhite from '@/assets/images/brand/logo-jcia-white-sm.webp'
import './ConfirmationPage.scss'

/**
 * Génère les QR codes des billets (un par participant). Le QR encode le jeton
 * officiel émis par TIKORA (ou, pour un billet gratuit, le jeton signé par le
 * serveur JCIA) — c'est lui qui est vérifié au contrôle d'accès. Tant que le
 * serveur ne les a pas transmis, aucun QR n'est affiché.
 * Le QR est dessiné dans le navigateur (data:), aucune image externe chargée.
 */
function qrPayloads(order) {
  return order.tickets?.length ? order.tickets.map((t) => t.qrToken) : []
}

function useTicketQrCodes(order) {
  const [codes, setCodes] = useState([])

  useEffect(() => {
    if (!order) return undefined
    let cancelled = false
    Promise.all(
      qrPayloads(order).map((payload) =>
        QRCode.toDataURL(payload, {
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
const RECEIPT_ICON = { sending: 'clock', sent: 'mail', queued: 'mail', failed: 'alert' }

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
 * Relit la commande sur le serveur (statut, frais, billets
 * officiels) grâce au jeton d'accès — celui gardé sur l'appareil, ou celui du
 * lien reçu par e-mail (#t=…, retiré aussitôt de la barre d'adresse). Tant que
 * le paiement est en attente de confirmation, la lecture est répétée.
 */
const hashToken = () => new URLSearchParams(window.location.hash.slice(1)).get('t') || ''

function useServerOrder(orderId) {
  const [order, setOrder] = useState(() => getOrder(orderId))
  // Jeton du lien e-mail lu UNE fois (le fragment est ensuite effacé de l'URL)
  const [linkToken] = useState(hashToken)
  const [loading, setLoading] = useState(() => Boolean(linkToken))

  useEffect(() => {
    if (hashToken()) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
    const token = linkToken || getOrder(orderId)?.accessToken
    if (!token) return undefined

    let alive = true
    let timer
    const deadline = Date.now() + 15 * 60 * 1000
    const tick = async () => {
      const server = await fetchServerOrder(orderId, token)
      if (!alive) return
      const saved = server ? saveServerOrder(server, token) : null
      if (saved) setOrder(saved)
      setLoading(false)
      const status = saved?.payment.status ?? getOrder(orderId)?.payment.status
      const needsTickets = saved && isConfirmed(saved) && !saved.tickets.length
      if ((status === 'pending' || needsTickets) && Date.now() < deadline) timer = setTimeout(tick, 5000)
    }
    tick()
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [orderId, linkToken])

  return [order, loading]
}

/**
 * <ConfirmationPage /> — commande confirmée : billets électroniques (QR code),
 * détails du paiement, ajout à l'agenda, impression, photo de participant et
 * accès au visuel « J'y serai » (tous billets, gratuits compris).
 */
export default function ConfirmationPage() {
  const { t, locale } = useI18n()
  const c = t.tickets.confirmation
  const { orderId } = useParams()
  const [order, loading] = useServerOrder(orderId)
  const codes = useTicketQrCodes(isConfirmed(order) ? order : null)
  const [receipt, retryReceipt] = useOrderReceipt(isConfirmed(order) ? order : null)
  const { routes, payment } = CONFIG
  useDocumentMeta(`${c.title} | ${t.event.shortName}`, { noindex: true })

  // --- Lecture en cours depuis le lien du reçu ----------------------------------------
  if (!order && loading) {
    return (
      <div className="confirmation confirmation--missing">
        <div className="container confirmation__missing">
          <span className="confirmation__missing-icon">
            <Icon name="clock" size={34} />
          </span>
          <h1>{c.receipt.sending}</h1>
        </div>
      </div>
    )
  }

  // --- Paiement en attente de confirmation ou refusé ------------------------------------
  if (order && !isConfirmed(order) && ['pending', 'failed'].includes(order.payment.status)) {
    const pending = order.payment.status === 'pending'
    return (
      <div className="confirmation confirmation--missing">
        <div className="container confirmation__missing" aria-live="polite">
          <span className="confirmation__missing-icon">
            <Icon name={pending ? 'clock' : 'alert'} size={34} />
          </span>
          <h1>{pending ? c.pendingTitle : c.failedTitle}</h1>
          <p>{pending ? c.pendingText : (t.tickets.payment.reasons[order.payment.reason] ?? c.failedText)}</p>
          <p className="confirmation__pending-id">
            {c.order} : <strong>{order.id}</strong>
          </p>
          <div className="confirmation__missing-actions">
            <Button as={Link} to={routes.tickets} iconLeft="ticket" variant={pending ? 'outline' : undefined}>
              {t.tickets.checkout.back}
            </Button>
            <Button href={`mailto:${CONFIG.contact.emails[0]}?subject=${encodeURIComponent(order.id)}`} variant="outline" iconLeft="mail">
              {CONFIG.contact.emails[0]}
            </Button>
          </div>
        </div>
      </div>
    )
  }

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
  // Mobile Money : l'opérateur débité
  const operator = payment.operators.find((o) => o.id === order.payment.operator)
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

          {/* État réel de l'envoi du récapitulatif : on n'annonce « envoyé »
              que lorsque le serveur l'a confirmé. */}
          <p className={`confirmation__receipt is-${receipt ?? 'sending'}`} aria-live="polite">
            <Icon name={RECEIPT_ICON[receipt] ?? 'clock'} size={16} />
            <span>
              {receipt === 'failed'
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
                <p className="e-ticket__id">{order.tickets?.[i]?.code || order.id}</p>
                {order.tickets?.[i] && <p className="e-ticket__official">{c.official}</p>}
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
              {order.payment.fees > 0 && (
                <div>
                  <dt>{c.fees}</dt>
                  <dd>{formatXAF(order.payment.fees, locale)}</dd>
                </div>
              )}
              <div>
                <dt>{t.tickets.checkout.total}</dt>
                <dd>{order.total === 0 ? c.free : formatXAF(order.payment.amountPaid ?? order.total, locale)}</dd>
              </div>
              {operator && (
                <>
                  <div>
                    <dt>{c.paidWith}</dt>
                    <dd>
                      <OperatorBadge id={operator.id} size="sm" /> {order.payment.phone ? formatCmPhone(order.payment.phone) : ''}
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

          {/* Photo(s) de participant : fiche de la liste publique et visuel « J'y serai » */}
          <Reveal delay={60}>
            <ParticipantPhotos order={order} />
          </Reveal>

          {/* Visuel « J'y serai » — tous les billets confirmés, gratuits compris */}
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
