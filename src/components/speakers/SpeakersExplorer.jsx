import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Icon, Reveal } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { rich } from '@/i18n/rich'
import { fill } from '@/i18n/format'
import { CONFIG } from '@/data/config'
import { SPEAKERS, SPEAKER_CATEGORIES } from '@/data/speakers'
import SpeakerCard from './SpeakerCard'
import SpeakerDialog from './SpeakerDialog'
import './Speakers.scss'

const CATEGORY_IDS = SPEAKER_CATEGORIES.map((c) => c.id)
const normalize = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/**
 * <SpeakersExplorer /> — catégories d'intervenants cliquables + liste en cartes.
 *
 *  • mode « home » (section de l'accueil) : aucune catégorie choisie au départ ;
 *    un clic sur une catégorie déplie ses intervenants sous la grille.
 *  • mode « page » (/intervenants) : toutes les catégories au départ, recherche
 *    plein texte ; la catégorie et la fiche ouverte sont gardées dans l'URL
 *    (?categorie=recherche&intervenant=…) pour pouvoir partager un lien.
 *
 * Les paramètres d'URL sont validés contre des listes connues (jamais affichés tels quels).
 */
export default function SpeakersExplorer({ mode = 'home' }) {
  const { t } = useI18n()
  const sp = t.speakers
  const isPage = mode === 'page'
  /**
   * Liste détaillée bloquée (CONFIG.features.speakerDirectory = false) :
   * les catégories restent visibles — elles disent la composition du plateau —
   * mais ne sont plus cliquables et aucune fiche n'est rendue. Repasser le
   * drapeau à `true` restitue tout le parcours, sans autre modification.
   */
  const locked = !CONFIG.features.speakerDirectory
  const uid = useId()
  const [params, setParams] = useSearchParams()

  // --- État : dans l'URL sur la page, local sur l'accueil -----------------------------
  const [localCat, setLocalCat] = useState(null)
  const [localOpen, setLocalOpen] = useState(null)
  const [query, setQuery] = useState('')
  const listRef = useRef(null)
  const catsRef = useRef(null)

  const urlCat = params.get('categorie')
  const category = isPage ? (CATEGORY_IDS.includes(urlCat) ? urlCat : 'all') : localCat
  const urlOpen = params.get('intervenant')
  const openId = isPage ? (SPEAKERS.some((s) => s.id === urlOpen) ? urlOpen : null) : localOpen

  const setCategory = (id) => {
    if (!isPage) {
      setLocalCat((cur) => (cur === id ? null : id))
      // Téléphone / tablette : amène la liste sous les yeux après le choix
      if (window.innerWidth < 1024) {
        setTimeout(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
      }
      return
    }
    const next = new URLSearchParams(params)
    if (id === 'all') next.delete('categorie')
    else next.set('categorie', id)
    next.delete('intervenant')
    setParams(next, { replace: true, preventScrollReset: true })
  }

  const setOpen = (id) => {
    if (!isPage) return setLocalOpen(id)
    const next = new URLSearchParams(params)
    if (id) next.set('intervenant', id)
    else next.delete('intervenant')
    setParams(next, { replace: true, preventScrollReset: true })
  }

  // --- Libellés et compteurs --------------------------------------------------------------
  const labelOf = (id) => sp.profiles.find((p) => p.id === id)?.label ?? id
  const catOf = (id) => SPEAKER_CATEGORIES.find((c) => c.id === id)
  const countOf = (id) => SPEAKERS.filter((s) => s.category === id).length

  const results = useMemo(() => {
    if (!category) return []
    const q = normalize(query.trim())
    return SPEAKERS.filter((s) => category === 'all' || s.category === category).filter((s) => {
      if (!q) return true
      const d = t.speakerDetails[s.id]
      return normalize(`${s.name} ${s.org} ${d.role} ${d.talk} ${d.abstract}`).includes(q)
    })
  }, [category, query, t.speakerDetails])

  // Page, téléphone : la catégorie active est ramenée dans la bande défilante
  useEffect(() => {
    if (!isPage) return
    const bar = catsRef.current
    const active = bar?.querySelector('.is-active')
    if (!bar || !active || bar.scrollWidth <= bar.clientWidth) return
    bar.scrollTo({ left: active.parentElement.offsetLeft - bar.clientWidth / 2 + active.clientWidth / 2, behavior: 'smooth' })
  }, [category, isPage])

  const openSpeaker = SPEAKERS.find((s) => s.id === openId) ?? null
  const hasExamples = results.some((s) => s.example)

  return (
    <div className={`speakers-explorer speakers-explorer--${mode}`}>
      {/* --- Catégories (boutons bascule) ---------------------------------------- */}
      <ul ref={catsRef} className="speaker-cats" aria-label={sp.filterLabel}>
        {isPage && !locked && (
          <li>
            <button
              type="button"
              className={`speaker-cat speaker-cat--all ${category === 'all' ? 'is-active' : ''}`}
              aria-pressed={category === 'all'}
              aria-controls={`${uid}-list`}
              onClick={() => setCategory('all')}
            >
              <span className="speaker-cat__icon" aria-hidden="true">
                <Icon name="users" size={24} />
              </span>
              <span className="speaker-cat__label">{sp.all}</span>
              <span className="speaker-cat__count">{SPEAKERS.length}</span>
            </button>
          </li>
        )}
        {SPEAKER_CATEGORIES.map((c, i) => (
          <Reveal as="li" key={c.id} delay={(i % 4) * 60}>
            <button
              type="button"
              className={`speaker-cat speaker-cat--${c.color} ${category === c.id ? 'is-active' : ''} ${locked ? 'is-locked' : ''}`}
              aria-pressed={locked ? undefined : category === c.id}
              aria-controls={locked ? undefined : `${uid}-list`}
              disabled={locked}
              title={locked ? sp.lockedTitle : undefined}
              onClick={() => setCategory(c.id)}
            >
              <span className="speaker-cat__icon" aria-hidden="true">
                <Icon name={c.icon} size={24} />
              </span>
              <span className="speaker-cat__label">{labelOf(c.id)}</span>
              <span className="speaker-cat__count">{locked ? sp.lockedTag : countOf(c.id) || sp.soon}</span>
            </button>
          </Reveal>
        ))}
      </ul>

      {/* --- Barre d'outils (page) ----------------------------------------------------- */}
      {isPage && !locked && (
        <div className="speakers-toolbar">
          <label className="speakers-search" htmlFor={`${uid}-search`}>
            <span className="visually-hidden">{sp.searchLabel}</span>
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
          <p className="speakers-toolbar__count" aria-live="polite">
            {fill(sp.count, { n: results.length })}
          </p>
        </div>
      )}

      {/* --- Liste ------------------------------------------------------------------------ */}
      <div id={`${uid}-list`} ref={listRef} className="speakers-list" aria-live="polite">
        {locked ? (
          <div className="speakers-locked">
            <span className="speakers-locked__icon" aria-hidden="true">
              <Icon name="lock" size={26} />
            </span>
            <h3>{sp.lockedTitle}</h3>
            <p>{sp.lockedText}</p>
          </div>
        ) : !category ? (
          <p className="speakers-list__hint">
            <Icon name="arrow-up" size={18} /> {sp.choose}
          </p>
        ) : results.length === 0 ? (
          <p className="speakers-list__empty">{query ? sp.noResults : sp.empty}</p>
        ) : (
          <>
            {!isPage && (
              <h3 className="speakers-list__title">
                {labelOf(category)} <span>· {fill(sp.count, { n: results.length })}</span>
              </h3>
            )}
            <ul className="speakers-grid" key={category /* relance l'animation d'entrée */}>
              {results.map((s, i) => (
                <li key={s.id} style={{ '--i': i }}>
                  <SpeakerCard speaker={s} category={catOf(s.category)} categoryLabel={labelOf(s.category)} onOpen={setOpen} />
                </li>
              ))}
            </ul>
            {hasExamples && <p className="speakers-list__note">{rich(sp.exampleNote)}</p>}
            {!isPage && (
              <p className="speakers-list__more">
                <Link to={`${CONFIG.routes.speakers}?categorie=${category}#liste`}>
                  {sp.seeAll} <Icon name="arrow-right" size={16} />
                </Link>
              </p>
            )}
          </>
        )}
      </div>

      <SpeakerDialog
        speaker={locked ? null : openSpeaker}
        category={openSpeaker ? catOf(openSpeaker.category) : null}
        categoryLabel={openSpeaker ? labelOf(openSpeaker.category) : ''}
        onClose={() => setOpen(null)}
      />
    </div>
  )
}
