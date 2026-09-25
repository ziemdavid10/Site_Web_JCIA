import './Marquee.scss'

/**
 * <Marquee /> — défilement horizontal infini (logos, médias…).
 * Le contenu est dupliqué pour une boucle sans à-coup ; la copie est masquée
 * aux lecteurs d'écran. Pause au survol, désactivé si « animations réduites ».
 *
 * @param {Array}    items       Libellés (chaînes) ou objets { id, … }
 * @param {Function} renderItem  Rendu personnalisé d'un élément (ex. logo + nom)
 * @param {number}   duration  Durée d'un cycle complet en secondes
 * @param {boolean}  reverse   Sens inverse
 */
export default function Marquee({ items, renderItem, duration = 40, reverse = false, className = '' }) {
  const renderList = (hidden) => (
    <ul className="marquee__list" aria-hidden={hidden || undefined}>
      {items.map((item, i) => (
        <li key={item.id ?? item} className="marquee__item">
          {renderItem ? renderItem(item, i) : item}
        </li>
      ))}
    </ul>
  )

  return (
    <div className={`marquee ${reverse ? 'marquee--reverse' : ''} ${className}`} style={{ '--duration': `${duration}s` }}>
      <div className="marquee__track">
        {renderList(false)}
        {renderList(true)}
      </div>
    </div>
  )
}
