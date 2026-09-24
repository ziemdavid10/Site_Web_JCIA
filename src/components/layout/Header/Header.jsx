import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Button, Icon, LangSwitch, SectionLink, ThemeToggle } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { rich } from '@/i18n/rich'
import { CONFIG } from '@/data/config'
import useScrollPosition from '@/hooks/useScrollPosition'
import useScrollSpy from '@/hooks/useScrollSpy'
import logoColor from '@/assets/images/brand/logo-jcia-sm.webp'
import logoWhite from '@/assets/images/brand/logo-jcia-white-sm.webp'
import './Header.scss'

/**
 * <Header /> — en-tête fixe, commun à toutes les pages.
 *  • Transparent au-dessus des bandeaux sombres, puis « verre dépoli » au défilement
 *    (clair ou sombre selon le thème ; le logo s'adapte automatiquement).
 *  • Bandeau d'annonce (appel à candidatures CAIA) replié au défilement.
 *  • Chaque entrée du menu mène à sa page détaillée (/programme, /awards…).
 *    Lien actif : la page courante, ou — sur l'accueil — la section lue (scroll spy).
 *  • Sélecteurs de langue et de thème.
 *  • Menu plein écran sur mobile / tablette (Échap pour fermer, défilement verrouillé).
 */
export default function Header() {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const scrollY = useScrollPosition()
  const { routes } = CONFIG
  const activeSection = useScrollSpy(pathname === '/' ? t.nav.map((l) => l.section) : [])

  /** L'entrée est-elle active ? (page courante ou section lue sur l'accueil) */
  const isActive = (link) =>
    pathname === '/' ? activeSection === link.section : pathname.startsWith(routes[link.route])
  const [menuOpen, setMenuOpen] = useState(false)
  const scrolled = scrollY > 40

  // Ferme le menu lors d'un changement de page (ajustement d'état pendant le rendu)
  const [prevPath, setPrevPath] = useState(pathname)
  if (prevPath !== pathname) {
    setPrevPath(pathname)
    setMenuOpen(false)
  }

  // Verrouille le défilement de la page quand le menu est ouvert ; Échap pour fermer
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className={`header ${scrolled ? 'header--scrolled' : ''} ${menuOpen ? 'header--menu-open' : ''}`}>
      {/* Bandeau d'annonce */}
      <div className="header__announce">
        <p>
          <span className="header__announce-dot" aria-hidden="true" />
          <span>
            {rich(t.header.announce)}{' '}
            <Link to={routes.awards}>{t.header.announceLink}</Link>
          </span>
        </p>
      </div>

      <div className="header__bar container">
        <SectionLink id="top" className="header__logo" aria-label={t.a11y.home} onClick={closeMenu}>
          {/* Deux logos superposés : fondu enchaîné selon l'état de l'en-tête et le thème */}
          <img src={logoWhite} alt="" className="header__logo-img header__logo-img--white" width="150" height="62" />
          <img src={logoColor} alt="" className="header__logo-img header__logo-img--color" width="150" height="62" />
        </SectionLink>

        <nav className="header__nav" aria-label={t.a11y.mainNav}>
          <ul>
            {t.nav.map((link) => (
              <li key={link.route}>
                <Link
                  to={routes[link.route]}
                  className={isActive(link) ? 'is-active' : ''}
                  aria-current={isActive(link) ? (pathname === '/' ? 'true' : 'page') : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="header__actions">
          <LangSwitch className="header__lang" />
          <ThemeToggle className="header__theme" />
          <Button as={Link} to={routes.tickets} size="sm" icon="ticket" className="header__cta">
            {t.header.cta}
          </Button>
          <button
            type="button"
            className="header__burger"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? t.a11y.closeMenu : t.a11y.openMenu}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} size={26} />
          </button>
        </div>
      </div>

      {/* Menu mobile / tablette */}
      <div id="mobile-menu" className="mobile-menu" hidden={!menuOpen}>
        <nav aria-label={t.a11y.mobileNav}>
          <ul>
            {t.nav.map((link, i) => (
              <li key={link.route} style={{ '--i': i }}>
                <Link to={routes[link.route]} onClick={closeMenu} className={isActive(link) ? 'is-active' : ''}>
                  <span className="mobile-menu__num">{String(i + 1).padStart(2, '0')}</span>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mobile-menu__footer">
          <div className="mobile-menu__switchers">
            <LangSwitch />
            <ThemeToggle />
          </div>
          <Button as={Link} to={routes.tickets} size="lg" icon="arrow-right" onClick={closeMenu}>
            {t.header.mobileCta}
          </Button>
          <p>
            {t.event.dateLabel} · {t.event.venue.name}, {t.event.venue.city}
          </p>
        </div>
      </div>
    </header>
  )
}
