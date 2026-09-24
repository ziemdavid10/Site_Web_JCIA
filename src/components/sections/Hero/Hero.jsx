import { Link } from 'react-router'
import { Button, Countdown, Frise, Icon, NeuralCanvas, PatternBg, ThemeImg } from '@/components/ui'
import { useI18n } from '@/i18n/context'
import { rich } from '@/i18n/rich'
import { CONFIG } from '@/data/config'
import mapCircuit from '@/assets/images/brand/map-large-dark.webp'
import mapCircuitLight from '@/assets/images/brand/map-large.webp'
import './Hero.scss'

/**
 * <Hero /> — première impression.
 *
 * Composition :
 *  • fond bleu nuit + réseau de neurones animé (l'IA) ;
 *  • à droite, la carte du Cameroun « en circuits » tirée du logo, entourée
 *    d'orbites et du soleil orange (le point du « i » de JCIA) ;
 *  • en bas, une frise de losanges inspirée des tissus camerounais.
 */
export default function Hero() {
  const { t } = useI18n()
  const h = t.hero
  const e = t.event

  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      {/* --- Couches décoratives ------------------------------------------- */}
      <div className="hero__glow hero__glow--orange" aria-hidden="true" />
      <div className="hero__glow hero__glow--teal" aria-hidden="true" />
      <PatternBg variant="circuit" color="#2db8bd" opacity={0.07} fade="radial" />
      <NeuralCanvas />
      {/* Carte en filigrane sur mobile / tablette (le grand visuel y est masqué) */}
      <ThemeImg className="hero__map-bg" light={mapCircuitLight} dark={mapCircuit} aria-hidden="true" />

      <div className="hero__inner container">
        {/* --- Texte --------------------------------------------------------- */}
        <div className="hero__content">
          <p className="hero__badge">
            <span className="hero__badge-tag">{e.edition}</span>
            <span>
              {h.badgeLead} <strong>{h.badgeStrong}</strong>
            </span>
          </p>

          <h1 className="hero__title" id="hero-title">
            <span className="hero__title-small">{h.kicker}</span>
            {h.titleStart} <span className="hero__title-accent">{h.titleAccent}</span> {h.titleEnd}
          </h1>

          <p className="hero__theme">{rich(h.theme)}</p>

          <ul className="hero__meta">
            <li>
              <Icon name="calendar" size={20} />
              <span>
                <strong>{e.dateLabel}</strong>
                <small>{e.days}</small>
              </span>
            </li>
            <li>
              <Icon name="pin" size={20} />
              <span>
                <strong>
                  {e.venue.name}, {e.venue.city}
                </strong>
                <small>{e.venue.country}</small>
              </span>
            </li>
          </ul>

          <div className="hero__ctas">
            <Button as={Link} to={CONFIG.routes.tickets} size="lg" icon="arrow-right">
              {h.ctaRegister}
            </Button>
            <Button as={Link} to={CONFIG.routes.awards} size="lg" variant="ghost" iconLeft="trophy">
              {h.ctaAwards}
            </Button>
          </div>

          <Countdown target={CONFIG.startDate} label={h.countdown} />
        </div>

        {/* --- Visuel (grands écrans) ------------------------------------------ */}
        <div className="hero__visual" aria-hidden="true">
          <div className="hero__orbit hero__orbit--1">
            <span className="hero__planet hero__planet--teal" />
          </div>
          <div className="hero__orbit hero__orbit--2">
            <span className="hero__planet hero__planet--rust" />
            <span className="hero__planet hero__planet--purple" />
          </div>
          <div className="hero__orbit hero__orbit--3" />
          <div className="hero__sun" />
          <ThemeImg className="hero__map" light={mapCircuitLight} dark={mapCircuit} width="336" height="563" />

          {/* Cartes flottantes : chiffres clés */}
          {h.chips.map((chip, i) => (
            <div key={chip.label} className={`hero__chip hero__chip--${i + 1}`}>
              <strong>{chip.value}</strong>
              <span>{chip.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Indicateur de défilement */}
      <a href="#apropos" className="hero__scroll" aria-label={h.scroll}>
        <span />
      </a>

      <Frise className="hero__frise" height={26} />
    </section>
  )
}
