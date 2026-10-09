import { useId, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Icon, Reveal } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { fill } from '@/i18n/format'
import { ATTENDEE_PROFILES } from '@/data/attendees'
import useAttendees from '@/hooks/useAttendees'
import AttendeeCard from './AttendeeCard'
import AttendeeDialog from './AttendeeDialog'
import './Attendees.scss'

const PROFILE_IDS = ATTENDEE_PROFILES.map((p) => p.id)
const normalize = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/**
 * <AttendeeList /> — « Ils y seront » : les personnes ayant réservé leur place
 * et accepté de figurer publiquement, présentées comme les intervenants
 * (photo, fonction, motivation, fiche détaillée).
 *
 *  • mode « home » : les premières cartes, sans filtre ni recherche ;
 *  • mode « page » : toutes, avec filtres par profil, recherche plein texte et
 *    fiche partageable (?profil=…&participant=…).
 *
 * Les paramètres d'URL sont validés contre des listes connues : rien de ce qui
 * vient de l'adresse n'est affiché tel quel.
 *
 * @param {'home'|'page'} mode
 * @param {number} limit  nombre de cartes en mode « home »
 */
export default function AttendeeList({ mode = 'home', limit = 8 }) {
  const { t } = useI18n()
  const a = t.attendees
  const isPage = mode === 'page'
  const uid = useId()
  const [params, setParams] = useSearchParams()
  const [localProfile, setLocalProfile] = useState('all')
  const [localOpen, setLocalOpen] = useState(null)
  const [query, setQuery] = useState('')

  const people = useAttendees()

  // Sur la page, le filtre et la fiche ouverte vivent dans l'URL (lien partageable)
  const urlProfile = params.get('profil')
  const profile = isPage ? (PROFILE_IDS.includes(urlProfile) ? urlProfile : 'all') : localProfile
  const urlOpen = params.get('participant')
  const openId = isPage ? (people.some((p) => p.id === urlOpen) ? urlOpen : null) : localOpen

  const setProfile = (id) => {
    if (!isPage) return setLocalProfile(id)
    const next = new URLSearchParams(params)
    if (id === 'all') next.delete('profil')
    else next.set('profil', id)
    next.delete('participant')
    setParams(next, { replace: true, preventScrollReset: true })
  }

  const setOpen = (id) => {
    if (!isPage) return setLocalOpen(id)
    const next = new URLSearchParams(params)
    if (id) next.set('participant', id)
    else next.delete('participant')
    setParams(next, { replace: true, preventScrollReset: true })
  }

  const labelOf = (id) => a.profiles.find((p) => p.id === id)?.label ?? id
  const profileOf = (id) => ATTENDEE_PROFILES.find((p) => p.id === id) ?? ATTENDEE_PROFILES[0]

  const results = useMemo(() => {
    const q = normalize(query.trim())
    return people
      .filter((p) => profile === 'all' || p.profile === profile)
      .filter((p) => {
        if (!q) return true
        const d = t.attendeeDetails?.[p.id]
        return normalize(`${p.name} ${p.org} ${p.city} ${p.role ?? ''} ${d?.role ?? ''}`).includes(q)
      })
  }, [people, profile, query, t.attendeeDetails])

  const shown = isPage ? results : results.slice(0, limit)
  const hasExamples = shown.some((p) => p.example && !p.own)
  const openAttendee = people.find((p) => p.id === openId) ?? null

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
        <ul className="attendees__grid" key={profile /* relance l'animation d'entrée */}>
          {shown.map((p, i) => (
            <Reveal as="li" key={p.id} delay={(i % 4) * 70} style={{ '--i': i }}>
              <AttendeeCard
                attendee={p}
                profile={profileOf(p.profile)}
                profileLabel={labelOf(p.profile)}
                onOpen={setOpen}
              />
            </Reveal>
          ))}
        </ul>
      )}

      {hasExamples && <p className="attendees__note">{a.exampleNote}</p>}

      <AttendeeDialog
        attendee={openAttendee}
        profile={openAttendee ? profileOf(openAttendee.profile) : ATTENDEE_PROFILES[0]}
        profileLabel={openAttendee ? labelOf(openAttendee.profile) : ''}
        onClose={() => setOpen(null)}
      />
    </div>
  )
}
