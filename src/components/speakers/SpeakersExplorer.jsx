import { useId, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Icon } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { rich } from '@/i18n/rich'
import { fill } from '@/i18n/format'
import { CONFIG } from '@/data/config'
import { SPEAKERS, SPEAKER_CATEGORIES } from '@/data/speakers'
import SpeakerCard from './SpeakerCard'
import SpeakerDialog from './SpeakerDialog'
import './Speakers.scss'

const normalize = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/**
 * <SpeakersExplorer /> — liste directe des intervenants.
 *
 * Les catégories restent utilisées comme métadonnées internes
 * (couleurs, icônes, organisation des données), mais ne sont plus
 * affichées comme étape de navigation.
 *
 * La liste affiche directement tous les intervenants et permet :
 *  - la recherche plein texte sur la page /intervenants ;
 *  - l'ouverture de la fiche détaillée ;
 *  - l'accès à la page complète depuis la section d'accueil.
 */
export default function SpeakersExplorer({ mode = 'home' }) {
  const { t } = useI18n()
  const sp = t.speakers
  const isPage = mode === 'page'

  const locked = !CONFIG.features.speakerDirectory
  const uid = useId()
  const [params, setParams] = useSearchParams()

  const [localOpen, setLocalOpen] = useState(null)
  const [query, setQuery] = useState('')

  const urlOpen = params.get('intervenant')

  const openId = isPage
    ? SPEAKERS.some((s) => s.id === urlOpen)
      ? urlOpen
      : null
    : localOpen

  const setOpen = (id) => {
    if (!isPage) {
      setLocalOpen(id)
      return
    }

    const next = new URLSearchParams(params)

    if (id) {
      next.set('intervenant', id)
    } else {
      next.delete('intervenant')
    }

    setParams(next, {
      replace: true,
      preventScrollReset: true,
    })
  }

  // ---------------------------------------------------------------------------
  // Métadonnées des catégories
  // ---------------------------------------------------------------------------

  const labelOf = (id) =>
    sp.profiles.find((p) => p.id === id)?.label ?? id

  const catOf = (id) =>
    SPEAKER_CATEGORIES.find((c) => c.id === id)

  // ---------------------------------------------------------------------------
  // Liste directe de tous les intervenants + recherche
  // ---------------------------------------------------------------------------

  const results = useMemo(() => {
  const q = normalize(query.trim())

  const filtered = SPEAKERS.filter((s) => {
    if (!q) return true

    const d = t.speakerDetails[s.id]

    return normalize(
      `${s.name} ${s.org} ${d.role} ${d.talk} ${d.abstract}`
    ).includes(q)
  })

  // Sur l'accueil :
  // - sans recherche → seulement les 8 premiers
  // - avec recherche → rechercher dans tous les intervenants
  //
  // Sur la page complète :
  // → afficher tous les intervenants
  if (!isPage && !q) {
    return filtered.slice(0, 8)
  }

  return filtered
}, [isPage, query, t.speakerDetails])

  const openSpeaker =
    SPEAKERS.find((s) => s.id === openId) ?? null

  const hasExamples = results.some((s) => s.example)

  return (
    <div className={`speakers-explorer speakers-explorer--${mode}`}>
      {/* ---------------------------------------------------------------------
          Barre de recherche
          --------------------------------------------------------------------- */}
      {isPage && !locked && (
        <div className="speakers-toolbar">
          <label
            className="speakers-search"
            htmlFor={`${uid}-search`}
          >
            <span className="visually-hidden">
              {sp.searchLabel}
            </span>

            <Icon name="search" size={20} />

            <input
              id={`${uid}-search`}
              type="search"
              maxLength={80}
              value={query}
              placeholder={sp.searchPlaceholder}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
          </label>

          <p
            className="speakers-toolbar__count"
            aria-live="polite"
          >
            {fill(sp.count, { n: results.length })}
          </p>
        </div>
      )}

      {/* ---------------------------------------------------------------------
          Liste directe des intervenants
          --------------------------------------------------------------------- */}
      <div
        id={`${uid}-list`}
        className="speakers-list"
        aria-live="polite"
      >
        {locked ? (
          <div className="speakers-locked">
            <span
              className="speakers-locked__icon"
              aria-hidden="true"
            >
              <Icon name="lock" size={26} />
            </span>

            <h3>{sp.lockedTitle}</h3>
            <p>{sp.lockedText}</p>
          </div>
        ) : results.length === 0 ? (
          <p className="speakers-list__empty">
            {query ? sp.noResults : sp.empty}
          </p>
        ) : (
          <>
            {!isPage && (
              <h3 className="speakers-list__title">
                {fill(sp.count, { n: results.length })}
              </h3>
            )}

            <ul className="speakers-grid">
              {results.map((s, i) => (
                <li key={s.id} style={{ '--i': i }}>
                  <SpeakerCard
                    speaker={s}
                    category={catOf(s.category)}
                    onOpen={setOpen}
                  />
                </li>
              ))}
            </ul>

            {hasExamples && (
              <p className="speakers-list__note">
                {rich(sp.exampleNote)}
              </p>
            )}

            {!isPage && (
              <p className="speakers-list__more">
                <Link to={`${CONFIG.routes.speakers}#liste`}>
                  {sp.seeAll}
                  <Icon name="arrow-right" size={16} />
                </Link>
              </p>
            )}
          </>
        )}
      </div>

      {/* ---------------------------------------------------------------------
          Fiche détaillée
          --------------------------------------------------------------------- */}
      <SpeakerDialog
        speaker={locked ? null : openSpeaker}
        category={
          openSpeaker
            ? catOf(openSpeaker.category)
            : null
        }
        onClose={() => setOpen(null)}
      />
    </div>
  )
}
