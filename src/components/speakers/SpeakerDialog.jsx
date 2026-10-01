import { useEffect, useRef } from 'react'
import { Icon } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { safeExternalUrl } from '@/security/sanitize'
import SpeakerAvatar from './SpeakerAvatar'

/**
 * <SpeakerDialog /> — fiche détaillée d'un intervenant,
 * dans une fenêtre modale native (<dialog>).
 *
 * La catégorie n'est plus affichée dans la fiche.
 * Elle reste utilisée en interne pour la couleur visuelle.
 */
export default function SpeakerDialog({
  speaker,
  category,
  onClose,
}) {
  const { t, lang } = useI18n()
  const sp = t.speakers
  const ref = useRef(null)

  const d = speaker
    ? t.speakerDetails[speaker.id]
    : null

  useEffect(() => {
    const dialog = ref.current

    if (!dialog || !speaker) {
      return undefined
    }

    const opener = document.activeElement

    if (!dialog.open) {
      dialog.showModal?.()
    }

    return () => {
      if (dialog.open) {
        dialog.close()
      }

      opener?.focus?.()
    }
  }, [speaker])

  if (!speaker) {
    return null
  }

  const links = Object.entries(
    speaker.links ?? {}
  )
    .map(([k, url]) => [
      k,
      safeExternalUrl(url),
    ])
    .filter(([, url]) => url)

  return (
    <dialog
      ref={ref}
      className={`speaker-dialog speaker-card--${category.color}`}
      aria-labelledby="speaker-dialog-name"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="speaker-dialog__box">
        <button
          type="button"
          className="speaker-dialog__close"
          onClick={onClose}
          aria-label={sp.close}
        >
          <Icon name="close" size={22} />
        </button>

        <div className="speaker-dialog__photo">
          <SpeakerAvatar
            speaker={speaker}
            color={category.color}
          />
        </div>

        <div className="speaker-dialog__content">
          <h2 id="speaker-dialog-name">
            {speaker.name}
          </h2>

          <p className="speaker-card__role">
            {d.role}
            {' · '}
            <span>{speaker.org}</span>
          </p>

          <h3>{sp.talkLabel}</h3>

          <p className="speaker-dialog__talk">
            {d.talk}
          </p>

          <h3>{sp.abstractLabel}</h3>

          <p>
            {d.abstract}
          </p>

          <h3>{sp.bioLabel}</h3>

          <a
            href={d.bio}
            target="_blank"
            rel="noopener noreferrer"
          >
            {d.bio}
          </a>

          <p className="speaker-dialog__session">
            <Icon name="calendar" size={16} />

            <span>
              <strong>
                {sp.sessionLabel}
                {lang === 'fr'
                  ? '\u00a0:'
                  : ':'}
              </strong>{' '}
              {sp.days[speaker.session.day]}
              {' · '}
              {speaker.session.time}
              {' · '}
              {sp.formats[speaker.session.format]}
            </span>
          </p>

          {links.length > 0 && (
            <ul
              className="speaker-dialog__links"
              aria-label={sp.socials}
            >
              {links.map(([k, url]) => (
                <li key={k}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${k} — ${speaker.name}`}
                  >
                    <Icon
                      name={
                        k === 'website'
                          ? 'link'
                          : k
                      }
                      size={18}
                    />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </dialog>
  )
}
