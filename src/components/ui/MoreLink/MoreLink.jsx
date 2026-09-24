import { Link, useLocation } from 'react-router'
import Icon from '../Icon/Icon'
import { useI18n } from '@/i18n/context'
import { CONFIG } from '@/data/config'
import './MoreLink.scss'

/**
 * <MoreLink /> — lien « En savoir plus » placé en bas d'une section de l'accueil,
 * vers la page détaillée correspondante.
 * Il ne s'affiche pas lorsque la section est réutilisée sur sa propre page.
 *
 * @param {string} route  Clé de CONFIG.routes (ex : 'programme')
 * @param {string} label  Libellé (par défaut : t.pages.more)
 * @param {'left'|'center'} align
 */
export default function MoreLink({ route, label, align = 'left', className = '' }) {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const to = CONFIG.routes[route]
  if (!to || pathname === to) return null

  return (
    <p className={`more-link more-link--${align} ${className}`.trim()}>
      <Link to={to}>
        <span>{label || t.pages.more}</span>
        <Icon name="arrow-right" size={18} />
      </Link>
    </p>
  )
}
