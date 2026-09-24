import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button, Icon, Reveal } from '@/components/ui'
import { PageHero } from '@/components/page'
import {
  FLYER_FORMATS,
  FLYER_STYLES,
  clampOffset,
  drawFlyer,
  getLayout,
  isInPhoto,
  loadFlyerFonts,
  loadImage,
} from '@/components/tickets/flyerRenderer'
import { useI18n } from '@/i18n/context'
import { CONFIG } from '@/data/config'
import { getOrder, isConfirmed, latestConfirmedOrder } from '@/services/orders'
import useDocumentMeta from '@/hooks/useDocumentMeta'
import { loadSafeImage } from '@/security/files'
import { cleanText } from '@/security/sanitize'
import logoWhiteSrc from '@/assets/images/brand/logo-jcia-white.webp'
import logoColorSrc from '@/assets/images/brand/logo-jcia.webp'
import mapDarkSrc from '@/assets/images/brand/map-large-dark.webp'
import mapLightSrc from '@/assets/images/brand/map-large.webp'
import './FlyerPage.scss'

/**
 * <FlyerEditor /> — générateur du flyer « J'y serai » pour une commande confirmée.
 *
 *  • photo : sélection ou glisser-déposer, zoom, repositionnement au doigt / à la souris ;
 *  • nom affiché et titre ;
 *  • format (publication 4:5, story 9:16, carré 1:1) et ambiance (nuit, latérite, soleil) ;
 *  • téléchargement PNG, partage natif (mobile) et copie du texte d'accompagnement.
 *
 * Tout est calculé dans le navigateur : la photo ne quitte jamais l'appareil.
 */
function FlyerEditor({ order }) {
  const { t } = useI18n()
  const f = t.tickets.flyer
  const uid = useId()
  const canvasRef = useRef(null)
  const fileRef = useRef(null)
  const drag = useRef(null)
  const tier = CONFIG.tickets.tiers.find((x) => x.id === order.tierId)

  const [assets, setAssets] = useState(null)
  const [photo, setPhoto] = useState(null) // { img, url }
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [name, setName] = useState(order.customer.name)
  const [role, setRole] = useState(order.customer.org ?? '')
  const [format, setFormat] = useState('portrait')
  const [style, setStyle] = useState('nuit')
  const [dragOver, setDragOver] = useState(false)
  const [copied, setCopied] = useState(false)
  const [fileError, setFileError] = useState('')

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

  // Libère l'URL de la photo précédente
  useEffect(() => () => photo && URL.revokeObjectURL(photo.url), [photo])

  // Rendu du flyer à chaque modification
  useEffect(() => {
    if (!assets || !canvasRef.current) return
    drawFlyer(canvasRef.current, {
      format,
      style,
      photo: photo?.img ?? null,
      zoom,
      offset,
      name: cleanText(name, 40),
      role: cleanText(role, 50),
      online: tier ? !tier.onsite : false,
      text: f.art,
      assets,
      placeholder: f.noPhoto,
    })
  }, [assets, format, style, photo, zoom, offset, name, role, tier, f])

  // --- Photo ----------------------------------------------------------------------------
  const openFile = useCallback(
    async (file) => {
      setFileError('')
      if (!file) return
      try {
        // Sécurité : signature binaire, poids et dimensions vérifiés ; métadonnées retirées
        const safe = await loadSafeImage(file)
        setPhoto(safe)
        setZoom(1)
        setOffset({ x: 0, y: 0 })
      } catch {
        setFileError(f.dropHint)
      }
    },
    [f.dropHint],
  )

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    openFile(e.dataTransfer.files?.[0])
  }

  // --- Repositionnement de la photo (souris, stylet, doigt) ------------------------------------
  const toCanvas = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const k = canvas.width / rect.width
    return { x: (e.clientX - rect.left) * k, y: (e.clientY - rect.top) * k, k }
  }

  const onPointerDown = (e) => {
    if (!photo) return
    const p = toCanvas(e)
    if (!isInPhoto(format, p.x, p.y)) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: p.x, y: p.y, start: offset }
  }

  const onPointerMove = (e) => {
    if (!drag.current) return
    const p = toCanvas(e)
    const { r } = getLayout(format).photo
    const next = {
      x: drag.current.start.x + (p.x - drag.current.x) / r,
      y: drag.current.start.y + (p.y - drag.current.y) / r,
    }
    setOffset(clampOffset(photo.img, zoom, next))
  }

  const endDrag = () => {
    drag.current = null
  }

  // Clavier : flèches pour déplacer la photo quand l'aperçu a le focus
  const onKeyDown = (e) => {
    if (!photo) return
    const step = e.shiftKey ? 0.1 : 0.03
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    const m = moves[e.key]
    if (!m) return
    e.preventDefault()
    setOffset((o) => clampOffset(photo.img, zoom, { x: o.x + m[0], y: o.y + m[1] }))
  }

  const changeZoom = (value) => {
    setZoom(value)
    if (photo) setOffset((o) => clampOffset(photo.img, value, o))
  }

  // --- Export -------------------------------------------------------------------------------------
  const fileName = `JCIA-2027-jy-serai-${format}.png`
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

  return (
    <div className="flyer-editor">
      {/* --- Aperçu ------------------------------------------------------------------ */}
      <div className="flyer-editor__preview">
        <div className={`flyer-editor__frame flyer-editor__frame--${format}`} style={{ aspectRatio: `${ratio.w} / ${ratio.h}` }}>
          {!assets && <span className="flyer-editor__loading" aria-hidden="true" />}
          <canvas
            ref={canvasRef}
            width={ratio.w}
            height={ratio.h}
            role="img"
            aria-label={f.preview}
            tabIndex={photo ? 0 : -1}
            className={photo ? 'is-draggable' : ''}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={onKeyDown}
          />
        </div>
        {photo && (
          <p className="flyer-editor__hint">
            <Icon name="info" size={14} /> {f.dragHint}
          </p>
        )}
      </div>

      {/* --- Réglages ----------------------------------------------------------------- */}
      <div className="flyer-editor__controls">
        {/* Photo */}
        <section className="fx-block">
          <h2>
            <span>1</span> {f.photo}
          </h2>
          <label
            className={`fx-drop ${dragOver ? 'is-over' : ''} ${photo ? 'has-photo' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                openFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            {photo ? (
              <img src={photo.url} alt="" className="fx-drop__thumb" />
            ) : (
              <span className="fx-drop__icon" aria-hidden="true">
                <Icon name="upload" size={26} />
              </span>
            )}
            <span className="fx-drop__text">
              <strong>{photo ? f.replace : f.upload}</strong>
              <small>{f.dropHint}</small>
            </span>
          </label>
          {fileError && (
            <p className="fx-error" role="alert">
              <Icon name="alert" size={14} /> {fileError}
            </p>
          )}

          {photo && (
            <div className="fx-zoom">
              <label htmlFor={`${uid}-zoom`}>{f.zoom}</label>
              <Icon name="minus" size={16} />
              <input
                id={`${uid}-zoom`}
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(e) => changeZoom(Number(e.target.value))}
              />
              <Icon name="plus" size={16} />
            </div>
          )}
          <p className="fx-privacy">
            <Icon name="lock" size={14} /> {f.privacy}
          </p>
        </section>

        {/* Texte */}
        <section className="fx-block">
          <h2>
            <span>2</span> {f.name}
          </h2>
          <div className="fx-field">
            <label htmlFor={`${uid}-name`}>{f.name}</label>
            <input id={`${uid}-name`} type="text" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="fx-field">
            <label htmlFor={`${uid}-role`}>{f.role}</label>
            <input
              id={`${uid}-role`}
              type="text"
              maxLength={50}
              value={role}
              placeholder={f.rolePlaceholder}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
        </section>

        {/* Format & ambiance */}
        <section className="fx-block">
          <h2>
            <span>3</span> {f.format}
          </h2>
          <div className="fx-segmented" role="radiogroup" aria-label={f.format}>
            {Object.keys(FLYER_FORMATS).map((key) => (
              <label key={key} className={format === key ? 'is-checked' : ''}>
                <input type="radio" name="flyer-format" value={key} checked={format === key} onChange={() => setFormat(key)} />
                <span className={`fx-segmented__shape fx-segmented__shape--${key}`} aria-hidden="true" />
                {f.formats[key]}
              </label>
            ))}
          </div>

          <p className="fx-label">{f.style}</p>
          <div className="fx-styles" role="radiogroup" aria-label={f.style}>
            {Object.entries(FLYER_STYLES).map(([key, st]) => (
              <label
                key={key}
                className={style === key ? 'is-checked' : ''}
                style={{ '--sw-a': st.swatch[0], '--sw-b': st.swatch[1] }}
              >
                <input type="radio" name="flyer-style" value={key} checked={style === key} onChange={() => setStyle(key)} />
                <span className="fx-styles__swatch" aria-hidden="true" />
                {f.styles[key]}
              </label>
            ))}
          </div>
        </section>

        {/* Actions */}
        <section className="fx-block fx-actions">
          <Button onClick={download} size="lg" iconLeft="download" disabled={!assets || !photo}>
            {f.download}
          </Button>
          {!photo && <p className="fx-hint">{f.noPhoto}</p>}
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
    </div>
  )
}

/**
 * <FlyerPage /> — page « Mon flyer ».
 *
 * Accès réservé aux détenteurs d'un billet confirmé (paiement validé ou billet
 * gratuit). La commande est lue depuis ?order=… ou, à défaut, la dernière
 * commande confirmée sur cet appareil.
 * ⚠️ En production, ce contrôle doit être fait par le serveur de billetterie.
 */
export default function FlyerPage() {
  const { t } = useI18n()
  const f = t.tickets.flyer
  const [params] = useSearchParams()
  const orderParam = params.get('order')
  const order = useMemo(() => (orderParam ? getOrder(orderParam) : latestConfirmedOrder()), [orderParam])
  const unlocked = isConfirmed(order)
  useDocumentMeta(`${f.title} | ${t.event.shortName}`, { noindex: true })

  return (
    <div className="detail-page flyer-page">
      <PageHero current={f.title} eyebrow={f.hero.eyebrow} title={f.hero.title} lead={f.hero.lead} />

      <section className="page-section page-section--white">
        <div className="container">
          {unlocked ? (
            <FlyerEditor order={order} />
          ) : (
            <Reveal className="flyer-locked">
              <span className="flyer-locked__icon" aria-hidden="true">
                <Icon name="lock" size={34} />
              </span>
              <h2>{f.lockedTitle}</h2>
              <p>{f.lockedText}</p>
              <Button as={Link} to={CONFIG.routes.tickets} size="lg" icon="arrow-right">
                {f.lockedCta}
              </Button>
            </Reveal>
          )}
        </div>
      </section>
    </div>
  )
}
