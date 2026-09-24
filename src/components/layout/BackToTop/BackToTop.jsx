import useScrollPosition from '@/hooks/useScrollPosition'
import { useI18n } from '@/i18n/context'
import { useTheme } from '@/theme/context'
import mascot from '@/assets/images/brand/mascot.webp'
import mascotWhite from '@/assets/images/brand/mascot-white.webp'
import './BackToTop.scss'

/**
 * <BackToTop /> — la mascotte des JCIA ramène en haut de page.
 * Apparaît après un défilement d'un écran environ ; version blanche en thème sombre.
 */
export default function BackToTop() {
  const y = useScrollPosition()
  const { t } = useI18n()
  const { isDark } = useTheme()
  const visible = y > 900

  return (
    <a
      href="#top"
      onClick={(e) => {
        // Fonctionne sur toutes les pages, y compris sans section #top
        e.preventDefault()
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }}
      className={`back-to-top ${visible ? 'is-visible' : ''}`}
      aria-label={t.a11y.backToTop}
      tabIndex={visible ? 0 : -1}
    >
      <span className="back-to-top__bubble" aria-hidden="true">
        {t.a11y.backToTopBubble}
      </span>
      <img src={isDark ? mascotWhite : mascot} alt="" width="56" height="74" />
    </a>
  )
}
