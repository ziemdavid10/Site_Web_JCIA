import { useId } from 'react'
import { useTheme } from '@/theme/context'
import { useI18n } from '@/i18n/context'
import './ThemeToggle.scss'

/**
 * <ThemeToggle /> — bascule clair / sombre.
 * Icône animée : le soleil (point orange du logo) se transforme en lune.
 */
export default function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme()
  const { t } = useI18n()
  const maskId = `theme-mask-${useId().replace(/:/g, '')}` // unique si plusieurs boutons
  const label = isDark ? t.switchers.theme.toLight : t.switchers.theme.toDark

  return (
    <button
      type="button"
      className={`theme-toggle ${isDark ? 'is-dark' : ''} ${className}`.trim()}
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        {/* Masque : un disque qui « mord » le soleil pour dessiner la lune */}
        <mask id={maskId}>
          <rect width="24" height="24" fill="#fff" />
          <circle className="theme-toggle__bite" cx="24" cy="4" r="7" fill="#000" />
        </mask>
        <circle className="theme-toggle__core" cx="12" cy="12" r="5" mask={`url(#${maskId})`} />
        <g className="theme-toggle__rays">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line key={deg} x1="12" y1="1.8" x2="12" y2="4" transform={`rotate(${deg} 12 12)`} />
          ))}
        </g>
      </svg>
    </button>
  )
}
