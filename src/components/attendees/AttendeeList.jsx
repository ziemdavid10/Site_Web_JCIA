import { useId, useMemo, useState } from 'react'
import { Icon, Reveal } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { fill } from '@/i18n/format'
import { ATTENDEE_PROFILES } from '@/data/attendees'
import { allAttendees } from '@/services/attendees'
import './Attendees.scss'

/** Initiales d'un nom (deux lettres au plus), sans les titres */
function initials(name) {
  return name
    .replace(/^(Pr|Dr|S\.E\.|M\.|Mme)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

const normalize = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/**
 * <AttendeeList /> — « Ils y seront » : les personnes ayant réservé leur place
 * et accepté de figurer publiquement.
 *
 *  • mode « home » : les 8 premiers, sans filtre ni recherche ;
 *  • mode « page » : tous, avec filtres par profil et recherche plein texte.
 *
 * Seules des informations publiques sont affichées (nom, organisation, ville,
 * profil) : la liste ne contient que des inscrits ayant coché la case prévue
 * au moment de la commande.
 *
 * @param {'home'|'page'} mode
 * @param {number} limit  nombre de cartes en mode « home »
 */
export default function AttendeeList({ mode = 'home', limit = 8 }) {
  const { t } = useI18n()
  const a = t.attendees
  const isPage = mode === 'page'
  const uid = useId()
  const [profile, setProfile] = useState('all')
  const [query, setQuery] = useState('')

  const people = useMemo(() => allAttendees(), [])
  const labelOf = (id) => a.profiles.find((p) => p.id === id)?.label ?? id
  const colorOf = (id) => ATTENDEE_PROFILES.find((p) => p.id === id)?.color ?? 'orange'
  const iconOf = (id) => ATTENDEE_PROFILES.find((p) => p.id === id)?.icon ?? 'user'

  const results = useMemo(() => {
    const q = normalize(query.trim())
    return people
      .filter((p) => profile === 'all' || p.profile === profile)
      .filter((p) => !q || normalize(`${p.name} ${p.org} ${p.city}`).includes(q))
  }, [people, profile, query])

  const shown = isPage ? results : results.slice(0, limit)
  const hasExamples = shown.some((p) => p.example)

  return (
    <div className={`attendees attendees--${mode}`}>
      {/* --- Filtres et recherche (page) ------------------------------------- */}
      {isPage && (
        <div className="attendees__toolbar">
          <ul className="attendees__filters" aria-label={a.filterLabel}>
            {[{ id: 'all', label: a.all }, ...a.profiles].map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={`attendees__filter ${profile === p.id ? 'is-active' : ''}`}
                  aria-pressed={profile === p.id}
                  onClick={() => setProfile(p.id)}
                >
                  {p.label}
                  <span>{p.id === 'all' ? people.length : people.filter((x) => x.profile === p.id).length}</span>
                </button>
              </li>
            ))}
          </ul>

          <label className="attendees__search" htmlFor={`${uid}-search`}>
            <span className="visually-hidden">{a.searchLabel}</span>
            <Icon name="search" size={20} />
            <input
              id={`${uid}-search`}
              type="search"
              maxLength={80}
              value={query}
              placeholder={a.searchPlaceholder}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
          </label>
        </div>
      )}

      {isPage && (
        <p className="attendees__count" aria-live="polite">
          {fill(a.count, { n: results.length })}
        </p>
      )}

      {/* --- Cartes ---------------------------------------------------------- */}
      {shown.length === 0 ? (
        <p className="attendees__empty">{query ? a.noResults : a.empty}</p>
      ) : (
        <ul className="attendees__grid">
          {shown.map((p, i) => (
            <Reveal as="li" key={p.id} delay={(i % 4) * 60} className={`attendee-card ${p.own ? 'is-own' : ''}`}>
              <span className={`attendee-card__avatar attendee-card__avatar--${colorOf(p.profile)}`} aria-hidden="true">
                {initials(p.name)}
              </span>
              <span className="attendee-card__body">
                <strong>{p.name}</strong>
                {p.org && <small>{p.org}</small>}
                <span className="attendee-card__meta">
                  <Icon name={iconOf(p.profile)} size={13} />
                  {labelOf(p.profile)}
                  {p.city && <> · {p.city}</>}
                </span>
              </span>
              {p.own && <span className="attendee-card__you">{a.you}</span>}
            </Reveal>
          ))}
        </ul>
      )}

      {hasExamples && <p className="attendees__note">{a.exampleNote}</p>}
    </div>
  )
}
