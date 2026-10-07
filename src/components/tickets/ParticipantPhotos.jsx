import { useState } from 'react'
import { Button, Icon, PersonAvatar } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { CONFIG } from '@/data/config'
import useAttendeePhotos from '@/hooks/useAttendeePhotos'
import { removeAttendeePhoto } from '@/services/photos'
import { setOrderPhoto } from '@/services/orders'
import PhotoEditorDialog from './PhotoEditorDialog'
import './ParticipantPhotos.scss'

/**
 * <ParticipantPhotos /> — « Votre photo de participant » sur la page de
 * confirmation : une ligne par participant de la commande, avec sa photo (ou
 * ses initiales) et les actions ajouter / modifier / retirer.
 *
 * Cette photo est celle de la fiche du participant dans la liste publique (si la
 * personne a accepté d'y figurer) et celle de son visuel « J'y serai ».
 */
export default function ParticipantPhotos({ order }) {
  const { t } = useI18n()
  const p = t.tickets.photo
  const { photos, update } = useAttendeePhotos(order)
  const [editing, setEditing] = useState(null) // position en cours de modification
  const [busy, setBusy] = useState(null)
  const [status, setStatus] = useState('')
  const tier = CONFIG.tickets.tiers.find((x) => x.id === order.tierId)
  const many = order.attendees.length > 1

  const remove = async (position) => {
    setBusy(position)
    setStatus('')
    try {
      await removeAttendeePhoto(order, position)
      setOrderPhoto(order.id, position, null)
      update(position, null)
      setStatus(p.removed)
    } catch (e) {
      setStatus(p.errors[e.message] ?? p.errors.server)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="participant-photos" aria-labelledby={`pp-${order.id}`}>
      <h2 id={`pp-${order.id}`}>
        <Icon name="camera" size={20} /> {many ? p.titleMany : p.title}
      </h2>
      <p className="participant-photos__lead">
        {many ? (order.publicListing ? p.leadMany : p.leadManyPrivate) : order.publicListing ? p.lead : p.leadPrivate}
      </p>

      <ul className="participant-photos__list">
        {order.attendees.map((name, i) => {
          const position = i + 1
          const photo = photos[position] ?? null
          return (
            <li key={position} className="pp-row">
              <PersonAvatar name={name} photo={photo} color={tier?.color} className="pp-row__avatar" />
              <div className="pp-row__text">
                <strong>{name}</strong>
                <small className={photo ? 'has-photo' : ''}>
                  {photo ? (order.publicListing ? p.public : p.private) : p.missing}
                </small>
              </div>
              <div className="pp-row__actions">
                <Button
                  size="sm"
                  variant={photo ? 'outline' : 'primary'}
                  iconLeft={photo ? 'edit' : 'camera'}
                  onClick={() => setEditing(position)}
                  aria-label={`${photo ? p.change : p.add} — ${name}`}
                  disabled={busy === position}
                >
                  {photo ? p.change : p.add}
                </Button>
                {photo && (
                  <button
                    type="button"
                    className="pp-row__remove"
                    onClick={() => remove(position)}
                    disabled={busy === position}
                    aria-label={`${p.remove} — ${name}`}
                    title={p.remove}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <p className="participant-photos__status" role="status" aria-live="polite">
        {status}
      </p>

      {editing && (
        <PhotoEditorDialog
          order={order}
          position={editing}
          name={order.attendees[editing - 1]}
          onClose={() => setEditing(null)}
          onSaved={(result) => {
            update(editing, result.src)
            setEditing(null)
            setStatus(p.saved)
          }}
        />
      )}
    </section>
  )
}
