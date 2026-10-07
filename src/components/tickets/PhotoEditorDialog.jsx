import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Button, Icon } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { loadSafeImage } from '@/security/files'
import { clampCrop, cropToBlob, drawCrop, saveAttendeePhoto } from '@/services/photos'
import { setOrderPhoto } from '@/services/orders'
import { PAYMENT_MODE } from '@/services/payment'
import './PhotoEditorDialog.scss'

const PREVIEW = 560 // px du canevas d'aperçu (affiché à 300 px environ : net sur écran haute densité)
const MIN_SIDE = 200 // même minimum que le serveur

/**
 * <PhotoEditorDialog /> — ajout ou remplacement de la photo d'un participant :
 * choix du fichier (ou glisser-déposer), recadrage au carré avec repère rond
 * (glisser, zoom, flèches du clavier), puis enregistrement.
 *
 * La photo enregistrée est LA photo du participant : fiche de la liste publique
 * (si la personne a accepté d'y figurer) et visuel « J'y serai ».
 * Fenêtre modale native (<dialog>) : focus piégé, Échap, retour du focus.
 */
export default function PhotoEditorDialog({ order, position, name, onClose, onSaved }) {
  const { t } = useI18n()
  const p = t.tickets.photo
  const uid = useId()
  const ref = useRef(null)
  const canvasRef = useRef(null)
  const fileRef = useRef(null)
  const drag = useRef(null)

  const [image, setImage] = useState(null) // { img, url }
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  // Ouverture modale + retour du focus à la fermeture
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return undefined
    const opener = document.activeElement
    if (!dialog.open) dialog.showModal?.()
    return () => {
      if (dialog.open) dialog.close()
      opener?.focus?.()
    }
  }, [])

  // Libère l'URL de l'image précédente
  useEffect(() => () => image && URL.revokeObjectURL(image.url), [image])

  // Aperçu : image recadrée + voile hors du cercle (repère de la photo ronde du visuel)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !image) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, PREVIEW, PREVIEW)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, PREVIEW, PREVIEW)
    drawCrop(ctx, image.img, zoom, offset, PREVIEW)
    ctx.save()
    ctx.fillStyle = 'rgba(14, 19, 38, 0.5)'
    ctx.beginPath()
    ctx.rect(0, 0, PREVIEW, PREVIEW)
    ctx.arc(PREVIEW / 2, PREVIEW / 2, PREVIEW / 2 - 6, 0, Math.PI * 2, true)
    ctx.fill('evenodd')
    ctx.lineWidth = 4
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.beginPath()
    ctx.arc(PREVIEW / 2, PREVIEW / 2, PREVIEW / 2 - 6, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }, [image, zoom, offset])

  const openFile = useCallback(async (file) => {
    setError('')
    if (!file) return
    try {
      const safe = await loadSafeImage(file)
      if (Math.min(safe.img.naturalWidth, safe.img.naturalHeight) < MIN_SIDE) {
        URL.revokeObjectURL(safe.url)
        throw new Error('small')
      }
      setImage(safe)
      setZoom(1)
      setOffset({ x: 0, y: 0 })
    } catch (e) {
      setError(e.message)
    }
  }, [])

  // --- Recadrage : souris, doigt, stylet, clavier ------------------------------------------
  const onPointerDown = (e) => {
    if (!image) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, start: offset, half: e.currentTarget.getBoundingClientRect().width / 2 }
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d) return
    setOffset(clampCrop(image.img, zoom, { x: d.start.x + (e.clientX - d.x) / d.half, y: d.start.y + (e.clientY - d.y) / d.half }))
  }
  const endDrag = () => {
    drag.current = null
  }
  const onKeyDown = (e) => {
    const step = e.shiftKey ? 0.12 : 0.04
    const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key]
    if (!move || !image) return
    e.preventDefault()
    setOffset((o) => clampCrop(image.img, zoom, { x: o.x + move[0], y: o.y + move[1] }))
  }
  const changeZoom = (value) => {
    setZoom(value)
    setOffset((o) => clampCrop(image.img, value, o))
  }

  // --- Enregistrement -------------------------------------------------------------------------
  const save = async () => {
    if (!image || saving) return
    setSaving(true)
    setError('')
    try {
      const blob = await cropToBlob(image.img, zoom, offset)
      const result = await saveAttendeePhoto(order, position, blob)
      setOrderPhoto(order.id, position, result.version)
      onSaved(result)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  const close = () => !saving && onClose()

  const fileProps = {
    className: 'photo-dialog__file',
    type: 'file',
    accept: 'image/jpeg,image/png,image/webp',
    onChange: (e) => {
      openFile(e.target.files?.[0])
      e.target.value = ''
    },
  }
  const errorText = error ? (p.errors[error] ?? p.errors.server) : ''
  // Où la photo sera visible : liste publique (si consentement) ou visuel seulement
  const live = PAYMENT_MODE === 'live' && order.payment.mode === 'live'
  const visibility = live
    ? { public: order.publicListing, text: order.publicListing ? p.public : p.private }
    : { public: false, text: p.demo }

  return (
    <dialog
      ref={ref}
      className="photo-dialog"
      aria-labelledby={`${uid}-title`}
      aria-describedby={`${uid}-name`}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClick={(e) => e.target === e.currentTarget && close()} // clic sur le fond
    >
      <div className="photo-dialog__box">
        <header className="photo-dialog__head">
          <span className="photo-dialog__icon" aria-hidden="true">
            <Icon name="camera" size={22} />
          </span>
          <div>
            <h2 id={`${uid}-title`}>{p.title}</h2>
            <p id={`${uid}-name`}>{name}</p>
          </div>
          <button type="button" className="photo-dialog__close" onClick={close} aria-label={p.close} disabled={saving}>
            <Icon name="close" size={22} />
          </button>
        </header>

        <div className="photo-dialog__body">
          {image ? (
            <div className="photo-crop">
              <div className="photo-crop__stage">
                <canvas
                  ref={canvasRef}
                  width={PREVIEW}
                  height={PREVIEW}
                  role="img"
                  aria-label={`${p.preview} — ${p.dragHint}`}
                  tabIndex={0}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onKeyDown={onKeyDown}
                />
              </div>
              <p className="photo-crop__hint">
                <Icon name="info" size={14} /> {p.dragHint}
              </p>
              <div className="photo-crop__zoom">
                <label htmlFor={`${uid}-zoom`}>{p.zoom}</label>
                <button type="button" onClick={() => changeZoom(Math.max(1, zoom - 0.25))} aria-label={`${p.zoom} −`}>
                  <Icon name="minus" size={16} />
                </button>
                <input
                  id={`${uid}-zoom`}
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={zoom}
                  onChange={(e) => changeZoom(Number(e.target.value))}
                />
                <button type="button" onClick={() => changeZoom(Math.min(3, zoom + 0.25))} aria-label={`${p.zoom} +`}>
                  <Icon name="plus" size={16} />
                </button>
              </div>
              <button type="button" className="photo-crop__other" onClick={() => fileRef.current?.click()} disabled={saving}>
                <Icon name="refresh" size={15} /> {p.chooseOther}
              </button>
            </div>
          ) : (
            <label
              className={`photo-drop ${dragOver ? 'is-over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                openFile(e.dataTransfer.files?.[0])
              }}
            >
              <input aria-describedby={`${uid}-tips`} {...fileProps} />
              <span className="photo-drop__circle" aria-hidden="true">
                <Icon name="camera" size={34} />
              </span>
              <strong>{p.choose}</strong>
              <span>{p.drop}</span>
              <small id={`${uid}-tips`}>{p.tips}</small>
            </label>
          )}

          {/* Champ caché utilisé par « Choisir une autre photo » */}
          {image && <input ref={fileRef} tabIndex={-1} aria-hidden="true" {...fileProps} />}

          {errorText && (
            <p className="photo-dialog__error" role="alert">
              <Icon name="alert" size={16} /> {errorText}
            </p>
          )}

          <p className={`photo-dialog__visibility ${visibility.public ? 'is-public' : ''}`}>
            <Icon name={visibility.public ? 'users' : 'lock'} size={16} /> {visibility.text}
          </p>
          <p className="photo-dialog__note">
            <Icon name="shield" size={14} />
            <span>{p.rights}</span>
          </p>
        </div>

        <footer className="photo-dialog__foot">
          <Button variant="ghost" onClick={close} disabled={saving}>
            {p.cancel}
          </Button>
          <Button onClick={save} disabled={!image || saving} iconLeft={saving ? 'clock' : 'check'}>
            {saving ? p.saving : p.save}
          </Button>
        </footer>
      </div>
    </dialog>
  )
}
