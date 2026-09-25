import { Link } from 'react-router'
import { useI18n } from '@/i18n/context'
import { CONFIG } from '@/data/config'
import { useConsent } from './context'
import './CookieBanner.scss'

/**
 * <CookieBanner /> — bandeau de consentement affiché tant qu'aucun choix
 * n'a été fait. « Tout refuser » est aussi visible et accessible que
 * « Tout accepter », conformément aux bonnes pratiques.
 */
export default function CookieBanner() {
  const { t } = useI18n()
  const { hasDecided, acceptAll, rejectAll, openPanel, panelOpen } = useConsent()
  const b = t.cookies.banner

  if (hasDecided || panelOpen) return null

  return (
    <section className="cookie-banner" role="region" aria-labelledby="cookie-banner-title" aria-live="polite">
      <div className="cookie-banner__inner">
        <div className="cookie-banner__text">
          <h2 id="cookie-banner-title">
            <span className="cookie-banner__icon" aria-hidden="true">
              {/* Petit « cookie » en forme de losange aux couleurs JCIA */}
              <i />
              <i />
              <i />
            </span>
            {b.title}
          </h2>
          <p>
            {b.text}{' '}
            <Link to={CONFIG.routes.cookies} className="inline-link">
              {b.learnMore}
            </Link>
          </p>
        </div>
        <div className="cookie-banner__actions">
          <button type="button" className="cookie-banner__btn" onClick={rejectAll}>
            {b.reject}
          </button>
          <button type="button" className="cookie-banner__btn" onClick={openPanel}>
            {b.customize}
          </button>
          <button type="button" className="cookie-banner__btn cookie-banner__btn--primary" onClick={acceptAll}>
            {b.accept}
          </button>
        </div>
      </div>
    </section>
  )
}
