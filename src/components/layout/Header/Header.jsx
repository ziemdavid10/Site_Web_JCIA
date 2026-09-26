import { useEffect, useRef, useState } from 'react'
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
  const { routes, links } = CONFIG
  const activeSection = useScrollSpy(pathname === '/' ? t.nav.map((l) => l.section) : [])

  /**
   * L'entrée est-elle active ? (page courante ou section lue sur l'accueil)
   * « Accueil » pointe sur « / » : hors de l'accueil, aucune entrée ne doit
   * s'activer par simple préfixe (toutes les adresses commencent par « / »).
   */
  const isActive = (link) => {
    const target = routes[link.route]
    if (pathname === '/') return activeSection === link.section
    return target !== '/' && pathname.startsWith(target)
  }
  const [menuOpen, setMenuOpen] = useState(false)
  const scrolled = scrollY > 40
  const barRef = useRef(null)

  // Ferme le menu lors d'un changement de page (ajustement d'état pendant le rendu)
  const [prevPath, setPrevPath] = useState(pathname)
  if (prevPath !== pathname) {
    setPrevPath(pathname)
    setMenuOpen(false)
  }

  // Verrouille le défilement de la page quand le menu est ouvert ; Échap pour fermer.
  // La classe `menu-open` sur <html> permet d'effacer les barres flottantes des
  // pages (barre de commande, bandeau cookies) qui masqueraient le bas du menu.
  useEffect(() => {
    const root = document.documentElement
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    root.classList.toggle('menu-open', menuOpen)
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      root.classList.remove('menu-open')
    }
  }, [menuOpen])

  // Hauteur réelle occupée par l'en-tête : le panneau démarre juste en dessous,
  // que le bandeau d'annonce soit déplié, en train de se replier ou masqué.
  useEffect(() => {
    const bar = barRef.current
    if (!bar) return
    const sync = () => {
      const bottom = Math.max(0, Math.round(bar.getBoundingClientRect().bottom))
      document.documentElement.style.setProperty('--menu-top', `${bottom}px`)
    }
    sync()
    const raf = requestAnimationFrame(sync)
    const timer = setTimeout(sync, 400) // après le repli animé du bandeau
    window.addEventListener('resize', sync)
    window.addEventListener('orientationchange', sync)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
      window.removeEventListener('resize', sync)
      window.removeEventListener('orientationchange', sync)
    }
  }, [menuOpen, scrolled])

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className={`header ${scrolled ? 'header--scrolled' : ''} ${menuOpen ? 'header--menu-open' : ''}`}>
      {/* Bandeau d'annonce */}
      <div className="header__announce">
        <p>
          <span className="header__announce-dot" aria-hidden="true" />
          <span>
            {rich(t.header.announce)}{' '}
            {/* Le bandeau mène désormais à la billetterie, pas aux candidatures */}
            <Link to={routes.tickets}>{t.header.announceLink}</Link>
          </span>
        </p>
      </div>

      <div className="header__bar container" ref={barRef}>
        <SectionLink id="top" className="header__logo" aria-label={t.a11y.home} onClick={closeMenu}>
          {/* Deux logos superposés : fondu enchaîné selon l'état de l'en-tête et le thème */}
          <img src={logoWhite} alt="" className="header__logo-img header__logo-img--white" width="150" height="62" />
          <img src={logoColor} alt="" className="header__logo-img header__logo-img--color" width="150" height="62" />
        </SectionLink>

        <nav className="header__nav" aria-label={t.a11y.mainNav}>
          <ul>
            {t.nav.map((link) => {
              const active = isActive(link)
              const props = {
                className: active ? 'is-active' : '',
                'aria-current': active ? (pathname === '/' ? 'true' : 'page') : undefined,
              }
              return (
                <li key={link.route}>
                  {/* « Accueil » : ancre vers le haut de la page d'accueil */}
                  {link.route === 'home' ? (
                    <SectionLink id={link.section} {...props}>
                      {link.label}
                    </SectionLink>
                  ) : (
                    <Link to={routes[link.route]} {...props}>
                      {link.label}
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="header__actions">
          <LangSwitch className="header__lang" />
          <ThemeToggle className="header__theme" />
          {/* Soutien à l'événement : cagnotte GoFundMe (nouvel onglet) */}
          <Button
            href={links.donate}
            external
            size="sm"
            variant="outline"
            iconLeft="heart"
            className="header__donate"
            aria-label={t.header.donateLong}
          >
            {t.header.donate}
          </Button>
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
            {t.nav.map((link, i) => {
              const inner = (
                <>
                  <span className="mobile-menu__num">{String(i + 1).padStart(2, '0')}</span>
                  {link.label}
                </>
              )
              const cls = isActive(link) ? 'is-active' : ''
              return (
                <li key={link.route} style={{ '--i': i }}>
                  {link.route === 'home' ? (
                    <SectionLink id={link.section} onClick={closeMenu} className={cls}>
                      {inner}
                    </SectionLink>
                  ) : (
                    <Link to={routes[link.route]} onClick={closeMenu} className={cls}>
                      {inner}
                    </Link>
                  )}
                </li>
              )
            })}
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
          <Button href={links.donate} external size="lg" variant="outline" iconLeft="heart" className="mobile-menu__donate">
            {t.header.donateLong}
          </Button>
          <p>
            {t.event.dateLabel} · {t.event.venue.name}, {t.event.venue.city}
          </p>
        </div>
      </div>
    </header>
  )
}
