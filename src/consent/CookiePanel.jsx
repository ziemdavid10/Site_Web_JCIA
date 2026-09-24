import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { CONSENT_CATEGORIES, useConsent } from './context'
import './CookiePanel.scss'

/**
 * <CookiePanel /> — fenêtre modale de préférences, catégorie par catégorie.
 * Accessibilité : role="dialog", focus placé dans la fenêtre à l'ouverture,
 * piégé à l'intérieur (Tab / Maj+Tab), Échap pour fermer, focus restitué ensuite.
 */
export default function CookiePanel() {
  const { panelOpen } = useConsent()
  // Le contenu est monté seulement à l'ouverture : ses choix sont ainsi
  // réinitialisés à partir du consentement enregistré à chaque ouverture.
  return panelOpen ? <CookiePanelDialog /> : null
}

function CookiePanelDialog() {
  const { t } = useI18n()
  const { consent, save, acceptAll, rejectAll, closePanel } = useConsent()
  const p = t.cookies.panel
  const dialogRef = useRef(null)

  const [choices, setChoices] = useState(() =>
    Object.fromEntries(CONSENT_CATEGORIES.map((c) => [c, c === 'necessary' || Boolean(consent?.choices?.[c])])),
  )

  // Focus initial, piège à focus, Échap, restitution du focus
  useEffect(() => {
    const previouslyFocused = document.activeElement
    const dialog = dialogRef.current
    const focusables = () => [...dialog.querySelectorAll('button, [href], input:not([disabled])')]
    focusables()[0]?.focus()
    document.body.style.overflow = 'hidden'

    const onKey = (e) => {
      if (e.key === 'Escape') closePanel()
      if (e.key !== 'Tab') return
      const items = focusables()
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previouslyFocused?.focus?.()
    }
  }, [closePanel])

  return (
    <div className="cookie-panel" onMouseDown={(e) => e.target === e.currentTarget && closePanel()}>
      <div className="cookie-panel__dialog" role="dialog" aria-modal="true" aria-labelledby="cookie-panel-title" ref={dialogRef}>
        <header className="cookie-panel__head">
          <h2 id="cookie-panel-title">{p.title}</h2>
          <button type="button" className="cookie-panel__close" onClick={closePanel} aria-label={p.close}>
            <Icon name="close" size={22} />
          </button>
        </header>

        <p className="cookie-panel__intro">{p.intro}</p>

        <ul className="cookie-panel__list">
          {CONSENT_CATEGORIES.map((cat) => {
            const locked = cat === 'necessary'
            const id = `consent-${cat}`
            return (
              <li key={cat} className="cookie-panel__item">
                <div>
                  <label htmlFor={id}>{p.categories[cat].title}</label>
                  <p id={`${id}-desc`}>{p.categories[cat].text}</p>
                </div>
                {locked ? (
                  <span className="cookie-panel__always">{p.alwaysOn}</span>
                ) : (
                  // Interrupteur accessible : case à cocher stylée en « switch »
                  <input
                    id={id}
                    type="checkbox"
                    role="switch"
                    className="cookie-panel__switch"
                    checked={choices[cat]}
                    aria-describedby={`${id}-desc`}
                    onChange={(e) => setChoices((c) => ({ ...c, [cat]: e.target.checked }))}
                  />
                )}
              </li>
            )
          })}
        </ul>

        <footer className="cookie-panel__actions">
          <button type="button" className="cookie-panel__btn" onClick={rejectAll}>
            {p.reject}
          </button>
          <button type="button" className="cookie-panel__btn" onClick={acceptAll}>
            {p.accept}
          </button>
          <button type="button" className="cookie-panel__btn cookie-panel__btn--primary" onClick={() => save(choices)}>
            {p.save}
          </button>
        </footer>
      </div>
    </div>
  )
}
