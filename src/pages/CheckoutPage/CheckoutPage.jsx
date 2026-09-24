import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button, Frise, Icon, PatternBg } from '@/components/ui'
import OperatorBadge from '@/components/tickets/OperatorBadge'
import PaymentDialog from '@/components/tickets/PaymentDialog'
import { useI18n } from '@/i18n/context'
import { rich } from '@/i18n/rich'
import { fill } from '@/i18n/format'
import { CONFIG } from '@/data/config'
import { formatXAF } from '@/utils/money'
import { formatSeats, isSoldOut, maxQuantity } from '@/utils/tickets'
import { detectOperator, formatCmPhone, isValidCmPhone, normalizePhone } from '@/utils/phone'
import { newOrderId, saveOrder } from '@/services/orders'
import { cleanText, isValidEmail, isValidPersonName } from '@/security/sanitize'
import { PAYMENT_MODE, processPayment } from '@/services/payment'
import useDocumentMeta from '@/hooks/useDocumentMeta'
import logoColor from '@/assets/images/brand/logo-jcia-sm.webp'
import './CheckoutPage.scss'

// Sécurité : longueurs maximales des champs (limitent les abus et les erreurs)
const MAX = { name: 80, email: 254, phone: 20, org: 120 }
// Après 3 paiements échoués, pause de 60 s avant un nouvel essai (anti-abus)
const MAX_FAILURES = 3
const COOLDOWN_MS = 60_000

/**
 * Secondes restantes avant la fin de la pause anti-abus (0 si elle est terminée).
 * Défini hors du composant : l'horloge est lue au moment du clic, jamais pendant
 * le rendu (règle « composants purs » de React).
 */
const cooldownLeft = (until) => Math.max(0, Math.ceil((until - Date.now()) / 1000))

/** Instant (timestamp) de fin de la pause anti-abus, à partir de maintenant. */
const cooldownEnd = () => Date.now() + COOLDOWN_MS

/** Copie d'un objet sans l'une de ses clés (efface une erreur de validation). */
const omit = (obj, key) => {
  const next = { ...obj }
  delete next[key]
  return next
}

/** Champ de formulaire : libellé, aide, message d'erreur reliés au contrôle (a11y). */
function Field({ id, label, hint, error, children, className = '' }) {
  return (
    <div className={`co-field ${error ? 'has-error' : ''} ${className}`.trim()}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error && (
        <small id={`${id}-hint`} className="co-field__hint">
          {hint}
        </small>
      )}
      {error && (
        <small id={`${id}-error`} className="co-field__error" role="alert">
          <Icon name="alert" size={14} /> {error}
        </small>
      )}
    </div>
  )
}

/** Props ARIA d'un contrôle selon son état d'erreur */
const aria = (id, error, hint) => ({
  'aria-invalid': error ? true : undefined,
  'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
})

/**
 * <CheckoutPage /> — commande d'un billet (inspirée du parcours Reckot).
 *
 *   1. Billet     : choix du tarif (présélectionné par l'URL) et de la quantité ;
 *   2. Informations : acheteur, puis nom des autres participants ;
 *   3. Paiement   : opérateur (détecté d'après le numéro) et numéro à débiter.
 *
 * Un récapitulatif reste visible (colonne collante sur desktop, barre fixe en
 * bas d'écran sur mobile). Le paiement est suivi dans <PaymentDialog /> ; une
 * fois confirmé, la commande est enregistrée et l'utilisateur est redirigé
 * vers la confirmation (billet + accès au générateur de flyer).
 */
export default function CheckoutPage() {
  const { t, lang, locale } = useI18n()
  const c = t.tickets.checkout
  const navigate = useNavigate()
  const { tierId = 'standard' } = useParams()
  const { tickets, routes, payment } = CONFIG
  const tier = tickets.tiers.find((x) => x.id === tierId)
  const uid = useId()
  const formRef = useRef(null)
  const alive = useRef(true)

  // --- État du formulaire -----------------------------------------------------------
  const [quantity, setQuantity] = useState(1)
  const [values, setValues] = useState({ name: '', email: '', phone: '', org: '', school: '' })
  const [attendees, setAttendees] = useState([])
  const [operatorId, setOperatorId] = useState(null) // choix explicite de l'utilisateur
  const [samePhone, setSamePhone] = useState(true)
  const [payPhone, setPayPhone] = useState('')
  const [terms, setTerms] = useState(false)
  const [errors, setErrors] = useState({})
  const [pay, setPay] = useState(null) // { order, status: 'running'|'failed', step }
  const [honeypot, setHoneypot] = useState('') // champ invisible : rempli uniquement par les robots
  const [lockedUntil, setLockedUntil] = useState(0)
  const failures = useRef(0)
  const submitting = useRef(false) // empêche un double envoi (double clic)

  useDocumentMeta(`${c.title} | ${t.event.shortName}`)
  // Évite de mettre à jour l'état après avoir quitté la page (paiement en cours)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  // --- Valeurs dérivées -----------------------------------------------------------------
  const maxQty = tier ? maxQuantity(tier) : 1 // plafond par commande ET stock restant
  const qty = tier ? Math.min(quantity, maxQty) : 1
  const isFree = tier?.price === 0
  const isStudent = tier?.id === 'etudiant'
  const total = tier ? tier.price * qty : 0
  const amount = formatXAF(total, locale)
  const effectivePayPhone = samePhone ? values.phone : payPhone
  const detected = detectOperator(effectivePayPhone)
  const operator = payment.operators.find((o) => o.id === (operatorId ?? detected?.id)) ?? null
  const mismatch = operatorId && detected && detected.id !== operatorId
  const extraAttendees = Array.from({ length: qty - 1 }, (_, i) => attendees[i] ?? '')

  const setField = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }))
    if (errors[key]) setErrors((errs) => omit(errs, key))
  }

  const changeTier = (id) => {
    const next = tickets.tiers.find((x) => x.id === id)
    if (next) setQuantity((q) => Math.min(q, maxQuantity(next)))
    navigate(`${routes.checkout}/${id}`, { replace: true })
  }

  // --- Validation -------------------------------------------------------------------------
  const validate = () => {
    const e = {}
    if (!isValidPersonName(values.name)) e.name = c.errors.name
    if (!isValidEmail(values.email)) e.email = c.errors.email
    if (!isValidCmPhone(values.phone)) e.phone = c.errors.phone
    if (isStudent && values.school.trim().length < 2) e.school = c.errors.school
    extraAttendees.forEach((a, i) => {
      if (!isValidPersonName(a)) e[`attendee-${i}`] = c.errors.attendee
    })
    if (!isFree) {
      if (!operator) e.operator = c.errors.operator
      if (!samePhone && !isValidCmPhone(payPhone)) e.payPhone = c.errors.payPhone
    }
    if (!terms) e.terms = c.errors.terms
    return e
  }

  // --- Paiement -----------------------------------------------------------------------------
  const runPayment = async (order) => {
    setPay({ order, status: 'running', step: 'initiating' })
    let result
    try {
      result = await processPayment(
        {
          orderId: order.id,
          amount: order.total,
          currency: order.currency,
          operator: order.payment.operator,
          phone: order.payment.phone,
          customer: order.customer,
          description: `JCIA 2027 — ${order.tierId} × ${order.quantity}`,
        },
        (step) => alive.current && setPay((p) => (p ? { ...p, step } : p)),
      )
    } catch {
      result = { status: 'FAILED', reason: 'network' }
    }
    if (!alive.current) return

    submitting.current = false
    if (result.status === 'SUCCESSFUL') {
      failures.current = 0
      const paid = saveOrder({
        ...order,
        payment: { ...order.payment, status: 'paid', transactionId: result.transactionId, paidAt: new Date().toISOString(), mode: result.mode },
      })
      navigate(`${routes.confirmation}/${paid.id}`)
    } else {
      saveOrder({ ...order, payment: { ...order.payment, status: 'failed', reason: result.reason } })
      setPay((p) => ({ ...p, status: 'failed' }))
      failures.current += 1
      if (failures.current >= MAX_FAILURES) {
        failures.current = 0
        setLockedUntil(cooldownEnd())
      }
    }
  }

  const onSubmit = (e) => {
    e.preventDefault()
    if (submitting.current || pay?.status === 'running') return
    if (honeypot) return // robot détecté : on ne fait rien
    const wait = cooldownLeft(lockedUntil)
    if (wait > 0) {
      setErrors({ summary: fill(c.errors.tooMany, { s: wait }) })
      return
    }
    if (isSoldOut(tier)) {
      setErrors({ summary: t.tickets.page.soldOutNote })
      return
    }
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length) {
      // Focus sur le premier champ en erreur
      requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus())
      return
    }

    const order = {
      id: newOrderId(),
      createdAt: new Date().toISOString(),
      lang,
      tierId: tier.id,
      quantity: qty,
      unitPrice: tier.price,
      total,
      currency: tickets.currency,
      // Textes nettoyés (caractères invisibles retirés, longueur limitée)
      customer: {
        name: cleanText(values.name, MAX.name),
        email: cleanText(values.email, MAX.email),
        phone: normalizePhone(values.phone),
        org: cleanText(isStudent ? values.school : values.org, MAX.org),
      },
      attendees: [cleanText(values.name, MAX.name), ...extraAttendees.map((a) => cleanText(a, MAX.name))],
      payment: isFree
        ? { status: 'free', mode: PAYMENT_MODE }
        : { status: 'pending', operator: operator.id, phone: normalizePhone(effectivePayPhone), mode: PAYMENT_MODE },
    }

    submitting.current = true
    if (isFree) {
      saveOrder(order)
      navigate(`${routes.confirmation}/${order.id}`)
    } else {
      runPayment(order)
    }
  }

  // --- Billet inconnu ------------------------------------------------------------------------
  if (!tier) {
    return (
      <div className="checkout checkout--empty">
        <div className="container checkout__unknown">
          <Icon name="ticket" size={40} />
          <h1>{c.unknownTier}</h1>
          <Button as={Link} to={routes.tickets} iconLeft="arrow-left">
            {c.back}
          </Button>
        </div>
      </div>
    )
  }

  const tt = t.tickets.tiers[tier.id]
  const errorCount = Object.keys(errors).length
  const e = t.event
  const submitLabel = isFree ? c.confirmFree : fill(c.pay, { amount })
  const buyerDone = isValidPersonName(values.name) && isValidEmail(values.email) && isValidCmPhone(values.phone)
  const stepState = (i) => (i === 0 || (i === 1 && buyerDone) ? 'done' : (i === 1 && !buyerDone) || (i === 2 && buyerDone) ? 'active' : 'todo')

  return (
    <div className="checkout">
      {/* --- En-tête : carte de l'événement ------------------------------------------ */}
      <header className="checkout__hero">
        <PatternBg variant="circuit" color="currentColor" opacity={0.06} fade="radial" />
        <div className="container checkout__hero-inner">
          <Link to={routes.tickets} className="checkout__back">
            <Icon name="arrow-left" size={18} /> {c.back}
          </Link>
          <div className="event-card">
            <div className="event-card__logo">
              <img src={logoColor} alt="" width="120" height="50" />
            </div>
            <div>
              <h1 className="event-card__title">
                {e.shortName} — {e.name}
              </h1>
              <ul className="event-card__meta">
                <li>
                  <Icon name="calendar" size={16} /> {e.dateLabel}
                </li>
                <li>
                  <Icon name="pin" size={16} /> {e.venue.name}, {e.venue.city}
                </li>
                <li>
                  <Icon name="building" size={16} /> {c.organizer}
                </li>
              </ul>
            </div>
          </div>

          {/* Étapes */}
          <ol className="co-stepper" aria-label={c.title}>
            {c.steps.map((s, i) => (
              <li key={s} className={`is-${stepState(i)}`}>
                <span aria-hidden="true">{stepState(i) === 'done' ? <Icon name="check" size={14} /> : i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </div>
        <Frise height={12} />
      </header>

      <div className="container checkout__grid">
        <form id="checkout-form" ref={formRef} className="checkout__form" onSubmit={onSubmit} noValidate>
          {PAYMENT_MODE === 'demo' && !isFree && (
            <p className="co-demo">
              <Icon name="info" size={18} />
              <span>{rich(c.demo)}</span>
            </p>
          )}

          {/* Pot de miel anti-robots : invisible et ignoré par les humains et les lecteurs d'écran */}
          <div className="co-hp" aria-hidden="true">
            <label htmlFor={`${uid}-website`}>Website</label>
            <input
              id={`${uid}-website`}
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(ev) => setHoneypot(ev.target.value)}
            />
          </div>

          {errorCount > 0 && (
            <p className="co-summary-error" role="alert">
              <Icon name="alert" size={18} /> {errors.summary ?? c.errors.summary}
            </p>
          )}

          {/* --- 1. Billet ------------------------------------------------------------- */}
          <fieldset className="co-block">
            <legend className="co-block__title">
              <span>1</span> {c.ticketTitle}
            </legend>
            <div className="co-tiers" role="radiogroup" aria-label={c.ticketTitle}>
              {tickets.tiers.map((x) => {
                const checked = x.id === tier.id
                const out = isSoldOut(x)
                return (
                  <label
                    key={x.id}
                    className={`co-tier co-tier--${x.color} ${checked ? 'is-checked' : ''} ${out ? 'is-sold-out' : ''}`}
                  >
                    <input
                      type="radio"
                      name="tier"
                      value={x.id}
                      checked={checked}
                      disabled={out}
                      onChange={() => changeTier(x.id)}
                    />
                    <span className="co-tier__radio" aria-hidden="true" />
                    <span className="co-tier__body">
                      <strong>{t.tickets.tiers[x.id].name}</strong>
                      <small>{t.tickets.tiers[x.id].tagline}</small>
                    </span>
                    <span className="co-tier__price">
                      {out ? t.tickets.page.soldOut : formatXAF(x.price, locale)}
                    </span>
                  </label>
                )
              })}
            </div>

            {tt.note && (
              <p className="co-note">
                <Icon name="info" size={16} /> {tt.note}
              </p>
            )}

            <div className="co-qty">
              <span id={`${uid}-qty`}>{c.quantity}</span>
              <div className="co-qty__stepper" role="group" aria-labelledby={`${uid}-qty`}>
                <button
                  type="button"
                  aria-label={c.decrease}
                  disabled={qty <= 1}
                  onClick={() => setQuantity(Math.max(1, qty - 1))}
                >
                  <Icon name="minus" size={18} />
                </button>
                <output aria-live="polite">{qty}</output>
                <button
                  type="button"
                  aria-label={c.increase}
                  disabled={qty >= maxQty}
                  onClick={() => setQuantity(Math.min(maxQty, qty + 1))}
                >
                  <Icon name="plus" size={18} />
                </button>
              </div>
              {qty >= maxQty && maxQty > 1 && <small>{c.maxReached}</small>}
              <small className="co-qty__stock">
                <Icon name="ticket" size={14} />
                {fill(t.tickets.page.quota, { n: formatSeats(tier.quota, locale) })}
              </small>
            </div>
          </fieldset>

          {/* --- 2. Informations ----------------------------------------------------------- */}
          <fieldset className="co-block">
            <legend className="co-block__title">
              <span>2</span> {c.buyerTitle}
            </legend>
            <div className="co-row">
              <Field id={`${uid}-name`} label={c.fields.name} error={errors.name}>
                <input
                  id={`${uid}-name`}
                  type="text"
                  autoComplete="name"
                  maxLength={MAX.name}
                  value={values.name}
                  onChange={setField('name')}
                  {...aria(`${uid}-name`, errors.name)}
                />
              </Field>
              <Field id={`${uid}-email`} label={c.fields.email} hint={c.fields.emailHint} error={errors.email}>
                <input
                  id={`${uid}-email`}
                  type="email"
                  maxLength={MAX.email}
                  autoComplete="email"
                  inputMode="email"
                  value={values.email}
                  onChange={setField('email')}
                  {...aria(`${uid}-email`, errors.email, true)}
                />
              </Field>
            </div>
            <div className="co-row">
              <Field id={`${uid}-phone`} label={c.fields.phone} error={errors.phone}>
                <div className="co-phone">
                  <span aria-hidden="true">+237</span>
                  <input
                    id={`${uid}-phone`}
                    type="tel"
                    autoComplete="tel-national"
                    maxLength={MAX.phone}
                    inputMode="tel"
                    placeholder="6XX XX XX XX"
                    value={values.phone}
                    onChange={setField('phone')}
                    {...aria(`${uid}-phone`, errors.phone)}
                  />
                </div>
              </Field>
              {isStudent ? (
                <Field id={`${uid}-school`} label={c.fields.school} error={errors.school}>
                  <input
                    id={`${uid}-school`}
                    type="text"
                    autoComplete="organization"
                    maxLength={MAX.org}
                    value={values.school}
                    onChange={setField('school')}
                    {...aria(`${uid}-school`, errors.school)}
                  />
                </Field>
              ) : (
                <Field id={`${uid}-org`} label={c.fields.org}>
                  <input
                    id={`${uid}-org`}
                    type="text"
                    autoComplete="organization"
                    maxLength={MAX.org}
                    value={values.org}
                    onChange={setField('org')}
                  />
                </Field>
              )}
            </div>

            {extraAttendees.length > 0 && (
              <div className="co-attendees">
                <p className="co-attendees__title">{c.attendeesTitle}</p>
                <p className="co-attendees__hint">{c.attendeesHint}</p>
                <div className="co-row">
                  {extraAttendees.map((a, i) => {
                    const id = `${uid}-att-${i}`
                    const err = errors[`attendee-${i}`]
                    return (
                      <Field key={id} id={id} label={`${c.attendee} ${i + 2} *`} error={err}>
                        <input
                          id={id}
                          maxLength={MAX.name}
                          type="text"
                          value={a}
                          onChange={(ev) => {
                            const next = [...extraAttendees]
                            next[i] = ev.target.value
                            setAttendees(next)
                          }}
                          {...aria(id, err)}
                        />
                      </Field>
                    )
                  })}
                </div>
              </div>
            )}
          </fieldset>

          {/* --- 3. Paiement ----------------------------------------------------------------- */}
          <fieldset className="co-block">
            <legend className="co-block__title">
              <span>3</span> {c.paymentTitle}
            </legend>

            {isFree ? (
              <p className="co-free">
                <Icon name="check" size={18} /> {c.freeInfo}
              </p>
            ) : (
              <>
                <p className="co-label" id={`${uid}-op`}>
                  {c.operatorLabel}
                </p>
                <div
                  className={`co-operators ${errors.operator ? 'has-error' : ''}`}
                  role="radiogroup"
                  aria-labelledby={`${uid}-op`}
                >
                  {payment.operators.map((op) => {
                    const checked = operator?.id === op.id
                    return (
                      <label
                        key={op.id}
                        className={`co-operator ${checked ? 'is-checked' : ''}`}
                        style={{ '--op-bg': op.color }}
                      >
                        <input
                          type="radio"
                          name="operator"
                          value={op.id}
                          checked={checked}
                          onChange={() => {
                            setOperatorId(op.id)
                            setErrors((errs) => omit(errs, 'operator'))
                          }}
                          aria-invalid={errors.operator ? true : undefined}
                        />
                        <OperatorBadge id={op.id} />
                        <Icon name="check" size={18} className="co-operator__check" />
                      </label>
                    )
                  })}
                </div>
                {errors.operator && (
                  <small className="co-field__error" role="alert">
                    <Icon name="alert" size={14} /> {errors.operator}
                  </small>
                )}

                <label className="co-check">
                  <input type="checkbox" checked={samePhone} onChange={(ev) => setSamePhone(ev.target.checked)} />
                  <span>{c.samePhone}</span>
                </label>

                {!samePhone && (
                  <Field id={`${uid}-pay`} label={c.payPhone} error={errors.payPhone}>
                    <div className="co-phone">
                      <span aria-hidden="true">+237</span>
                      <input
                        id={`${uid}-pay`}
                        maxLength={MAX.phone}
                        type="tel"
                        inputMode="tel"
                        placeholder="6XX XX XX XX"
                        value={payPhone}
                        onChange={(ev) => setPayPhone(ev.target.value)}
                        {...aria(`${uid}-pay`, errors.payPhone)}
                      />
                    </div>
                  </Field>
                )}

                {/* Retour sur le numéro saisi : opérateur détecté ou incohérence */}
                {detected && !mismatch && isValidCmPhone(effectivePayPhone) && (
                  <p className="co-detect">
                    <Icon name="check" size={16} /> {fill(c.detected, { op: detected.name })} ·{' '}
                    {formatCmPhone(effectivePayPhone)}
                  </p>
                )}
                {mismatch && (
                  <p className="co-detect co-detect--warn" role="status">
                    <Icon name="alert" size={16} /> {fill(c.mismatch, { op: detected.name })}
                  </p>
                )}

                <p className="co-secure">
                  <Icon name="lock" size={16} /> {c.secure}
                </p>
              </>
            )}

            <label className={`co-check co-check--terms ${errors.terms ? 'has-error' : ''}`}>
              <input
                type="checkbox"
                checked={terms}
                onChange={(ev) => {
                  setTerms(ev.target.checked)
                  setErrors((errs) => omit(errs, 'terms'))
                }}
                aria-invalid={errors.terms ? true : undefined}
              />
              <span>{rich(c.terms, { newTab: true })}</span>
            </label>
            {errors.terms && (
              <small className="co-field__error" role="alert">
                <Icon name="alert" size={14} /> {errors.terms}
              </small>
            )}
          </fieldset>
        </form>

        {/* --- Récapitulatif ------------------------------------------------------------------ */}
        <aside className="co-summary" aria-labelledby={`${uid}-sum`}>
          <h2 id={`${uid}-sum`}>{c.summaryTitle}</h2>
          <div className={`co-summary__ticket co-summary__ticket--${tier.color}`}>
            <Icon name={tier.icon} size={22} />
            <div>
              <strong>{tt.name}</strong>
              <small>
                {qty} × {isFree ? t.tickets.page.free : formatXAF(tier.price, locale)}
              </small>
            </div>
          </div>
          <dl>
            <div>
              <dt>{c.subtotal}</dt>
              <dd>{amount}</dd>
            </div>
            <div>
              <dt>{c.fees}</dt>
              <dd>{c.feesValue}</dd>
            </div>
            <div className="co-summary__total">
              <dt>{c.total}</dt>
              <dd>{isFree ? t.tickets.page.free : amount}</dd>
            </div>
          </dl>
          <Button type="submit" form="checkout-form" size="lg" icon={isFree ? 'check' : 'lock'} className="co-summary__submit">
            {submitLabel}
          </Button>
          {!isFree && (
            <div className="co-summary__ops">
              {payment.operators.map((op) => (
                <OperatorBadge key={op.id} id={op.id} size="sm" />
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* Barre d'action fixe (téléphone / tablette) */}
      <div className="co-bar">
        <div>
          <small>{c.total}</small>
          <strong>{isFree ? t.tickets.page.free : amount}</strong>
        </div>
        <Button type="submit" form="checkout-form" icon={isFree ? 'check' : 'lock'}>
          {isFree ? c.confirmFree : fill(c.pay, { amount: '' }).trim()}
        </Button>
      </div>

      {pay && (
        <PaymentDialog
          status={pay.status}
          step={pay.step}
          amount={formatXAF(pay.order.total, locale)}
          phone={formatCmPhone(pay.order.payment.phone)}
          operator={payment.operators.find((o) => o.id === pay.order.payment.operator)}
          demo={pay.order.payment.mode === 'demo'}
          onRetry={() => {
            // Trop d'échecs : on referme et on affiche le délai d'attente
            const left = cooldownLeft(lockedUntil)
            if (left > 0) {
              setPay(null)
              setErrors({ summary: fill(c.errors.tooMany, { s: left }) })
              return
            }
            runPayment({ ...pay.order, payment: { ...pay.order.payment, status: 'pending' } })
          }}
          onClose={() => setPay(null)}
        />
      )}
    </div>
  )
}
