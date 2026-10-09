import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button, Frise, Icon, PatternBg } from '@/components/ui'
import OperatorBadge from '@/components/tickets/OperatorBadge'
import PhotoEditorDialog from '@/components/tickets/PhotoEditorDialog'
import VisualPreview from '@/components/tickets/VisualPreview'
import { useI18n } from '@/i18n/context'
import { rich } from '@/i18n/rich'
import { fill } from '@/i18n/format'
import { CONFIG } from '@/data/config'
import { formatXAF } from '@/utils/money'
import { estimateFees, formatSeats, getTicketPricing, isSoldOut, isUnlimitedQuota } from '@/utils/tickets'
import { isValidWhatsapp, normalizeWhatsapp } from '@/utils/phone'
import { newOrderId, saveOrder, setOrderPhoto } from '@/services/orders'
import { saveAttendeePhoto } from '@/services/photos'
import { cleanText, isValidEmail, isValidNamePart } from '@/security/sanitize'
import { registerFreeOrder, registerPaidOrder } from '@/services/payment'
import useTicketCatalog, { tierAvailability } from '@/hooks/useTicketCatalog'
import useDocumentMeta from '@/hooks/useDocumentMeta'
import logoColor from '@/assets/images/brand/logo-jcia-sm.webp'
import './CheckoutPage.scss'

// Sécurité : longueurs maximales des champs (limitent les abus et les erreurs)
const MAX = { part: 40, email: 254, phone: 22, org: 120, role: 80 }
const FIELDS = ['firstName', 'lastName', 'email', 'whatsapp', 'org', 'role']

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

/** Photo recadrée (Blob) + URL d'aperçu, libérée quand la photo change. */
function usePhotoBlob() {
  const [photo, setPhoto] = useState(null) // { blob, url }
  useEffect(() => () => photo && URL.revokeObjectURL(photo.url), [photo])
  const set = (blob) => setPhoto(blob ? { blob, url: URL.createObjectURL(blob) } : null)
  return [photo, set]
}

/**
 * <CheckoutPage /> — inscription, LE MÊME PARCOURS POUR TOUS LES BILLETS :
 *
 *   1. Billet          : choix du tarif (présélectionné par l'URL) ;
 *   2. Vos informations : prénom, nom, e-mail, WhatsApp, organisation / établissement, rôle ;
 *   3. Votre photo      : recadrée dans le navigateur (repère rond du visuel) ;
 *   4. Confirmation    : gratuit → présence confirmée ;
 *                        payant  → inscription enregistrée, puis paiement sur la page
 *                        TIKORA de l'événement (même adresse e-mail) : le site retrouve
 *                        le paiement et confirme le billet tout seul.
 *
 * Ces informations alimentent directement le visuel « J'y serai » (aperçu en direct
 * dans le récapitulatif) et la liste publique des participants (si la personne
 * l'accepte). Une inscription = un participant : chacun a sa photo et son visuel.
 */
export default function CheckoutPage() {
  const { t, lang, locale } = useI18n()
  const c = t.tickets.checkout
  const navigate = useNavigate()
  const { tierId = 'standard' } = useParams()
  const { tickets, routes, payment } = CONFIG
  // Tarifs locaux + stock réel, frais et ouverture de la vente renvoyés par le serveur
  const catalog = useTicketCatalog()
  const tiersList = catalog.tiers
  const requestedTierId = tierId === 'professionnel' ? 'vip' : tierId // compatibilité avec les anciens liens
  const tier = tiersList.find((x) => x.id === requestedTierId)
  const uid = useId()
  const formRef = useRef(null)
  const alive = useRef(true)

  // --- État du formulaire -----------------------------------------------------------
  const [values, setValues] = useState({ firstName: '', lastName: '', email: '', whatsapp: '', org: '', role: '' })
  const [touched, setTouched] = useState({})
  const [photo, setPhoto] = usePhotoBlob()
  const [editingPhoto, setEditingPhoto] = useState(false)
  const [terms, setTerms] = useState(true) // case cochée par défaut : la personne peut la décocher
  const [listed, setListed] = useState(true) // case proposée cochée : la personne peut la décocher
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState('') // '' | 'saving' | 'photo'
  const [honeypot, setHoneypot] = useState('') // champ invisible : rempli uniquement par les robots
  const submitting = useRef(false) // empêche un double envoi (double clic)

  useDocumentMeta(`${c.title} | ${t.event.shortName}`)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  // --- Valeurs dérivées -----------------------------------------------------------------
  const pricing = tier ? getTicketPricing(tier) : { originalPrice: 0, price: 0, discounted: false, discountPercent: 0 }
  const unitPrice = pricing.price
  const isFree = unitPrice === 0
  const isStudent = tier?.id === 'etudiant'
  // Inscription possible ? (serveur joignable, vente ouverte, places restantes)
  const availability = tier ? tierAvailability(tier, catalog) : 'unavailable'
  const availabilityMessage = {
    soldout: t.tickets.page.soldOutNote,
    soon: c.soonText,
    unavailable: c.unavailableText,
    loading: c.checking,
  }[availability]
  const fees = isFree ? 0 : estimateFees(unitPrice, catalog.buyerFee) // frais de service TIKORA (indicatifs)
  const grandTotal = unitPrice + fees
  const labels = { ...c.fields, ...(isStudent ? c.fieldsStudent : {}) }

  // Validation champ par champ (affichée dès qu'un champ a été quitté)
  const check = {
    firstName: (v) => isValidNamePart(v) || c.errors.firstName,
    lastName: (v) => isValidNamePart(v) || c.errors.lastName,
    email: (v) => isValidEmail(v) || c.errors.email,
    whatsapp: (v) => isValidWhatsapp(v) || c.errors.whatsapp,
    org: (v) => cleanText(v, MAX.org).length >= 2 || (isStudent ? c.errors.school : c.errors.org),
    role: (v) => cleanText(v, MAX.role).length >= 2 || (isStudent ? c.errors.level : c.errors.role),
  }
  const fieldError = (key) => {
    const r = check[key](values[key])
    return r === true ? undefined : r
  }
  const infoDone = FIELDS.every((k) => !fieldError(k))
  const errorOf = (key) => errors[key] ?? (touched[key] ? fieldError(key) : undefined)

  const setField = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }))
    if (errors[key]) setErrors((errs) => omit(errs, key))
  }
  const blur = (key) => () => values[key] && setTouched((x) => ({ ...x, [key]: true }))

  const changeTier = (id) => navigate(`${routes.checkout}/${id}`, { replace: true })

  // --- Validation -------------------------------------------------------------------------
  const validate = () => {
    const e = {}
    FIELDS.forEach((k) => {
      const err = fieldError(k)
      if (err) e[k] = err
    })
    if (!photo) e.photo = c.errors.photo
    if (!terms) e.terms = c.errors.terms
    return e
  }

  // --- Envoi --------------------------------------------------------------------------------
  const onSubmit = async (e) => {
    e.preventDefault()
    if (submitting.current) return
    if (honeypot) return // robot détecté : on ne fait rien
    if (availability !== 'open') {
      setErrors({ summary: availabilityMessage })
      return
    }
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length) {
      // Focus sur le premier champ en erreur
      requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus())
      return
    }

    const firstName = cleanText(values.firstName, MAX.part)
    const lastName = cleanText(values.lastName, MAX.part)
    const name = `${firstName} ${lastName}`
    const order = {
      id: newOrderId(),
      createdAt: new Date().toISOString(),
      lang,
      tierId: tier.id,
      quantity: 1,
      unitPrice,
      total: unitPrice,
      currency: tickets.currency,
      // Textes nettoyés (caractères invisibles retirés, longueur limitée)
      customer: {
        name,
        firstName,
        lastName,
        email: cleanText(values.email, MAX.email),
        phone: normalizeWhatsapp(values.whatsapp),
        org: cleanText(values.org, MAX.org),
        role: cleanText(values.role, MAX.role),
      },
      attendees: [name],
      publicListing: listed,
      payment: isFree ? { status: 'free', method: 'momo', mode: 'live' } : { status: 'registered', method: 'momo', mode: 'live', via: 'tikora' },
    }

    submitting.current = true
    setBusy('saving')
    const res = isFree ? await registerFreeOrder(order) : await registerPaidOrder(order)
    if (!alive.current) return
    if (res.status === 'FAILED') {
      submitting.current = false
      setBusy('')
      setErrors({ summary: t.tickets.payment.reasons[res.reason] ?? t.tickets.payment.reasons.init })
      return
    }
    const saved = saveOrder({
      ...order,
      accessToken: res.accessToken,
      payment: { ...order.payment, status: isFree ? 'free' : res.status },
    })

    // Photo : celle de la fiche participant (liste publique) et du visuel « J'y serai ».
    // En cas d'échec, l'inscription reste valable : la photo pourra être ajoutée ensuite.
    setBusy('photo')
    try {
      const sent = await saveAttendeePhoto(saved, 1, photo.blob)
      setOrderPhoto(saved.id, 1, sent.version)
    } catch {
      /* photo à ajouter depuis la page de confirmation */
    }
    if (!alive.current) return
    navigate(`${routes.confirmation}/${saved.id}`)
  }

  /**
   * --- Billetterie en ligne fermée -----------------------------------------
   * Rouvrir : CONFIG.features.payment = true.
   */
  if (!CONFIG.features.payment) {
    return (
      <div className="checkout checkout--empty">
        <div className="container checkout__unknown">
          <Icon name="lock" size={40} />
          <h1>{c.closedTitle}</h1>
          <p>{c.closedText}</p>
          <div className="checkout__unknown-ctas">
            <Button
              href={`mailto:${CONFIG.contact.emails[0]}?subject=${encodeURIComponent(t.tickets.page.closed.subject)}`}
              iconLeft="mail"
            >
              {c.closedCta}
            </Button>
            <Button as={Link} to={routes.tickets} variant="outline" iconLeft="arrow-left">
              {c.closedBack}
            </Button>
          </div>
        </div>
      </div>
    )
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

  const e = t.event
  const tt = t.tickets.tiers[tier.id]
  const errorCount = Object.keys(errors).length
  const canSubmit = availability === 'open' && !busy
  const submitLabel = busy === 'photo' ? c.sendingPhoto : busy ? c.saving : isFree ? c.confirmFree : c.continuePay
  const steps = isFree ? c.steps : c.stepsPaid
  const stepDone = [true, infoDone, Boolean(photo), false]
  const current = stepDone.findIndex((d) => !d)
  const stepState = (i) => (stepDone[i] ? 'done' : i === current ? 'active' : 'todo')
  const previewName = cleanText(`${values.firstName} ${values.lastName}`, 80)
  const previewRole = [cleanText(values.role, MAX.role), cleanText(values.org, MAX.org)].filter(Boolean).join(' · ')

  return (
    <div className="checkout">
      {/* --- En-tête : carte de l'événement + étapes ------------------------------------ */}
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
          <ol className="co-stepper" aria-label={c.title}>
            {steps.map((s, i) => (
              <li key={s} className={`is-${stepState(i)}`} aria-current={stepState(i) === 'active' ? 'step' : undefined}>
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
          {/* État du serveur de billetterie : rien n'est simulé, on dit les choses */}
          {availability === 'unavailable' && (
            <div className="co-status co-status--error" role="alert">
              <Icon name="alert" size={20} />
              <div>
                <strong>{c.unavailableTitle}</strong>
                <p>{c.unavailableText}</p>
                <button type="button" className="co-status__retry" onClick={catalog.retry}>
                  <Icon name="refresh" size={15} /> {c.retry}
                </button>
              </div>
            </div>
          )}
          {availability === 'soon' && (
            <div className="co-status" role="status">
              <Icon name="clock" size={20} />
              <div>
                <strong>{c.soonTitle}</strong>
                <p>{c.soonText}</p>
                {!isFree && (
                  <Link to={`${routes.checkout}/gratuit`} className="co-status__link">
                    {c.soonFree} <Icon name="arrow-right" size={15} />
                  </Link>
                )}
              </div>
            </div>
          )}
          {availability === 'loading' && (
            <p className="co-status co-status--loading" role="status">
              <Icon name="clock" size={18} /> {c.checking}
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
              {tiersList.map((x) => {
                const checked = x.id === tier.id
                const out = isSoldOut(x)
                const price = getTicketPricing(x).price
                return (
                  <label
                    key={x.id}
                    className={`co-tier co-tier--${x.color} ${checked ? 'is-checked' : ''} ${out ? 'is-sold-out' : ''}`}
                  >
                    <input type="radio" name="tier" value={x.id} checked={checked} disabled={out} onChange={() => changeTier(x.id)} />
                    <span className="co-tier__radio" aria-hidden="true" />
                    <span className="co-tier__body">
                      <strong>{t.tickets.tiers[x.id].name}</strong>
                      <small>{t.tickets.tiers[x.id].tagline}</small>
                    </span>
                    <span className="co-tier__price">
                      {out ? t.tickets.page.soldOut : price === 0 ? t.tickets.page.free : formatXAF(price, locale)}
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
            <p className="co-qty__stock">
              <Icon name="ticket" size={14} />
              {isUnlimitedQuota(tier) ? t.tickets.page.unlimitedQuota : fill(t.tickets.page.quota, { n: formatSeats(tier.quota, locale) })}
              <span aria-hidden="true">·</span>
              {c.onePerson}
            </p>
          </fieldset>

          {/* --- 2. Informations ----------------------------------------------------------- */}
          <fieldset className="co-block">
            <legend className="co-block__title">
              <span>2</span> {c.buyerTitle}
            </legend>
            <p className="co-block__lead">{c.buyerLead}</p>
            <div className="co-row">
              <Field id={`${uid}-firstName`} label={labels.firstName} error={errorOf('firstName')}>
                <input
                  id={`${uid}-firstName`}
                  type="text"
                  autoComplete="given-name"
                  maxLength={MAX.part}
                  value={values.firstName}
                  onChange={setField('firstName')}
                  onBlur={blur('firstName')}
                  {...aria(`${uid}-firstName`, errorOf('firstName'))}
                />
              </Field>
              <Field id={`${uid}-lastName`} label={labels.lastName} error={errorOf('lastName')}>
                <input
                  id={`${uid}-lastName`}
                  type="text"
                  autoComplete="family-name"
                  maxLength={MAX.part}
                  value={values.lastName}
                  onChange={setField('lastName')}
                  onBlur={blur('lastName')}
                  {...aria(`${uid}-lastName`, errorOf('lastName'))}
                />
              </Field>
            </div>
            <div className="co-row">
              <Field id={`${uid}-email`} label={labels.email} hint={isFree ? labels.emailHint : labels.emailHintPaid} error={errorOf('email')}>
                <input
                  id={`${uid}-email`}
                  type="email"
                  maxLength={MAX.email}
                  autoComplete="email"
                  inputMode="email"
                  value={values.email}
                  onChange={setField('email')}
                  onBlur={blur('email')}
                  {...aria(`${uid}-email`, errorOf('email'), true)}
                />
              </Field>
              <Field id={`${uid}-whatsapp`} label={labels.whatsapp} hint={labels.whatsappHint} error={errorOf('whatsapp')}>
                <div className="co-phone co-phone--wa">
                  <span aria-hidden="true">
                    <Icon name="phone" size={17} />
                  </span>
                  <input
                    id={`${uid}-whatsapp`}
                    type="tel"
                    autoComplete="tel"
                    maxLength={MAX.phone}
                    inputMode="tel"
                    placeholder="6XX XX XX XX"
                    value={values.whatsapp}
                    onChange={setField('whatsapp')}
                    onBlur={blur('whatsapp')}
                    {...aria(`${uid}-whatsapp`, errorOf('whatsapp'), true)}
                  />
                </div>
              </Field>
            </div>
            <div className="co-row">
              <Field id={`${uid}-org`} label={labels.org} error={errorOf('org')}>
                <input
                  id={`${uid}-org`}
                  type="text"
                  autoComplete="organization"
                  maxLength={MAX.org}
                  placeholder={labels.orgPlaceholder}
                  value={values.org}
                  onChange={setField('org')}
                  onBlur={blur('org')}
                  {...aria(`${uid}-org`, errorOf('org'))}
                />
              </Field>
              <Field id={`${uid}-role`} label={labels.role} error={errorOf('role')}>
                <input
                  id={`${uid}-role`}
                  type="text"
                  autoComplete="organization-title"
                  maxLength={MAX.role}
                  placeholder={labels.rolePlaceholder}
                  value={values.role}
                  onChange={setField('role')}
                  onBlur={blur('role')}
                  {...aria(`${uid}-role`, errorOf('role'))}
                />
              </Field>
            </div>
          </fieldset>

          {/* --- 3. Photo -------------------------------------------------------------------- */}
          <fieldset className="co-block">
            <legend className="co-block__title">
              <span>3</span> {c.photoTitle}
            </legend>
            <div className={`co-photo ${photo ? 'has-photo' : ''} ${errors.photo ? 'has-error' : ''}`}>
              <button
                type="button"
                className="co-photo__pick"
                onClick={() => setEditingPhoto(true)}
                aria-invalid={errors.photo ? true : undefined}
                aria-describedby={`${uid}-photo-text${errors.photo ? ` ${uid}-photo-error` : ''}`}
              >
                {photo ? (
                  <img src={photo.url} alt={c.photoAlt} width="112" height="112" />
                ) : (
                  <Icon name="camera" size={34} />
                )}
                <span className="co-photo__badge" aria-hidden="true">
                  <Icon name={photo ? 'edit' : 'plus'} size={16} />
                </span>
                <span className="visually-hidden">{photo ? t.tickets.photo.change : t.tickets.photo.add}</span>
              </button>
              <div className="co-photo__text" id={`${uid}-photo-text`}>
                <strong>{photo ? c.photoReady : c.photoAsk}</strong>
                <p>{c.photoWhy}</p>
                <div className="co-photo__actions">
                  <Button type="button" size="sm" variant={photo ? 'outline' : 'primary'} iconLeft={photo ? 'edit' : 'camera'} onClick={() => setEditingPhoto(true)}>
                    {photo ? t.tickets.photo.change : c.photoAdd}
                  </Button>
                  {photo && (
                    <button type="button" className="co-photo__remove" onClick={() => setPhoto(null)}>
                      <Icon name="trash" size={15} /> {t.tickets.photo.remove}
                    </button>
                  )}
                </div>
                <small>{t.tickets.photo.tips}</small>
              </div>
            </div>
            {errors.photo && (
              <small id={`${uid}-photo-error`} className="co-field__error" role="alert">
                <Icon name="alert" size={14} /> {errors.photo}
              </small>
            )}
            {/* Téléphone / tablette : l'aperçu du visuel suit la photo (le récapitulatif est en bas de page) */}
            <div className="co-mobile-preview">
              <VisualPreview tier={tier.id} photo={photo?.url} name={previewName} role={previewRole} />
            </div>
          </fieldset>

          {/* --- 4. Confirmation / paiement ------------------------------------------------- */}
          <fieldset className="co-block">
            <legend className="co-block__title">
              <span>4</span> {isFree ? c.confirmTitle : c.payTikoraTitle}
            </legend>

            {isFree ? (
              <p className="co-free">
                <Icon name="check" size={18} /> {c.freeInfo}
              </p>
            ) : (
              <>
                <ol className="co-howpay">
                  {c.howPay.map((s, i) => (
                    <li key={s.title}>
                      <span className="co-howpay__num" aria-hidden="true">
                        {i + 1}
                      </span>
                      <span>
                        <strong className="co-howpay__title">{s.title}</strong>
                        {rich(fill(s.text, { tier: tt.name, email: values.email.trim() || c.yourEmail }))}
                      </span>
                    </li>
                  ))}
                </ol>
                <div className="co-howpay__ops">
                  {payment.operators.map((op) => (
                    <OperatorBadge key={op.id} id={op.id} size="sm" />
                  ))}
                  <small>{c.tikoraSecure}</small>
                </div>
              </>
            )}

            {/* Liste publique des participants : consentement, avec l'aperçu de la fiche */}
            <label className="co-check co-check--listing">
              <input type="checkbox" 
                checked={true} 
                onChange={(ev) => setListed(ev.target.checked)}
                disabled
              />
              <span>
                {c.publicListing}
                <small>{c.publicListingHint}</small>
              </span>
            </label>

            <label className={`co-check co-check--terms ${errors.terms ? 'has-error' : ''}`}>
              <input
                type="checkbox"
                checked={true}
                onChange={(ev) => {
                  setTerms(ev.target.checked)
                  setErrors((errs) => omit(errs, 'terms'))
                }}
                aria-invalid={errors.terms ? true : undefined}
                disabled
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

        {/* --- Récapitulatif + aperçu du visuel ------------------------------------------------- */}
        <aside className="co-summary" aria-labelledby={`${uid}-sum`}>
          <h2 id={`${uid}-sum`}>{c.summaryTitle}</h2>
          <div className={`co-summary__ticket co-summary__ticket--${tier.color}`}>
            <Icon name={tier.icon} size={22} />
            <div>
              <strong>{tt.name}</strong>
              <small>{isFree ? t.tickets.page.free : formatXAF(unitPrice, locale)}</small>
            </div>
          </div>

          <VisualPreview tier={tier.id} photo={photo?.url} name={previewName} role={previewRole} />

          {!isFree && (
            <dl>
              {pricing.discounted && (
                <div>
                  <dt>{c.discount}</dt>
                  <dd>
                    <s>{formatXAF(pricing.originalPrice, locale)}</s> -{pricing.discountPercent}%
                  </dd>
                </div>
              )}
              <div>
                <dt>{c.subtotal}</dt>
                <dd>{formatXAF(unitPrice, locale)}</dd>
              </div>
              <div>
                <dt>{c.fees}</dt>
                <dd>≈ {formatXAF(fees, locale)}</dd>
              </div>
              <div className="co-summary__total">
                <dt>{c.totalTikora}</dt>
                <dd>≈ {formatXAF(grandTotal, locale)}</dd>
              </div>
              <p className="co-summary__fees-note">{c.feesNote}</p>
            </dl>
          )}

          <Button
            type="submit"
            form="checkout-form"
            size="lg"
            icon={busy ? undefined : isFree ? 'check' : 'arrow-right'}
            iconLeft={busy ? 'clock' : undefined}
            className="co-summary__submit"
            disabled={!canSubmit}
            title={availability === 'open' ? undefined : availabilityMessage}
          >
            {submitLabel}
          </Button>
          {availability !== 'open' && <p className="co-summary__blocked">{availabilityMessage}</p>}
          {!isFree && availability === 'open' && <p className="co-summary__next">{c.nextPaid}</p>}
        </aside>
      </div>

      {/* Barre d'action fixe (téléphone / tablette) */}
      <div className="co-bar">
        <div>
          <small>{tt.name}</small>
          <strong>{isFree ? t.tickets.page.free : formatXAF(unitPrice, locale)}</strong>
        </div>
        <Button
          type="submit"
          form="checkout-form"
          icon={busy ? undefined : isFree ? 'check' : 'arrow-right'}
          iconLeft={busy ? 'clock' : undefined}
          disabled={!canSubmit}
          title={availability === 'open' ? undefined : availabilityMessage}
        >
          {busy ? submitLabel : isFree ? c.confirmFreeShort : c.continuePayShort}
        </Button>
      </div>

      {editingPhoto && (
        <PhotoEditorDialog
          name={previewName || c.photoTitle}
          publicListing={listed}
          onClose={() => setEditingPhoto(false)}
          onCrop={(blob) => {
            setPhoto(blob)
            setEditingPhoto(false)
            setErrors((errs) => omit(errs, 'photo'))
          }}
        />
      )}
    </div>
  )
}
