import { Icon } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import SpeakerAvatar from './SpeakerAvatar'

/**
 * <SpeakerCard /> — carte d'un intervenant (inspirée de PyCon Cameroon) :
 * photo, catégorie, nom, fonction · organisation, thème, extrait du propos,
 * créneau. Toute la carte ouvre la fiche détaillée.
 */
export default function SpeakerCard({ speaker, category, categoryLabel, onOpen }) {
  const { t } = useI18n()
  const sp = t.speakers
  const d = t.speakerDetails[speaker.id]

  return (
    <article className={`speaker-card speaker-card--${category.color}`}>
      <div className="speaker-card__photo">
        <SpeakerAvatar speaker={speaker} color={category.color} />
        <span className="speaker-card__cat">
          <Icon name={category.icon} size={14} />
          {categoryLabel}
        </span>
        {speaker.example && <span className="speaker-card__example">{sp.exampleBadge}</span>}
      </div>
      <div className="speaker-card__body">
        <h3 className="speaker-card__name">{speaker.name}</h3>
        <p className="speaker-card__role">
          {d.role} · <span>{speaker.org}</span>
        </p>
        <p className="speaker-card__label">{sp.talkLabel}</p>
        <p className="speaker-card__talk">{d.talk}</p>
        <p className="speaker-card__abstract">
          <span className="visually-hidden">{sp.abstractLabel} : </span>
          {d.abstract}
        </p>
        <p className="speaker-card__session">
          <Icon name="calendar" size={14} />
          {sp.days[speaker.session.day]} · {speaker.session.time} · {sp.formats[speaker.session.format]}
        </p>
        {/* Bouton étiré sur toute la carte (pseudo-élément) : une seule cible, accessible */}
        <button type="button" className="speaker-card__open" onClick={() => onOpen(speaker.id)} aria-haspopup="dialog">
          {sp.viewProfile}
          <span className="visually-hidden"> — {speaker.name}</span>
          <Icon name="arrow-right" size={16} />
        </button>
      </div>
    </article>
  )
}
