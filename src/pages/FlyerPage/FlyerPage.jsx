import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Button, Icon, PersonAvatar, Reveal } from '@/components/ui'
import { PageHero } from '@/components/page'
import { FLYER_FORMATS, TIER_STYLES, drawFlyer, loadFlyerFonts, loadImage, styleForTier } from '@/components/tickets/flyerRenderer'
import PhotoEditorDialog from '@/components/tickets/PhotoEditorDialog'
import { useI18n } from '@/i18n/context'
import { fill } from '@/i18n/format'
import { CONFIG } from '@/data/config'
import useAttendeePhotos from '@/hooks/useAttendeePhotos'
import { canGenerateFlyer, getOrder, latestConfirmedOrder, saveServerOrder, setOrderPhoto } from '@/services/orders'
import { claimTikoraOrder, fetchServerOrder } from '@/services/payment'
import { removeAttendeePhoto } from '@/services/photos'
import useDocumentMeta from '@/hooks/useDocumentMeta'
import { cleanText, isValidEmail } from '@/security/sanitize'
import logoWhiteSrc from '@/assets/images/brand/logo-jcia-white.webp'
import logoColorSrc from '@/assets/images/brand/logo-jcia.webp'
import mapDarkSrc from '@/assets/images/brand/map-large-dark.webp'
import mapLightSrc from '@/assets/images/brand/map-large.webp'
import './FlyerPage.scss'

const TIER_IDS = CONFIG.tickets.tiers.map((t) => t.id)

/** Image décodée d'une photo (data:URL), pour le canevas. */
function usePhotoImage(src) {
  const [decoded, setDecoded] = useState({ src: null, img: null })
  useEffect(() => {
    if (!src) return undefined
    let alive = true
    loadImage(src)
      .then((img) => alive && setDecoded({ src, img }))
      .catch(() => alive && setDecoded({ src, img: null }))
    return () => {
      alive = false
    }
  }, [src])
  return src && decoded.src === src ? decoded.img : null
}

/**
 * <FlyerEditor /> — visuel « J'y serai » d'un participant d'une commande confirmée.
 *
 *  • photo : celle de la FICHE PARTICIPANT (la même que dans la liste publique),
 *    ajoutée ou modifiée ici si besoin ;
 *  • charte : imposée par le billet (chaque tarif a ses couleurs et son badge) ;
 *  • participant au choix pour une commande de plusieurs billets ;
 *  • nom affiché et titre ; format publication 4:5, story 9:16 ou carré 1:1 ;
 *  • téléchargement PNG, partage natif (mobile) et copie du texte d'accompagnement.
 *
 * Le visuel est calculé dans le navigateur.
 */
function FlyerEditor({ order }) {
  const { t } = useI18n()
  const f = t.tickets.flyer
  const p = t.tickets.photo
  const uid = useId()
  const canvasRef = useRef(null)
  const tierId = TIER_IDS.includes(order.tierId) ? order.tierId : 'standard'
  const tierName = t.tickets.tiers[tierId]?.name ?? tierId
  const many = order.attendees.length > 1

  const [assets, setAssets] = useState(null)
  const [position, setPosition] = useState(1)
  const [names, setNames] = useState({})
  const [roles, setRoles] = useState({})
  const [format, setFormat] = useState('portrait')
  const [editing, setEditing] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [status, setStatus] = useState('')
  const [copied, setCopied] = useState(false)

  const { photos, ready, update } = useAttendeePhotos(order)
  const photoSrc = photos[position] ?? null
  const photo = usePhotoImage(photoSrc)
  const attendeeName = order.attendees[position - 1] ?? order.customer.name
  const name = names[position] ?? attendeeName
  const role = roles[position] ?? (position === 1 ? order.customer.org : '')

  // Préchargement des polices et des images de la marque
  useEffect(() => {
    let cancelled = false
    Promise.all([
      loadFlyerFonts(),
      loadImage(logoWhiteSrc),
      loadImage(logoColorSrc),
      loadImage(mapDarkSrc).catch(() => null),
      loadImage(mapLightSrc).catch(() => null),
    ]).then(([, logoWhite, logoColor, mapDark, mapLight]) => {
      if (!cancelled) setAssets({ logoWhite, logoColor, mapDark, mapLight })
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Rendu du visuel à chaque modification
  useEffect(() => {
    if (!assets || !canvasRef.current) return
    drawFlyer(canvasRef.current, {
      format,
      tier: tierId,
      photo,
      name: cleanText(name, 40),
      role: cleanText(role, 50),
      text: f.art,
      assets,
      placeholder: f.noPhoto,
    })
  }, [assets, format, tierId, photo, name, role, f])

  // --- Photo de la fiche participant ----------------------------------------------------------
  const removePhoto = async () => {
    setRemoving(true)
    setStatus('')
    try {
      await removeAttendeePhoto(order, position)
      setOrderPhoto(order.id, position, null)
      update(position, null)
      setStatus(p.removed)
    } catch (e) {
      setStatus(p.errors[e.message] ?? p.errors.server)
    } finally {
      setRemoving(false)
    }
  }

  // --- Export -------------------------------------------------------------------------------------
  const slug = cleanText(name, 40)
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
  const fileName = `JCIA-2027-jy-serai${slug ? `-${slug}` : ''}-${format}.png`
  const toBlob = () => new Promise((resolve) => canvasRef.current.toBlob(resolve, 'image/png'))

  const download = async () => {
    const blob = await toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const share = async () => {
    const blob = await toBlob()
    const file = new File([blob], fileName, { type: 'image/png' })
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: f.caption })
      else await navigator.share({ text: f.caption, url: CONFIG.siteUrl })
    } catch {
      /* partage annulé par l'utilisateur */
    }
  }

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(f.caption)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      /* presse-papiers indisponible (contexte non sécurisé) */
    }
  }

  const ratio = FLYER_FORMATS[format]
  const style = styleForTier(tierId)
  const tierColor = CONFIG.tickets.tiers.find((x) => x.id === tierId)?.color
  const photoStatus = photoSrc ? (order.publicListing ? p.public : p.private) : p.missing

  return (
    <div className="flyer-editor" style={{ '--tier-a': style.swatch[0], '--tier-b': style.swatch[1] }}>
      {/* --- Aperçu ------------------------------------------------------------------ */}
      <div className="flyer-editor__preview">
        <div className={`flyer-editor__frame flyer-editor__frame--${format}`} style={{ aspectRatio: `${ratio.w} / ${ratio.h}` }}>
          {!assets && <span className="flyer-editor__loading" aria-hidden="true" />}
          <canvas ref={canvasRef} width={ratio.w} height={ratio.h} role="img" aria-label={`${f.preview} — ${name}`} />
        </div>
      </div>

      {/* --- Réglages ----------------------------------------------------------------- */}
      <div className="flyer-editor__controls">
        {/* Participant & photo */}
        <section className="fx-block">
          <h2>
            <span>1</span> {f.photo}
          </h2>

          {many && (
            <div className="fx-who">
              <p className="fx-label" id={`${uid}-who`}>
                {f.who}
              </p>
              <div className="fx-who__list" role="radiogroup" aria-labelledby={`${uid}-who`}>
                {order.attendees.map((person, i) => (
                  <label key={`${person}-${i}`} className={position === i + 1 ? 'is-checked' : ''}>
                    <input
                      type="radio"
                      name={`${uid}-who`}
                      value={i + 1}
                      checked={position === i + 1}
                      onChange={() => {
                        setPosition(i + 1)
                        setStatus('')
                      }}
                    />
                    <PersonAvatar name={person} photo={photos[i + 1] ?? null} color={tierColor} className="fx-who__avatar" />
                    <span>{person}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className={`fx-photo ${photoSrc ? 'has-photo' : ''}`}>
            <PersonAvatar name={attendeeName} photo={photoSrc} color={tierColor} className="fx-photo__avatar" />
            <div className="fx-photo__text">
              <strong>{f.photoSource}</strong>
              <small>{ready || photoSrc ? photoStatus : '…'}</small>
            </div>
          </div>
          <div className="fx-photo__actions">
            <Button
              onClick={() => setEditing(true)}
              variant={photoSrc ? 'outline' : 'primary'}
              iconLeft={photoSrc ? 'edit' : 'camera'}
              disabled={removing}
            >
              {photoSrc ? p.change : p.add}
            </Button>
            {photoSrc && (
              <button type="button" className="fx-photo__remove" onClick={removePhoto} disabled={removing}>
                <Icon name="trash" size={16} /> {removing ? p.removing : p.remove}
              </button>
            )}
          </div>
          <p className="fx-status" role="status" aria-live="polite">
            {status}
          </p>
        </section>

        {/* Texte */}
        <section className="fx-block">
          <h2>
            <span>2</span> {f.name}
          </h2>
          <div className="fx-field">
            <label htmlFor={`${uid}-name`}>{f.name}</label>
            <input
              id={`${uid}-name`}
              type="text"
              maxLength={40}
              value={name}
              onChange={(e) => setNames((n) => ({ ...n, [position]: e.target.value }))}
            />
          </div>
          <div className="fx-field">
            <label htmlFor={`${uid}-role`}>{f.role}</label>
            <input
              id={`${uid}-role`}
              type="text"
              maxLength={50}
              value={role}
              placeholder={f.rolePlaceholder}
              onChange={(e) => setRoles((r) => ({ ...r, [position]: e.target.value }))}
            />
          </div>
        </section>

        {/* Format & charte du billet */}
        <section className="fx-block">
          <h2>
            <span>3</span> {f.layout}
          </h2>
          <div className="fx-segmented" role="radiogroup" aria-label={f.format}>
            {Object.keys(FLYER_FORMATS).map((key) => (
              <label key={key} className={format === key ? 'is-checked' : ''}>
                <input type="radio" name={`${uid}-format`} value={key} checked={format === key} onChange={() => setFormat(key)} />
                <span className={`fx-segmented__shape fx-segmented__shape--${key}`} aria-hidden="true" />
                {f.formats[key]}
              </label>
            ))}
          </div>

          <div className="fx-charter">
            <span className="fx-charter__swatch" aria-hidden="true" />
            <div>
              <strong>{fill(f.charter, { tier: tierName })}</strong>
              <small>{f.charterHint}</small>
            </div>
          </div>
          <ul className="fx-charters" aria-label={f.charterLegend}>
            {Object.entries(TIER_STYLES).map(([id, st]) => (
              <li
                key={id}
                className={id === tierId ? 'is-current' : ''}
                style={{ '--sw-a': st.swatch[0], '--sw-b': st.swatch[1] }}
                aria-current={id === tierId ? 'true' : undefined}
              >
                <span aria-hidden="true" />
                {t.tickets.tiers[id]?.name ?? id}
              </li>
            ))}
          </ul>
        </section>

        {/* Actions */}
        <section className="fx-block fx-actions">
          <Button onClick={download} size="lg" iconLeft="download" disabled={!assets || !photo}>
            {f.download}
          </Button>
          {!photoSrc && <p className="fx-hint">{f.noPhoto}</p>}
          <div className="fx-actions__row">
            {canShare && (
              <Button onClick={share} variant="outline" iconLeft="share" disabled={!assets || !photo}>
                {f.share}
              </Button>
            )}
            <Button onClick={copyCaption} variant="outline" iconLeft={copied ? 'check' : 'copy'}>
              {copied ? f.copied : f.copy}
            </Button>
          </div>
          <p className="fx-caption">{f.caption}</p>
        </section>
      </div>

      {editing && (
        <PhotoEditorDialog
          order={order}
          position={position}
          name={attendeeName}
          onClose={() => setEditing(false)}
          onSaved={(result) => {
            update(position, result.src)
            setEditing(false)
            setStatus(p.saved)
          }}
        />
      )}
    </div>
  )
}

/**
 * Commande relue sur le serveur : photos ajoutées depuis un autre appareil,
 * billets officiels. La copie de l'appareil s'affiche sans attendre.
 */
function useFreshOrder(initial) {
  const [fresh, setFresh] = useState(null)
  useEffect(() => {
    if (!initial?.accessToken) return undefined
    let alive = true
    fetchServerOrder(initial.id, initial.accessToken).then((server) => {
      const saved = server ? saveServerOrder(server, initial.accessToken) : null
      if (alive && saved) setFresh(saved)
    })
    return () => {
      alive = false
    }
  }, [initial])
  return fresh?.id === initial?.id ? fresh : initial
}

/**
 * Billet payé sur la page TIKORA : la personne donne son numéro de commande
 * TIKORA (ORD-…, dans l'e-mail de TIKORA) et l'adresse e-mail utilisée pour
 * l'achat. Le serveur le VÉRIFIE chez TIKORA puis renvoie la commande JCIA : le
 * billet (et donc la charte du visuel) vient de TIKORA, la photo est enregistrée
 * comme pour tout participant et figure dans la liste si la personne l'accepte.
 */
function ClaimTicket({ initialNumber }) {
  const { t, lang } = useI18n()
  const f = t.tickets.flyer
  const uid = useId()
  const navigate = useNavigate()
  const [orderNumber, setOrderNumber] = useState(initialNumber ?? '')
  const [email, setEmail] = useState('')
  const [listed, setListed] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (!/^[A-Za-z0-9][A-Za-z0-9-]{3,39}$/.test(orderNumber.trim())) return setError(f.claim.errors.number)
    if (!isValidEmail(email)) return setError(f.claim.errors.email)
    setBusy(true)
    setError('')
    const res = await claimTikoraOrder({ orderNumber: orderNumber.trim(), email: email.trim(), publicListing: listed, lang })
    const saved = res.ok ? saveServerOrder(res.order, res.accessToken) : null
    if (!saved) {
      setBusy(false)
      return setError(f.claim.errors[res.reason] ?? f.claim.errors.server)
    }
    navigate(`${CONFIG.routes.flyer}?order=${saved.id}`, { replace: true })
    return undefined
  }

  return (
    <form className="flyer-declare" onSubmit={submit} noValidate aria-labelledby={`${uid}-title`}>
      <h2 id={`${uid}-title`}>{f.claim.title}</h2>
      <p>{f.claim.text}</p>
      <div className="fx-field">
        <label htmlFor={`${uid}-number`}>{f.claim.number}</label>
        <input
          id={`${uid}-number`}
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          spellCheck="false"
          maxLength={40}
          placeholder="ORD-XXXXXXXX"
          value={orderNumber}
          aria-describedby={`${uid}-number-hint`}
          onChange={(e) => {
            setOrderNumber(e.target.value)
            setError('')
          }}
        />
        <small id={`${uid}-number-hint`}>{f.claim.numberHint}</small>
      </div>
      <div className="fx-field">
        <label htmlFor={`${uid}-email`}>{f.claim.email}</label>
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
      <label className="flyer-declare__consent">
        <input type="checkbox" checked={listed} onChange={(e) => setListed(e.target.checked)} />
        <span>
          {f.claim.listing}
          <small>{f.claim.listingHint}</small>
        </span>
      </label>
      {error && (
        <p className="flyer-declare__error" role="alert">
          <Icon name="alert" size={15} /> {error}
        </p>
      )}
      <Button type="submit" size="lg" icon={busy ? undefined : 'arrow-right'} iconLeft={busy ? 'clock' : undefined} disabled={busy}>
        {busy ? f.claim.checking : f.claim.cta}
      </Button>
      <p className="flyer-declare__note">{f.claim.note}</p>
    </form>
  )
}

/**
 * <FlyerPage /> — page « Mon visuel ».
 *
 * Accès réservé aux détenteurs d'un billet confirmé, GRATUIT OU PAYANT. La
 * commande est lue depuis ?order=… ou, à défaut, la dernière commande confirmée
 * sur cet appareil.
 */
export default function FlyerPage() {
  const { t } = useI18n()
  const f = t.tickets.flyer
  const [params] = useSearchParams()
  const orderParam = params.get('order')
  const initial = useMemo(() => (orderParam ? getOrder(orderParam) : latestConfirmedOrder()), [orderParam])
  const order = useFreshOrder(initial)
  const unlocked = canGenerateFlyer(order)
  useDocumentMeta(`${f.title} | ${t.event.shortName}`, { noindex: true })

  return (
    <div className="detail-page flyer-page">
      <PageHero current={f.title} eyebrow={f.hero.eyebrow} title={f.hero.title} lead={f.hero.lead} />

      <section className="page-section page-section--white">
        <div className="container">
          {unlocked ? (
            <FlyerEditor key={order.id} order={order} />
          ) : (
            <Reveal className="flyer-locked">
              <span className="flyer-locked__icon" aria-hidden="true">
                <Icon name="lock" size={34} />
              </span>
              <h2>{f.lockedTitle}</h2>
              <p>{f.lockedText}</p>
              <Button as={Link} to={CONFIG.routes.tickets} size="lg" variant="outline" icon="arrow-right">
                {f.lockedCta}
              </Button>
            </Reveal>
          )}
          {!unlocked && (
            <Reveal delay={80}>
              <ClaimTicket initialNumber={params.get('commande')} />
            </Reveal>
          )}
        </div>
      </section>
    </div>
  )
}
