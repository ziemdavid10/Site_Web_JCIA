import { Icon, PersonAvatar } from '@/components/ui'
import { useI18n } from '@/i18n/context'

/**
 * <AttendeeCard /> — carte d'un participant, sur le même modèle que celle des
 * intervenants : photo (ou avatar dessiné), profil, nom, fonction ·
 * organisation, phrase de motivation, ville et billet. Toute la carte ouvre la
 * fiche détaillée.
 *
 * Seules les informations que la personne a accepté de rendre publiques sont
 * affichées — jamais son e-mail ni son téléphone.
 */
export default function AttendeeCard({ attendee, profile, profileLabel, onOpen }) {
  const { t } = useI18n()
  const a = t.attendees
  const d = t.attendeeDetails?.[attendee.id]
  const tier = attendee.tier ? t.tickets.tiers[attendee.tier] : null

  return (
    <article className={`attendee-card attendee-card--${profile.color} ${attendee.own ? 'is-own' : ''}`}>
      <div className="attendee-card__photo">
        <PersonAvatar name={attendee.name} photo={attendee.photo} color={profile.color} className="attendee-card__avatar" />
        <span className="attendee-card__profile">
          <Icon name={profile.icon} size={14} />
          {profileLabel}
        </span>
        {attendee.own && <span className="attendee-card__you">{a.you}</span>}
        {attendee.example && !attendee.own && <span className="attendee-card__example">{a.exampleBadge}</span>}
      </div>

      <div className="attendee-card__body">
        <h3 className="attendee-card__name">{attendee.name}</h3>
        <p className="attendee-card__role">
          {attendee.role || d?.role || a.defaultRole}
          {attendee.org && (
            <>
              {' · '}
              <span>{attendee.org}</span>
            </>
          )}
        </p>

        {d?.motivation && <p className="attendee-card__motivation">{d.motivation}</p>}

        <p className="attendee-card__meta">
          {attendee.city && (
            <span>
              <Icon name="pin" size={14} /> {attendee.city}
            </span>
          )}
          {tier && (
            <span>
              <Icon name="ticket" size={14} /> {tier.name}
            </span>
          )}
        </p>

        {/* Bouton étiré sur toute la carte : une seule cible, accessible */}
        <button type="button" className="attendee-card__open" onClick={() => onOpen(attendee.id)} aria-haspopup="dialog">
          {a.viewProfile}
          <span className="visually-hidden"> — {attendee.name}</span>
          <Icon name="arrow-right" size={16} />
        </button>
      </div>
    </article>
  )
}
