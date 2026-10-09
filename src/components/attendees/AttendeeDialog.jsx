import { useEffect, useRef } from 'react'
import { Icon, PersonAvatar } from '@/components/ui'
import { useI18n } from '@/i18n/context'

/**
 * <AttendeeDialog /> — fiche détaillée d'un participant, dans une fenêtre
 * modale native (<dialog>) : piège du focus, touche Échap et fond assombri
 * fournis par le navigateur. Le focus revient sur la carte à la fermeture.
 */
export default function AttendeeDialog({ attendee, profile, profileLabel, onClose }) {
  const { t } = useI18n()
  const a = t.attendees
  const ref = useRef(null)
  const d = attendee ? t.attendeeDetails?.[attendee.id] : null

  useEffect(() => {
    const dialog = ref.current
    if (!dialog || !attendee) return undefined
    const opener = document.activeElement
    if (!dialog.open) dialog.showModal?.()
    return () => {
      if (dialog.open) dialog.close()
      opener?.focus?.()
    }
  }, [attendee])

  if (!attendee) return null
  const tier = attendee.tier ? t.tickets.tiers[attendee.tier] : null

  return (
    <dialog
      ref={ref}
      className={`attendee-dialog attendee-card--${profile.color}`}
      aria-labelledby="attendee-dialog-name"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()} // clic sur le fond
    >
      <div className="attendee-dialog__box">
        <button type="button" className="attendee-dialog__close" onClick={onClose} aria-label={a.close}>
          <Icon name="close" size={22} />
        </button>

        <div className="attendee-dialog__photo">
          <PersonAvatar name={attendee.name} photo={attendee.photo} color={profile.color} className="attendee-card__avatar" />
        </div>

        <div className="attendee-dialog__content">
          <p className="attendee-card__profile attendee-card__profile--static">
            <Icon name={profile.icon} size={14} />
            {profileLabel}
            {attendee.example && !attendee.own && (
              <span className="attendee-card__example attendee-card__example--inline">{a.exampleBadge}</span>
            )}
          </p>

          <h2 id="attendee-dialog-name">{attendee.name}</h2>
          <p className="attendee-card__role">
            {attendee.role || d?.role || a.defaultRole}
            {attendee.org && (
              <>
                {' · '}
                <span>{attendee.org}</span>
              </>
            )}
          </p>

          <dl className="attendee-dialog__facts">
            {attendee.city && (
              <div>
                <dt>
                  <Icon name="pin" size={15} /> {a.cityLabel}
                </dt>
                <dd>{attendee.city}</dd>
              </div>
            )}
            {tier && (
              <div>
                <dt>
                  <Icon name="ticket" size={15} /> {a.tierLabel}
                </dt>
                <dd>{tier.name}</dd>
              </div>
            )}
          </dl>

          {d?.motivation && (
            <>
              <p className="attendee-dialog__label">{a.motivationLabel}</p>
              <p className="attendee-dialog__motivation">{d.motivation}</p>
            </>
          )}

          {d?.interests?.length > 0 && (
            <>
              <p className="attendee-dialog__label">{a.interestsLabel}</p>
              <ul className="attendee-dialog__interests">
                {d.interests.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}

          <p className="attendee-dialog__privacy">
            <Icon name="shield" size={15} /> {a.privacyNote}
          </p>
        </div>
      </div>
    </dialog>
  )
}
