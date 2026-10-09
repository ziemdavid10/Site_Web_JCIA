import { useId, useState } from 'react'
import { Button, Icon } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { rich } from '@/i18n/rich'
import { fill } from '@/i18n/format'
import { CONFIG } from '@/data/config'
import { formatXAF } from '@/utils/money'
import { estimateFees, isPromotionActive } from '@/utils/tickets'
import { isValidEmail } from '@/security/sanitize'
import { linkTikoraPayment } from '@/services/payment'
import './AwaitingPayment.scss'

/**
 * <AwaitingPayment /> — billet PAYANT, inscription enregistrée : il reste à payer
 * sur la page TIKORA de l'événement.
 *
 *   ✓ inscription (fiche + photo) enregistrée ;
 *   2. payer sur TIKORA AVEC LA MÊME ADRESSE E-MAIL (copiable) ;
 *   3. revenir ici : le paiement est détecté automatiquement (la page interroge
 *      le serveur, qui relit les commandes TIKORA) et le billet se confirme.
 *
 * Paiement fait avec une autre adresse : rattachement par numéro de commande TIKORA.
 * Le même contenu est envoyé par e-mail : la personne peut fermer la page et revenir.
 */
export default function AwaitingPayment({ order, tier, buyerFee, checking, lastCheck, onCheck, onLinked }) {
  const { t, locale } = useI18n()
  const a = t.tickets.awaiting
  const uid = useId()
  const tt = t.tickets.tiers[order.tierId]
  const tikoraName = isPromotionActive() ? fill(a.launchName, { tier: tt.name }) : tt.name
  const fees = estimateFees(order.unitPrice, buyerFee)
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)
  const [number, setNumber] = useState('')
  const [email, setEmail] = useState(order.customer.email)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(order.customer.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      /* presse-papiers indisponible */
    }
  }

  const link = async (e) => {
    e.preventDefault()
    if (busy) return
    if (!/^[A-Za-z0-9][A-Za-z0-9-]{3,39}$/.test(number.trim())) return setError(a.link.errors.number)
    if (!isValidEmail(email)) return setError(a.link.errors.email)
    setBusy(true)
    setError('')
    const res = await linkTikoraPayment(order, { orderNumber: number.trim(), email: email.trim() })
    setBusy(false)
    if (!res.ok) return setError(a.link.errors[res.reason] ?? a.link.errors.server)
    onLinked(res.order)
    return undefined
  }

  // Page de réservation du billet choisi chez TIKORA (sinon : page de l'événement)
  const direct = Boolean(tier?.checkoutUrl)
  const checkoutUrl = tier?.checkoutUrl ?? CONFIG.payment.tikoraEventUrl

  const time = lastCheck ? new Date(lastCheck).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''

  return (
    <div className="container tikora-handoff">
      <section className={`th-card th-card--${tier?.color ?? 'orange'}`} aria-labelledby={`${uid}-title`}>
        <div className="th-card__tier">
          <span className="th-card__icon" aria-hidden="true">
            <Icon name={tier?.icon ?? 'ticket'} size={24} />
          </span>
          <div>
            <p className="th-card__eyebrow">{a.eyebrow}</p>
            <h2 id={`${uid}-title`}>{tt.name}</h2>
          </div>
          <p className="th-card__price">
            <strong>{formatXAF(order.unitPrice, locale)}</strong>
            <small>{fees ? fill(a.fees, { fees: formatXAF(fees, locale) }) : a.feesUnknown}</small>
          </p>
        </div>

        <ol className="th-steps">
          <li className="is-done">
            <span aria-hidden="true">
              <Icon name="check" size={15} />
            </span>
            <div>
              <strong>{a.step1Title}</strong>
              <p>{fill(a.step1Text, { id: order.id })}</p>
            </div>
          </li>
          <li className="is-current">
            <span aria-hidden="true">2</span>
            <div>
              <strong>{a.step2Title}</strong>
              <p>{fill(direct ? a.step2TextDirect : a.step2Text, { category: tikoraName })}</p>
              <div className="th-email">
                <span className="th-email__label">{a.emailLabel}</span>
                <span className="th-email__value">
                  <strong>{order.customer.email}</strong>
                  <button type="button" onClick={copy} aria-label={`${a.copy} — ${order.customer.email}`}>
                    <Icon name={copied ? 'check' : 'copy'} size={15} /> {copied ? a.copied : a.copy}
                  </button>
                </span>
                <small>{a.emailWhy}</small>
              </div>
              <Button href={checkoutUrl} external size="lg" icon="arrow-up-right" className="th-card__cta">
                {a.cta}
              </Button>
              <p className="th-card__note">
                <Icon name="lock" size={14} /> {a.ctaNote}
              </p>
            </div>
          </li>
          <li>
            <span aria-hidden="true">3</span>
            <div>
              <strong>{a.step3Title}</strong>
              <p>{a.step3Text}</p>
              {/* Code du billet (ORD-…) reçu par e-mail de TIKORA : vérifié auprès de TIKORA */}
              <form className="th-code" onSubmit={link} noValidate>
                <label htmlFor={`${uid}-number`}>{a.link.number}</label>
                <div className="th-code__row">
                  <input
                    id={`${uid}-number`}
                    type="text"
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck="false"
                    maxLength={40}
                    placeholder="ORD-XXXXXXXX"
                    value={number}
                    aria-describedby={`${uid}-number-hint`}
                    aria-invalid={error ? true : undefined}
                    onChange={(e) => {
                      setNumber(e.target.value)
                      setError('')
                    }}
                  />
                  <Button type="submit" iconLeft={busy ? 'clock' : 'check'} disabled={busy}>
                    {busy ? a.link.checking : a.link.cta}
                  </Button>
                </div>
                <small id={`${uid}-number-hint`}>{a.link.hint}</small>
                <button type="button" className="th-code__other" aria-expanded={open} aria-controls={`${uid}-email`} onClick={() => setOpen((o) => !o)}>
                  {a.link.toggle}
                  <Icon name="chevron-down" size={15} className={open ? 'is-open' : ''} />
                </button>
                {open && (
                  <div className="th-code__email">
                    <label htmlFor={`${uid}-email`}>{a.link.email}</label>
                    <input
                      id={`${uid}-email`}
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        setError('')
                      }}
                    />
                  </div>
                )}
                {error && (
                  <p className="th-code__error" role="alert">
                    <Icon name="alert" size={15} /> {error}
                  </p>
                )}
              </form>
            </div>
          </li>
        </ol>


        {/* Détection automatique du paiement */}
        <div className="th-watch" role="status" aria-live="polite">
          <span className={`th-watch__dot ${checking ? 'is-checking' : ''}`} aria-hidden="true" />
          <div>
            <strong>{a.watchTitle}</strong>
            <small>{checking ? a.checking : time ? fill(a.lastCheck, { time }) : a.watchText}</small>
          </div>
          <button type="button" onClick={onCheck} disabled={checking}>
            <Icon name="refresh" size={15} /> {a.checkNow}
          </button>
        </div>
      </section>

      <aside className="th-mail" aria-labelledby={`${uid}-mail`}>
        <span className="th-mail__icon" aria-hidden="true">
          <Icon name="mail" size={26} />
        </span>
        <h2 id={`${uid}-mail`}>{a.mailTitle}</h2>
        <p>{rich(fill(a.mailText, { email: order.customer.email }))}</p>
        <ul>
          <li>
            <Icon name="ticket" size={16} /> {a.mailTickets}
          </li>
          <li>
            <Icon name="users" size={16} /> {a.mailForm}
          </li>
          <li>
            <Icon name="star" size={16} /> {a.mailFlyer}
          </li>
        </ul>
        <p className="th-mail__spam">{a.mailSpam}</p>

      </aside>
    </div>
  )
}
