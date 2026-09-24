import Icon from '../Icon/Icon'
import './Button.scss'

/**
 * <Button /> — bouton / lien d'action.
 *  • `as`   : composant à rendre (ex : SectionLink, Link du routeur) ;
 *  • `href` : rend un <a> ;
 *  • sinon  : rend un <button>.
 *
 * @param {'primary'|'secondary'|'outline'|'ghost'|'light'} variant  Style visuel
 * @param {'sm'|'md'|'lg'} size
 * @param {string} icon       Icône affichée après le libellé
 * @param {string} iconLeft   Icône affichée avant le libellé
 * @param {boolean} external  Ouvre dans un nouvel onglet (liens externes, PDF)
 */
export default function Button({
  children,
  as: Component,
  href,
  variant = 'primary',
  size = 'md',
  icon,
  iconLeft,
  external = false,
  className = '',
  ...rest
}) {
  const classes = `btn btn--${variant} btn--${size} ${className}`.trim()
  const iconSize = size === 'lg' ? 20 : 18
  const content = (
    <>
      {iconLeft && <Icon name={iconLeft} size={iconSize} />}
      <span>{children}</span>
      {icon && <Icon name={icon} size={iconSize} className="btn__icon" />}
    </>
  )

  if (Component) {
    return (
      <Component className={classes} {...rest}>
        {content}
      </Component>
    )
  }

  if (href) {
    const externalProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {}
    return (
      <a href={href} className={classes} {...externalProps} {...rest}>
        {content}
      </a>
    )
  }

  return (
    <button type="button" className={classes} {...rest}>
      {content}
    </button>
  )
}
